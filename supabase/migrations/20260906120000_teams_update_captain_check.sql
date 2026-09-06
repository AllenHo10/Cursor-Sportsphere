-- Confirm team profile updates are captain-only.
-- Co-captains may manage attendance and delegated match duties, but
-- team identity (name, logo, location, description, type, skill) stays
-- with the captain via can_manage_team → is_captain.

DROP POLICY IF EXISTS teams_update_captain ON public.teams;
CREATE POLICY teams_update_captain ON public.teams
  FOR UPDATE
  TO authenticated
  USING (public.can_manage_team(id))
  WITH CHECK (public.can_manage_team(id));
