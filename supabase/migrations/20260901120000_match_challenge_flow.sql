-- SportSphere: challenge negotiation on matches
-- Captains and co-captains propose matches; the other team's leaders
-- can accept, decline, or request changes to the proposed details.

CREATE OR REPLACE FUNCTION public.can_manage_challenges(
  p_team_id uuid,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_captain(p_team_id, p_user_id)
    OR public.is_co_captain(p_team_id, p_user_id);
$$;

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS proposed_by_team_id uuid REFERENCES public.teams (id) ON DELETE RESTRICT;

UPDATE public.matches
SET proposed_by_team_id = home_team_id
WHERE proposed_by_team_id IS NULL;

ALTER TABLE public.matches
  ALTER COLUMN proposed_by_team_id SET NOT NULL;

ALTER TABLE public.matches
  DROP CONSTRAINT IF EXISTS matches_proposed_by_participant_chk;

ALTER TABLE public.matches
  ADD CONSTRAINT matches_proposed_by_participant_chk
  CHECK (
    proposed_by_team_id = home_team_id
    OR proposed_by_team_id = away_team_id
  );

CREATE INDEX IF NOT EXISTS matches_proposed_by_team_id_idx
  ON public.matches (proposed_by_team_id);

CREATE UNIQUE INDEX IF NOT EXISTS matches_one_pending_between_teams_idx
  ON public.matches (
    LEAST(home_team_id, away_team_id),
    GREATEST(home_team_id, away_team_id)
  )
  WHERE status = 'challenge_pending';

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
      IF NOT public.can_manage_challenges(receiving_team_id) THEN
        RAISE EXCEPTION 'Only the receiving team can accept this challenge';
      END IF;
      RETURN NEW;
    END IF;

    IF NEW.status = 'cancelled' THEN
      IF NOT (
        public.can_manage_challenges(OLD.home_team_id)
        OR public.can_manage_challenges(OLD.away_team_id)
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
        IF NOT public.can_manage_challenges(NEW.proposed_by_team_id) THEN
          RAISE EXCEPTION 'Only a captain or co-captain can request changes';
        END IF;
      ELSE
        IF NOT public.can_manage_challenges(OLD.proposed_by_team_id) THEN
          RAISE EXCEPTION 'Only the proposing team can update this proposal';
        END IF;
      END IF;
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Invalid challenge status transition from % to %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS matches_enforce_challenge_flow ON public.matches;
CREATE TRIGGER matches_enforce_challenge_flow
  BEFORE INSERT OR UPDATE ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_match_challenge_flow();

CREATE OR REPLACE FUNCTION public.notify_team_challenge_managers(
  p_team_id uuid,
  p_event_type public.notification_event_type,
  p_message text,
  p_related_record_id uuid,
  p_exclude_user_id uuid DEFAULT auth.uid()
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
    SELECT user_id
    FROM public.team_members
    WHERE team_id = p_team_id
      AND status = 'active'
      AND role IN ('captain', 'co_captain')
      AND (p_exclude_user_id IS NULL OR user_id <> p_exclude_user_id)
  LOOP
    PERFORM public.create_notification(
      rec.user_id,
      p_event_type,
      p_message,
      p_related_record_id
    );
  END LOOP;
END;
$$;

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
      'Your team received a match challenge',
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
BEGIN
  IF OLD.status = 'challenge_pending' AND NEW.status = 'scheduled' THEN
    PERFORM public.notify_team_challenge_managers(
      OLD.proposed_by_team_id,
      'challenge_accepted',
      'Your match challenge was accepted',
      NEW.id
    );
  ELSIF OLD.status = 'challenge_pending' AND NEW.status = 'cancelled' THEN
    PERFORM public.notify_team_challenge_managers(
      OLD.home_team_id,
      'challenge_declined',
      'A match challenge was declined or withdrawn',
      NEW.id
    );
    PERFORM public.notify_team_challenge_managers(
      OLD.away_team_id,
      'challenge_declined',
      'A match challenge was declined or withdrawn',
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
      'Match details were updated. Please review the proposal.',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS matches_notify_challenge_response ON public.matches;
CREATE TRIGGER matches_notify_challenge_response
  AFTER UPDATE OF status, scheduled_at, venue, format, notes, proposed_by_team_id
  ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_challenge_response();

DROP POLICY IF EXISTS matches_insert_challenge ON public.matches;
CREATE POLICY matches_insert_challenge ON public.matches
  FOR INSERT WITH CHECK (
    public.can_manage_challenges(home_team_id)
    AND created_by = auth.uid()
    AND status = 'challenge_pending'
    AND proposed_by_team_id = home_team_id
  );

DROP POLICY IF EXISTS matches_update_home ON public.matches;
DROP POLICY IF EXISTS matches_update_away_response ON public.matches;
DROP POLICY IF EXISTS matches_update_challenge_managers ON public.matches;
CREATE POLICY matches_update_challenge_managers ON public.matches
  FOR UPDATE USING (
    public.can_manage_challenges(home_team_id)
    OR public.can_manage_challenges(away_team_id)
    OR public.can_update_match_details(home_team_id)
  );

GRANT EXECUTE ON FUNCTION public.notify_team_challenge_managers(uuid, public.notification_event_type, text, uuid, uuid)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_manage_challenges(uuid, uuid) TO authenticated;
