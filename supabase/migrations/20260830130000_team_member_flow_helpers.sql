-- SportSphere: helpers for join-request and invite flows

-- Captains can view profiles of users with pending or invited membership on their teams
CREATE POLICY profiles_select_by_captain_for_pending ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.team_members tm
      WHERE tm.user_id = profiles.id
        AND tm.status IN ('pending', 'invited')
        AND public.can_manage_team(tm.team_id)
    )
  );

-- Search profiles by name when inviting players to a team
CREATE OR REPLACE FUNCTION public.search_profiles_for_invite(p_query text)
RETURNS TABLE (
  id uuid,
  name text,
  profile_image_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.name, p.profile_image_url
  FROM public.profiles p
  WHERE length(trim(p_query)) >= 2
    AND p.name ILIKE '%' || trim(p_query) || '%'
    AND p.id <> auth.uid()
  ORDER BY p.name
  LIMIT 10;
$$;

GRANT EXECUTE ON FUNCTION public.search_profiles_for_invite(text) TO authenticated;
