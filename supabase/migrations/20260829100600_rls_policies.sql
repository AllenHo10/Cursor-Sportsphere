-- SportSphere: row level security policies and notification triggers

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY profiles_select_teammates ON public.profiles
  FOR SELECT USING (public.shares_team_with(auth.uid(), id));

CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE USING (id = auth.uid());

-- teams
CREATE POLICY teams_select_member ON public.teams
  FOR SELECT USING (public.is_active_member(id));

CREATE POLICY teams_select_discover ON public.teams
  FOR SELECT TO authenticated USING (true);

CREATE POLICY teams_insert_authenticated ON public.teams
  FOR INSERT WITH CHECK (captain_id = auth.uid());

CREATE POLICY teams_update_captain ON public.teams
  FOR UPDATE USING (public.can_manage_team(id));

CREATE POLICY teams_delete_captain ON public.teams
  FOR DELETE USING (public.can_manage_team(id));

-- team_members
CREATE POLICY team_members_select ON public.team_members
  FOR SELECT USING (public.is_active_member(team_id) OR user_id = auth.uid());

CREATE POLICY team_members_insert_captain ON public.team_members
  FOR INSERT WITH CHECK (
    public.can_manage_team(team_id)
    AND status IN ('invited', 'pending')
  );

CREATE POLICY team_members_insert_self ON public.team_members
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND status = 'pending'
    AND role = 'player'
  );

CREATE POLICY team_members_update_captain ON public.team_members
  FOR UPDATE USING (public.can_manage_team(team_id));

CREATE POLICY team_members_update_self_accept ON public.team_members
  FOR UPDATE USING (user_id = auth.uid() AND status = 'invited');

CREATE POLICY team_members_update_self_leave ON public.team_members
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY team_members_delete_captain ON public.team_members
  FOR DELETE USING (public.can_manage_team(team_id));

-- matches
CREATE POLICY matches_select_participant ON public.matches
  FOR SELECT USING (public.is_match_team_member(id));

CREATE POLICY matches_insert_challenge ON public.matches
  FOR INSERT WITH CHECK (
    public.can_manage_challenges(home_team_id)
    AND created_by = auth.uid()
  );

CREATE POLICY matches_update_home ON public.matches
  FOR UPDATE USING (
    public.can_manage_team(home_team_id)
    OR public.can_update_match_details(home_team_id)
  );

CREATE POLICY matches_update_away_response ON public.matches
  FOR UPDATE USING (public.can_manage_challenges(away_team_id));

CREATE POLICY matches_delete_captain ON public.matches
  FOR DELETE USING (
    public.can_manage_team(home_team_id)
    AND status IN ('draft', 'challenge_pending')
  );

-- votes
CREATE POLICY votes_select_own ON public.votes
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY votes_select_attendance ON public.votes
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.matches m
      WHERE m.id = match_id
        AND (
          public.can_manage_attendance(m.home_team_id)
          OR public.can_manage_attendance(m.away_team_id)
        )
    )
  );

CREATE POLICY votes_insert_own ON public.votes
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND public.is_match_team_member(match_id)
  );

CREATE POLICY votes_update_own ON public.votes
  FOR UPDATE USING (
    user_id = auth.uid()
    AND public.is_match_team_member(match_id)
  );

CREATE POLICY votes_delete_own ON public.votes
  FOR DELETE USING (user_id = auth.uid());

-- notifications
CREATE POLICY notifications_select_own ON public.notifications
  FOR SELECT USING (recipient_id = auth.uid());

CREATE POLICY notifications_update_read ON public.notifications
  FOR UPDATE USING (recipient_id = auth.uid());

CREATE POLICY notifications_delete_own ON public.notifications
  FOR DELETE USING (recipient_id = auth.uid());

-- notification triggers
CREATE OR REPLACE FUNCTION public.notify_team_invite()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'invited' THEN
    PERFORM public.create_notification(
      NEW.user_id,
      'team_invite',
      'You have been invited to join a team',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER team_members_notify_invite
  AFTER INSERT ON public.team_members
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_team_invite();

CREATE OR REPLACE FUNCTION public.notify_challenge_received()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cap_id uuid;
BEGIN
  IF NEW.status = 'challenge_pending' THEN
    SELECT captain_id INTO cap_id
    FROM public.teams
    WHERE id = NEW.away_team_id;

    PERFORM public.create_notification(
      cap_id,
      'challenge_received',
      'Your team received a match challenge',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER matches_notify_challenge
  AFTER INSERT ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_challenge_received();
