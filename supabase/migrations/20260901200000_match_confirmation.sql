-- Confirm matches when both captains confirm, or when each team reaches
-- the minimum Yes-vote participation for the match format.

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS home_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS away_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS home_confirmed_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS away_confirmed_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.match_required_yes_votes(p_format text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_format
    WHEN 'indoor_6v6' THEN 6
    WHEN 'mixed_6v6' THEN 6
    WHEN 'indoor_4v4' THEN 4
    WHEN 'beach_4v4' THEN 4
    WHEN 'beach_2v2' THEN 2
    ELSE 4
  END;
$$;

CREATE OR REPLACE FUNCTION public.team_yes_vote_count(
  p_match_id uuid,
  p_team_id uuid
)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM public.votes v
  JOIN public.team_members tm
    ON tm.user_id = v.user_id
   AND tm.team_id = p_team_id
   AND tm.status = 'active'
  WHERE v.match_id = p_match_id
    AND v.response = 'yes';
$$;

CREATE OR REPLACE FUNCTION public.match_meets_min_participation(p_match_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.team_yes_vote_count(m.id, m.home_team_id) >= public.match_required_yes_votes(m.format)
    AND public.team_yes_vote_count(m.id, m.away_team_id) >= public.match_required_yes_votes(m.format)
  FROM public.matches m
  WHERE m.id = p_match_id;
$$;

CREATE OR REPLACE FUNCTION public.get_match_participation(p_match_id uuid)
RETURNS TABLE (
  team_id uuid,
  yes_count integer,
  required_yes integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM (
    SELECT
      m.home_team_id AS team_id,
      public.team_yes_vote_count(m.id, m.home_team_id) AS yes_count,
      public.match_required_yes_votes(m.format) AS required_yes
    FROM public.matches m
    WHERE m.id = p_match_id
      AND (
        public.is_active_member(m.home_team_id, auth.uid())
        OR public.is_active_member(m.away_team_id, auth.uid())
      )
    UNION ALL
    SELECT
      m.away_team_id,
      public.team_yes_vote_count(m.id, m.away_team_id),
      public.match_required_yes_votes(m.format)
    FROM public.matches m
    WHERE m.id = p_match_id
      AND (
        public.is_active_member(m.home_team_id, auth.uid())
        OR public.is_active_member(m.away_team_id, auth.uid())
      )
  ) participation;
$$;

CREATE OR REPLACE FUNCTION public.enforce_match_challenge_flow()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  receiving_team_id uuid;
BEGIN
  IF NEW.proposed_by_team_id IS DISTINCT FROM NEW.home_team_id
     AND NEW.proposed_by_team_id IS DISTINCT FROM NEW.away_team_id THEN
    RAISE EXCEPTION 'proposed_by_team_id must be the home or away team';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status NOT IN ('draft', 'challenge_pending') THEN
      RAISE EXCEPTION 'New matches must be draft or challenge_pending';
    END IF;

    IF NEW.status = 'challenge_pending' THEN
      NEW.proposed_by_team_id := COALESCE(NEW.proposed_by_team_id, NEW.home_team_id);

      IF NEW.proposed_by_team_id <> NEW.home_team_id THEN
        RAISE EXCEPTION 'Challenges must be proposed by the home team';
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  IF NEW.home_team_id <> OLD.home_team_id OR NEW.away_team_id <> OLD.away_team_id THEN
    RAISE EXCEPTION 'Match teams cannot be changed';
  END IF;

  IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'Match creator cannot be changed';
  END IF;

  IF OLD.status IN ('cancelled', 'completed') THEN
    RAISE EXCEPTION 'Cannot modify a % match', OLD.status;
  END IF;

  IF OLD.status = 'challenge_pending' THEN
    receiving_team_id := CASE
      WHEN OLD.proposed_by_team_id = OLD.home_team_id THEN OLD.away_team_id
      ELSE OLD.home_team_id
    END;

    IF NEW.status = 'scheduled' THEN
      IF NOT public.can_manage_challenges(receiving_team_id, auth.uid()) THEN
        RAISE EXCEPTION 'Only the receiving team can accept this challenge';
      END IF;
      RETURN NEW;
    END IF;

    IF NEW.status = 'cancelled' THEN
      IF NOT (
        public.can_manage_challenges(OLD.home_team_id, auth.uid())
        OR public.can_manage_challenges(OLD.away_team_id, auth.uid())
      ) THEN
        RAISE EXCEPTION 'Only a captain or co-captain can decline or withdraw a challenge';
      END IF;
      RETURN NEW;
    END IF;

    IF NEW.status = 'challenge_pending' THEN
      IF NEW.proposed_by_team_id IS DISTINCT FROM OLD.proposed_by_team_id THEN
        IF NEW.proposed_by_team_id <> receiving_team_id THEN
          RAISE EXCEPTION 'Only the receiving team can request changes';
        END IF;
        IF NOT public.can_manage_challenges(NEW.proposed_by_team_id, auth.uid()) THEN
          RAISE EXCEPTION 'Only a captain or co-captain can request changes';
        END IF;
      ELSE
        IF NOT public.can_manage_challenges(OLD.proposed_by_team_id, auth.uid()) THEN
          RAISE EXCEPTION 'Only the proposing team can update this proposal';
        END IF;
      END IF;
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Invalid challenge status transition from % to %', OLD.status, NEW.status;
  END IF;

  IF OLD.status = 'scheduled' THEN
    IF NEW.home_confirmed_at IS DISTINCT FROM OLD.home_confirmed_at
       OR NEW.home_confirmed_by IS DISTINCT FROM OLD.home_confirmed_by THEN
      IF OLD.home_confirmed_at IS NOT NULL THEN
        RAISE EXCEPTION 'Home team has already confirmed this match';
      END IF;
      IF NOT public.can_manage_challenges(OLD.home_team_id, auth.uid()) THEN
        RAISE EXCEPTION 'Only the home team captain or co-captain can confirm for the home team';
      END IF;
    END IF;

    IF NEW.away_confirmed_at IS DISTINCT FROM OLD.away_confirmed_at
       OR NEW.away_confirmed_by IS DISTINCT FROM OLD.away_confirmed_by THEN
      IF OLD.away_confirmed_at IS NOT NULL THEN
        RAISE EXCEPTION 'Away team has already confirmed this match';
      END IF;
      IF NOT public.can_manage_challenges(OLD.away_team_id, auth.uid()) THEN
        RAISE EXCEPTION 'Only the away team captain or co-captain can confirm for the away team';
      END IF;
    END IF;

    IF NEW.home_confirmed_at IS NOT NULL AND NEW.away_confirmed_at IS NOT NULL THEN
      NEW.status := 'confirmed';
    END IF;

    IF NEW.status = 'confirmed' THEN
      IF NOT (
        (NEW.home_confirmed_at IS NOT NULL AND NEW.away_confirmed_at IS NOT NULL)
        OR public.match_meets_min_participation(NEW.id)
      ) THEN
        RAISE EXCEPTION 'Match cannot be confirmed until both captains confirm or each team reaches the minimum Yes votes';
      END IF;
    ELSIF NEW.status = 'cancelled' THEN
      IF NOT (
        public.can_manage_challenges(OLD.home_team_id, auth.uid())
        OR public.can_manage_challenges(OLD.away_team_id, auth.uid())
      ) THEN
        RAISE EXCEPTION 'Only a captain or co-captain can cancel a scheduled match';
      END IF;
    ELSIF NEW.status <> 'scheduled' THEN
      RAISE EXCEPTION 'Invalid status transition from scheduled to %', NEW.status;
    END IF;

    RETURN NEW;
  END IF;

  IF OLD.status = 'confirmed' AND NEW.status IS DISTINCT FROM 'confirmed' THEN
    RAISE EXCEPTION 'Cannot change status of a confirmed match';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.maybe_auto_confirm_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.matches
  SET status = 'confirmed'
  WHERE id = NEW.match_id
    AND status = 'scheduled'
    AND public.match_meets_min_participation(NEW.match_id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS votes_maybe_auto_confirm_match ON public.votes;
CREATE TRIGGER votes_maybe_auto_confirm_match
  AFTER INSERT OR UPDATE OF response ON public.votes
  FOR EACH ROW
  EXECUTE FUNCTION public.maybe_auto_confirm_match();

CREATE OR REPLACE FUNCTION public.notify_match_team_members(
  p_match_id uuid,
  p_home_team_id uuid,
  p_away_team_id uuid,
  p_event_type public.notification_event_type,
  p_message text
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
      'A match has been confirmed. Details are now locked in for both teams.'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS matches_notify_confirmed ON public.matches;
CREATE TRIGGER matches_notify_confirmed
  AFTER UPDATE OF status ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_match_confirmed();

CREATE POLICY votes_select_confirmed_match ON public.votes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.matches m
      WHERE m.id = match_id
        AND m.status IN ('confirmed', 'completed')
        AND (
          public.is_active_member(m.home_team_id, (SELECT auth.uid()))
          OR public.is_active_member(m.away_team_id, (SELECT auth.uid()))
        )
    )
  );

CREATE POLICY profiles_select_confirmed_match_voters ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.votes v
      JOIN public.matches m ON m.id = v.match_id
      WHERE v.user_id = profiles.id
        AND m.status IN ('confirmed', 'completed')
        AND (
          public.is_active_member(m.home_team_id, (SELECT auth.uid()))
          OR public.is_active_member(m.away_team_id, (SELECT auth.uid()))
        )
    )
  );

CREATE POLICY team_members_select_confirmed_match ON public.team_members
  FOR SELECT
  TO authenticated
  USING (
    status = 'active'
    AND EXISTS (
      SELECT 1
      FROM public.matches m
      WHERE (m.home_team_id = team_members.team_id OR m.away_team_id = team_members.team_id)
        AND m.status IN ('confirmed', 'completed')
        AND (
          public.is_active_member(m.home_team_id, (SELECT auth.uid()))
          OR public.is_active_member(m.away_team_id, (SELECT auth.uid()))
        )
    )
  );

CREATE POLICY matches_update_auto_confirm ON public.matches
  FOR UPDATE
  TO authenticated
  USING (
    status = 'scheduled'
    AND (
      public.is_active_member(home_team_id, (SELECT auth.uid()))
      OR public.is_active_member(away_team_id, (SELECT auth.uid()))
    )
  )
  WITH CHECK (
    status = 'confirmed'
    AND public.match_meets_min_participation(id)
  );

GRANT EXECUTE ON FUNCTION public.match_required_yes_votes(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.team_yes_vote_count(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_meets_min_participation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_match_participation(uuid) TO authenticated;
