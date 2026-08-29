-- SportSphere: teams and team_members

CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sport text NOT NULL DEFAULT 'volleyball' CHECK (sport <> ''),
  logo_url text,
  location text,
  description text,
  team_type public.team_type NOT NULL DEFAULT 'recreational',
  skill_level public.skill_level,
  captain_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX teams_sport_location_idx ON public.teams (sport, location);
CREATE INDEX teams_captain_id_idx ON public.teams (captain_id);
CREATE INDEX teams_created_at_idx ON public.teams (created_at DESC);

CREATE TRIGGER teams_set_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  role public.team_member_role NOT NULL DEFAULT 'player',
  status public.team_member_status NOT NULL DEFAULT 'pending',
  delegated_permissions text[] NOT NULL DEFAULT '{}',
  joined_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, user_id)
);

CREATE INDEX team_members_team_id_idx ON public.team_members (team_id);
CREATE INDEX team_members_user_id_idx ON public.team_members (user_id);

CREATE UNIQUE INDEX team_members_one_active_captain_idx
  ON public.team_members (team_id)
  WHERE role = 'captain' AND status = 'active';

CREATE TRIGGER team_members_set_updated_at
  BEFORE UPDATE ON public.team_members
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.on_team_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.team_members (team_id, user_id, role, status, joined_at)
  VALUES (NEW.id, NEW.captain_id, 'captain', 'active', now());
  RETURN NEW;
END;
$$;

CREATE TRIGGER teams_after_insert_add_captain
  AFTER INSERT ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.on_team_created();

CREATE OR REPLACE FUNCTION public.sync_team_captain()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'active' AND NEW.role = 'captain' THEN
    UPDATE public.teams
    SET captain_id = NEW.user_id
    WHERE id = NEW.team_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER team_members_sync_captain
  AFTER INSERT OR UPDATE OF role, status ON public.team_members
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_team_captain();

CREATE OR REPLACE FUNCTION public.set_joined_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'active' AND OLD.status IS DISTINCT FROM 'active' THEN
    NEW.joined_at = COALESCE(NEW.joined_at, now());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER team_members_set_joined_at
  BEFORE UPDATE ON public.team_members
  FOR EACH ROW
  EXECUTE FUNCTION public.set_joined_at();

CREATE OR REPLACE FUNCTION public.prevent_captain_self_removal()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  current_captain uuid;
BEGIN
  IF NEW.status = 'removed' AND NEW.role = 'captain' THEN
    SELECT captain_id INTO current_captain
    FROM public.teams
    WHERE id = NEW.team_id;

    IF current_captain = NEW.user_id THEN
      RAISE EXCEPTION 'Captain must transfer captaincy before leaving the team';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER team_members_prevent_captain_removal
  BEFORE UPDATE ON public.team_members
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_captain_self_removal();

CREATE OR REPLACE FUNCTION public.enforce_delegated_permissions_role()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.role <> 'co_captain' THEN
    NEW.delegated_permissions = '{}';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER team_members_enforce_delegated_permissions
  BEFORE INSERT OR UPDATE ON public.team_members
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_delegated_permissions_role();
