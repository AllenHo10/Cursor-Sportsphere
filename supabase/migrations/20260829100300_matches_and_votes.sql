-- SportSphere: matches and votes

CREATE TABLE public.matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  home_team_id uuid NOT NULL REFERENCES public.teams (id) ON DELETE RESTRICT,
  away_team_id uuid NOT NULL REFERENCES public.teams (id) ON DELETE RESTRICT,
  scheduled_at timestamptz NOT NULL,
  venue text,
  format text,
  notes text,
  status public.match_status NOT NULL DEFAULT 'draft',
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (home_team_id <> away_team_id)
);

CREATE INDEX matches_home_team_id_idx ON public.matches (home_team_id);
CREATE INDEX matches_away_team_id_idx ON public.matches (away_team_id);
CREATE INDEX matches_scheduled_at_idx ON public.matches (scheduled_at);
CREATE INDEX matches_status_idx ON public.matches (status);

CREATE TRIGGER matches_set_updated_at
  BEFORE UPDATE ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.validate_match_same_sport()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  home_sport text;
  away_sport text;
BEGIN
  SELECT sport INTO home_sport FROM public.teams WHERE id = NEW.home_team_id;
  SELECT sport INTO away_sport FROM public.teams WHERE id = NEW.away_team_id;

  IF home_sport IS DISTINCT FROM away_sport THEN
    RAISE EXCEPTION 'Home and away teams must share the same sport';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER matches_validate_same_sport
  BEFORE INSERT OR UPDATE OF home_team_id, away_team_id ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_match_same_sport();

CREATE TABLE public.votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  response public.vote_response NOT NULL,
  responded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (match_id, user_id)
);

CREATE INDEX votes_match_id_idx ON public.votes (match_id);
CREATE INDEX votes_user_id_idx ON public.votes (user_id);
