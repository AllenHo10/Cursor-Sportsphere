export type MatchStatus =
  | "draft"
  | "challenge_pending"
  | "scheduled"
  | "confirmed"
  | "cancelled"
  | "completed";

export interface Match {
  id: string;
  home_team_id: string;
  away_team_id: string;
  scheduled_at: string;
  venue: string | null;
  format: string | null;
  notes: string | null;
  status: MatchStatus;
  proposed_by_team_id: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MatchTeamSummary {
  id: string;
  name: string;
  logo_url: string | null;
  location: string | null;
  sport: string;
}

export interface MatchWithTeams extends Match {
  home_team: MatchTeamSummary | null;
  away_team: MatchTeamSummary | null;
}

export interface LeadershipTeam {
  id: string;
  name: string;
  sport: string;
  location: string | null;
}
