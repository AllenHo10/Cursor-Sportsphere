-- SportSphere: in-app notification triggers
-- Invitations, join requests, challenges, challenge responses,
-- voting requests, match reminders, and schedule changes.

CREATE OR REPLACE FUNCTION public.team_display_name(p_team_id uuid)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(name, 'a team')
  FROM public.teams
  WHERE id = p_team_id;
$$;

CREATE OR REPLACE FUNCTION public.profile_display_name(p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(name, 'A player')
  FROM public.profiles
  WHERE id = p_user_id;
$$;

CREATE OR REPLACE FUNCTION public.match_display_label(p_home_team_id uuid, p_away_team_id uuid)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT public.team_display_name(p_home_team_id)
    || ' vs '
    || public.team_display_name(p_away_team_id);
$$;

-- Membership: invitations and join requests
CREATE OR REPLACE FUNCTION public.notify_team_member_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  team_name text;
  player_name text;
BEGIN
  team_name := public.team_display_name(NEW.team_id);
  player_name := public.profile_display_name(NEW.user_id);

  IF NEW.status = 'invited'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'invited')
  THEN
    PERFORM public.create_notification(
      NEW.user_id,
      'team_invite',
      'You have been invited to join ' || team_name,
      NEW.team_id
    );
  END IF;

  IF NEW.status = 'pending'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'pending')
  THEN
    PERFORM public.notify_team_challenge_managers(
      NEW.team_id,
      'join_request',
      player_name || ' requested to join ' || team_name,
      NEW.team_id,
      NEW.user_id
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS team_members_notify_invite ON public.team_members;
DROP TRIGGER IF EXISTS team_members_notify_events ON public.team_members;
CREATE TRIGGER team_members_notify_events
  AFTER INSERT OR UPDATE OF status ON public.team_members
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_team_member_events();

-- Challenges: include opponent name
CREATE OR REPLACE FUNCTION public.notify_challenge_received()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'challenge_pending' THEN
    PERFORM public.notify_team_challenge_managers(
      NEW.away_team_id,
      'challenge_received',
      'Your team received a match challenge from '
        || public.team_display_name(NEW.home_team_id),
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_challenge_response()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  receiving_team_id uuid;
  match_label text;
BEGIN
  match_label := public.match_display_label(NEW.home_team_id, NEW.away_team_id);

  IF OLD.status = 'challenge_pending' AND NEW.status = 'scheduled' THEN
    PERFORM public.notify_team_challenge_managers(
      OLD.proposed_by_team_id,
      'challenge_accepted',
      'Your match challenge was accepted: ' || match_label,
      NEW.id
    );
  ELSIF OLD.status = 'challenge_pending' AND NEW.status = 'cancelled' THEN
    PERFORM public.notify_team_challenge_managers(
      OLD.home_team_id,
      'challenge_declined',
      'A match challenge was declined or withdrawn: ' || match_label,
      NEW.id
    );
    PERFORM public.notify_team_challenge_managers(
      OLD.away_team_id,
      'challenge_declined',
      'A match challenge was declined or withdrawn: ' || match_label,
      NEW.id
    );
  ELSIF OLD.status = 'challenge_pending'
    AND NEW.status = 'challenge_pending'
    AND (
      NEW.scheduled_at IS DISTINCT FROM OLD.scheduled_at
      OR NEW.venue IS DISTINCT FROM OLD.venue
      OR NEW.format IS DISTINCT FROM OLD.format
      OR NEW.notes IS DISTINCT FROM OLD.notes
      OR NEW.proposed_by_team_id IS DISTINCT FROM OLD.proposed_by_team_id
    )
  THEN
    receiving_team_id := CASE
      WHEN NEW.proposed_by_team_id = NEW.home_team_id THEN NEW.away_team_id
      ELSE NEW.home_team_id
    END;

    PERFORM public.notify_team_challenge_managers(
      receiving_team_id,
      'match_updated',
      'Match details were updated. Please review the proposal for ' || match_label,
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Voting requests, reminders, and post-acceptance schedule changes
DROP FUNCTION IF EXISTS public.notify_match_team_members(uuid, uuid, uuid, public.notification_event_type, text);

CREATE OR REPLACE FUNCTION public.notify_match_team_members(
  p_match_id uuid,
  p_home_team_id uuid,
  p_away_team_id uuid,
  p_event_type public.notification_event_type,
  p_message text,
  p_exclude_user_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT DISTINCT user_id
    FROM public.team_members
    WHERE status = 'active'
      AND team_id IN (p_home_team_id, p_away_team_id)
      AND (p_exclude_user_id IS NULL OR user_id <> p_exclude_user_id)
  LOOP
    PERFORM public.create_notification(
      rec.user_id,
      p_event_type,
      p_message,
      p_match_id
    );
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_match_member_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  match_label text;
BEGIN
  match_label := public.match_display_label(NEW.home_team_id, NEW.away_team_id);

  -- Voting request when a challenge is accepted
  IF OLD.status = 'challenge_pending' AND NEW.status = 'scheduled' THEN
    PERFORM public.notify_match_team_members(
      NEW.id,
      NEW.home_team_id,
      NEW.away_team_id,
      'vote_reminder',
      'Please vote on the upcoming match: ' || match_label,
      NULL
    );
  END IF;

  -- Schedule / venue / format changes after the match is accepted
  IF OLD.status IN ('scheduled', 'confirmed')
     AND NEW.status IN ('scheduled', 'confirmed')
     AND (
       NEW.scheduled_at IS DISTINCT FROM OLD.scheduled_at
       OR NEW.venue IS DISTINCT FROM OLD.venue
       OR NEW.format IS DISTINCT FROM OLD.format
     )
  THEN
    PERFORM public.notify_match_team_members(
      NEW.id,
      NEW.home_team_id,
      NEW.away_team_id,
      'match_updated',
      'Match details changed for ' || match_label,
      auth.uid()
    );
  END IF;

  IF OLD.status IN ('scheduled', 'confirmed') AND NEW.status = 'cancelled' THEN
    PERFORM public.notify_match_team_members(
      NEW.id,
      NEW.home_team_id,
      NEW.away_team_id,
      'match_cancelled',
      'The match ' || match_label || ' was cancelled',
      auth.uid()
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS matches_notify_member_events ON public.matches;
CREATE TRIGGER matches_notify_member_events
  AFTER UPDATE OF status, scheduled_at, venue, format ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_match_member_events();

CREATE OR REPLACE FUNCTION public.notify_match_confirmed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'scheduled' AND NEW.status = 'confirmed' THEN
    PERFORM public.notify_match_team_members(
      NEW.id,
      NEW.home_team_id,
      NEW.away_team_id,
      'match_scheduled',
      'Reminder: '
        || public.match_display_label(NEW.home_team_id, NEW.away_team_id)
        || ' is confirmed. Details are locked in for both teams.',
      NULL
    );
  END IF;

  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.team_display_name(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.profile_display_name(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_display_label(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_team_member_events() TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_match_member_events() TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_match_team_members(uuid, uuid, uuid, public.notification_event_type, text, uuid)
  TO authenticated, service_role;
