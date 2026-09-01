-- Allow eligible members to vote on accepted matches, and let captains
-- read vote totals plus individual responses.

CREATE OR REPLACE FUNCTION public.is_votable_match(p_match_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.matches
    WHERE id = p_match_id
      AND status IN ('scheduled', 'confirmed')
  );
$$;

CREATE OR REPLACE FUNCTION public.set_vote_responded_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.responded_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS votes_set_responded_at ON public.votes;
CREATE TRIGGER votes_set_responded_at
  BEFORE INSERT OR UPDATE OF response ON public.votes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_vote_responded_at();

DROP POLICY IF EXISTS votes_insert_own ON public.votes;
CREATE POLICY votes_insert_own ON public.votes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND public.is_match_team_member(match_id, (SELECT auth.uid()))
    AND public.is_votable_match(match_id)
  );

DROP POLICY IF EXISTS votes_update_own ON public.votes;
CREATE POLICY votes_update_own ON public.votes
  FOR UPDATE
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND public.is_match_team_member(match_id, (SELECT auth.uid()))
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND public.is_match_team_member(match_id, (SELECT auth.uid()))
    AND public.is_votable_match(match_id)
  );

DROP POLICY IF EXISTS votes_select_own ON public.votes;
CREATE POLICY votes_select_own ON public.votes
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS votes_select_attendance ON public.votes;
CREATE POLICY votes_select_attendance ON public.votes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.matches m
      WHERE m.id = match_id
        AND (
          public.can_manage_attendance(m.home_team_id, (SELECT auth.uid()))
          OR public.can_manage_attendance(m.away_team_id, (SELECT auth.uid()))
        )
    )
  );

CREATE POLICY profiles_select_match_voters ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.votes v
      JOIN public.matches m ON m.id = v.match_id
      WHERE v.user_id = profiles.id
        AND (
          public.can_manage_attendance(m.home_team_id, (SELECT auth.uid()))
          OR public.can_manage_attendance(m.away_team_id, (SELECT auth.uid()))
        )
    )
  );

CREATE POLICY team_members_select_match_attendance ON public.team_members
  FOR SELECT
  TO authenticated
  USING (
    status = 'active'
    AND EXISTS (
      SELECT 1
      FROM public.matches m
      WHERE (m.home_team_id = team_members.team_id OR m.away_team_id = team_members.team_id)
        AND m.status IN ('scheduled', 'confirmed', 'completed')
        AND (
          public.can_manage_attendance(m.home_team_id, (SELECT auth.uid()))
          OR public.can_manage_attendance(m.away_team_id, (SELECT auth.uid()))
        )
    )
  );

GRANT EXECUTE ON FUNCTION public.is_votable_match(uuid) TO authenticated;
