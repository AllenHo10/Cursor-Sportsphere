-- Fix matches challenge RLS: pass auth.uid() into helper checks, and
-- allow INSERT ... RETURNING by selecting on the new row's team columns
-- instead of looking the match back up by id.

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
  SELECT COALESCE(p_user_id, auth.uid()) IS NOT NULL
    AND (
      public.is_captain(p_team_id, COALESCE(p_user_id, auth.uid()))
      OR public.is_co_captain(p_team_id, COALESCE(p_user_id, auth.uid()))
    );
$$;

GRANT EXECUTE ON FUNCTION public.can_manage_challenges(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS matches_insert_challenge ON public.matches;
CREATE POLICY matches_insert_challenge ON public.matches
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND status = 'challenge_pending'
    AND proposed_by_team_id = home_team_id
    AND public.can_manage_challenges(home_team_id, (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS matches_select_participant ON public.matches;
CREATE POLICY matches_select_participant ON public.matches
  FOR SELECT
  TO authenticated
  USING (
    public.is_active_member(home_team_id, (SELECT auth.uid()))
    OR public.is_active_member(away_team_id, (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS matches_update_challenge_managers ON public.matches;
CREATE POLICY matches_update_challenge_managers ON public.matches
  FOR UPDATE
  TO authenticated
  USING (
    public.can_manage_challenges(home_team_id, (SELECT auth.uid()))
    OR public.can_manage_challenges(away_team_id, (SELECT auth.uid()))
    OR public.can_update_match_details(home_team_id, (SELECT auth.uid()))
  )
  WITH CHECK (
    public.can_manage_challenges(home_team_id, (SELECT auth.uid()))
    OR public.can_manage_challenges(away_team_id, (SELECT auth.uid()))
    OR public.can_update_match_details(home_team_id, (SELECT auth.uid()))
  );
