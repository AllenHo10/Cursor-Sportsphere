-- SportSphere: email-based team invites for people who may not have an account yet.
-- Captains and co-captains may create invites; membership is attached on signup
-- only when the new user's email matches the invited address.

CREATE TYPE public.team_email_invite_status AS ENUM ('pending', 'accepted', 'cancelled');

CREATE TABLE public.team_email_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams (id) ON DELETE CASCADE,
  email text NOT NULL CHECK (email <> '' AND email = lower(email)),
  invited_by uuid NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  status public.team_email_invite_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX team_email_invites_team_id_idx ON public.team_email_invites (team_id);
CREATE INDEX team_email_invites_email_idx ON public.team_email_invites (email);

CREATE UNIQUE INDEX team_email_invites_pending_team_email_idx
  ON public.team_email_invites (team_id, email)
  WHERE status = 'pending';

CREATE OR REPLACE FUNCTION public.can_invite_to_team(
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

REVOKE ALL ON FUNCTION public.can_invite_to_team(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_invite_to_team(uuid, uuid) TO authenticated;

ALTER TABLE public.team_email_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY team_email_invites_select ON public.team_email_invites
  FOR SELECT TO authenticated
  USING (public.can_invite_to_team(team_id));

CREATE POLICY team_email_invites_insert ON public.team_email_invites
  FOR INSERT TO authenticated
  WITH CHECK (
    public.can_invite_to_team(team_id)
    AND invited_by = auth.uid()
    AND status = 'pending'
  );

CREATE POLICY team_email_invites_update ON public.team_email_invites
  FOR UPDATE TO authenticated
  USING (public.can_invite_to_team(team_id))
  WITH CHECK (public.can_invite_to_team(team_id));

GRANT SELECT, INSERT, UPDATE ON TABLE public.team_email_invites TO authenticated;
GRANT ALL ON TABLE public.team_email_invites TO service_role;

-- Co-captains can invite existing users (status invited) in addition to captains.
CREATE POLICY team_members_insert_invite ON public.team_members
  FOR INSERT TO authenticated
  WITH CHECK (
    public.can_invite_to_team(team_id)
    AND status = 'invited'
    AND role = 'player'
  );

-- Co-captains need to read profiles of people they invited.
DROP POLICY IF EXISTS profiles_select_by_captain_for_pending ON public.profiles;
CREATE POLICY profiles_select_by_captain_for_pending ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.team_members tm
      WHERE tm.user_id = profiles.id
        AND tm.status IN ('pending', 'invited')
        AND public.can_invite_to_team(tm.team_id)
    )
  );

CREATE OR REPLACE FUNCTION public.apply_pending_email_invites_for_user(
  p_user_id uuid,
  p_email text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(trim(COALESCE(p_email, '')));
  r public.team_email_invites%ROWTYPE;
BEGIN
  IF p_user_id IS NULL OR v_email = '' THEN
    RETURN;
  END IF;

  FOR r IN
    SELECT *
    FROM public.team_email_invites
    WHERE status = 'pending'
      AND email = v_email
  LOOP
    INSERT INTO public.team_members (team_id, user_id, role, status)
    VALUES (r.team_id, p_user_id, 'player', 'invited')
    ON CONFLICT (team_id, user_id) DO UPDATE
    SET
      status = CASE
        WHEN public.team_members.status = 'removed' THEN 'invited'
        ELSE public.team_members.status
      END,
      role = CASE
        WHEN public.team_members.status = 'removed' THEN 'player'
        ELSE public.team_members.role
      END;

    UPDATE public.team_email_invites
    SET status = 'accepted'
    WHERE id = r.id;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_pending_email_invites_for_user(uuid, text) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.apply_pending_email_invites()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  SELECT email INTO v_email
  FROM auth.users
  WHERE id = auth.uid();

  PERFORM public.apply_pending_email_invites_for_user(auth.uid(), v_email);
END;
$$;

REVOKE ALL ON FUNCTION public.apply_pending_email_invites() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_pending_email_invites() TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email, 'Player')
  );

  -- Attach membership when the account is usable. Auth invites create an
  -- unconfirmed user immediately; those wait until the person follows the
  -- signup link so ignored invites do not force a team_members row.
  IF NEW.email_confirmed_at IS NOT NULL THEN
    BEGIN
      PERFORM public.apply_pending_email_invites_for_user(NEW.id, NEW.email);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to apply team email invites for %: %', NEW.id, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.invite_player_by_email(
  p_team_id uuid,
  p_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_user_id uuid;
  v_existing public.team_members%ROWTYPE;
  v_invite_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.can_invite_to_team(p_team_id, auth.uid()) THEN
    RAISE EXCEPTION 'Only captains and co-captains can invite players';
  END IF;

  v_email := lower(trim(COALESCE(p_email, '')));

  IF v_email = '' OR v_email !~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$' THEN
    RAISE EXCEPTION 'Enter a valid email address';
  END IF;

  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(email) = v_email
  LIMIT 1;

  IF v_user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot invite yourself';
  END IF;

  IF v_user_id IS NOT NULL THEN
    SELECT * INTO v_existing
    FROM public.team_members
    WHERE team_id = p_team_id
      AND user_id = v_user_id;

    IF FOUND THEN
      IF v_existing.status = 'invited' THEN
        RETURN jsonb_build_object(
          'kind', 'existing',
          'user_id', v_user_id,
          'already', true
        );
      END IF;

      IF v_existing.status = 'active' THEN
        RAISE EXCEPTION 'This player is already on the team.';
      END IF;

      IF v_existing.status = 'pending' THEN
        RAISE EXCEPTION 'This player already requested to join.';
      END IF;

      UPDATE public.team_members
      SET status = 'invited',
          role = 'player'
      WHERE id = v_existing.id;

      RETURN jsonb_build_object(
        'kind', 'existing',
        'user_id', v_user_id,
        'already', false
      );
    END IF;

    INSERT INTO public.team_members (team_id, user_id, role, status)
    VALUES (p_team_id, v_user_id, 'player', 'invited');

    RETURN jsonb_build_object(
      'kind', 'existing',
      'user_id', v_user_id,
      'already', false
    );
  END IF;

  SELECT id INTO v_invite_id
  FROM public.team_email_invites
  WHERE team_id = p_team_id
    AND email = v_email
    AND status = 'pending';

  IF v_invite_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'kind', 'email',
      'invite_id', v_invite_id,
      'already', true
    );
  END IF;

  INSERT INTO public.team_email_invites (team_id, email, invited_by, status)
  VALUES (p_team_id, v_email, auth.uid(), 'pending')
  RETURNING id INTO v_invite_id;

  RETURN jsonb_build_object(
    'kind', 'email',
    'invite_id', v_invite_id,
    'already', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.invite_player_by_email(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.invite_player_by_email(uuid, text) TO authenticated;

-- Public preview for the signup page. Returns the team name only — never the
-- invited email — so a leaked invite id cannot be used to force membership.
CREATE OR REPLACE FUNCTION public.get_email_invite_info(p_invite_id uuid)
RETURNS TABLE (team_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.name
  FROM public.team_email_invites i
  JOIN public.teams t ON t.id = i.team_id
  WHERE i.id = p_invite_id
    AND i.status = 'pending';
$$;

REVOKE ALL ON FUNCTION public.get_email_invite_info(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_email_invite_info(uuid) TO anon, authenticated;
