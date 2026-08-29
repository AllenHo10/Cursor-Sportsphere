-- SportSphere: RLS helper functions

CREATE OR REPLACE FUNCTION public.auth_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_active_member(
  p_team_id uuid,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members
    WHERE team_id = p_team_id
      AND user_id = p_user_id
      AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.member_role(
  p_team_id uuid,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS public.team_member_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.team_members
  WHERE team_id = p_team_id
    AND user_id = p_user_id
    AND status = 'active'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_captain(
  p_team_id uuid,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.teams t
    WHERE t.id = p_team_id
      AND t.captain_id = p_user_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.team_members tm
    WHERE tm.team_id = p_team_id
      AND tm.user_id = p_user_id
      AND tm.status = 'active'
      AND tm.role = 'captain'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_co_captain(
  p_team_id uuid,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members
    WHERE team_id = p_team_id
      AND user_id = p_user_id
      AND status = 'active'
      AND role = 'co_captain'
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_team(
  p_team_id uuid,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_captain(p_team_id, p_user_id);
$$;

CREATE OR REPLACE FUNCTION public.can_manage_attendance(
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

CREATE OR REPLACE FUNCTION public.has_delegated_permission(
  p_team_id uuid,
  p_permission text,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_captain(p_team_id, p_user_id)
    OR EXISTS (
      SELECT 1
      FROM public.team_members
      WHERE team_id = p_team_id
        AND user_id = p_user_id
        AND status = 'active'
        AND role = 'co_captain'
        AND p_permission = ANY(delegated_permissions)
    );
$$;

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
    OR public.has_delegated_permission(p_team_id, 'challenges', p_user_id);
$$;

CREATE OR REPLACE FUNCTION public.can_update_match_details(
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
    OR public.has_delegated_permission(p_team_id, 'match_details', p_user_id);
$$;

CREATE OR REPLACE FUNCTION public.is_match_team_member(
  p_match_id uuid,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.matches m
    WHERE m.id = p_match_id
      AND (
        public.is_active_member(m.home_team_id, p_user_id)
        OR public.is_active_member(m.away_team_id, p_user_id)
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.shares_team_with(
  p_viewer_id uuid,
  p_target_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members a
    JOIN public.team_members b ON a.team_id = b.team_id
    WHERE a.user_id = p_viewer_id
      AND b.user_id = p_target_id
      AND a.status = 'active'
      AND b.status = 'active'
  );
$$;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
