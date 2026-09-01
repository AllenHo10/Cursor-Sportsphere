import { MATCH_FORMATS, MATCH_STATUSES, type MatchFormat } from "@/lib/constants/match";
import type {
  Match,
  MatchStatus,
  MatchTeamSummary,
  MatchWithTeams,
} from "@/lib/types/match";
import type { TeamMemberRole } from "@/lib/types/team";

export function isLeadershipRole(role: TeamMemberRole | null | undefined) {
  return role === "captain" || role === "co_captain";
}

export function parseMatch(row: Record<string, unknown>): Match {
  return {
    id: row.id as string,
    home_team_id: row.home_team_id as string,
    away_team_id: row.away_team_id as string,
    scheduled_at: row.scheduled_at as string,
    venue: (row.venue as string | null) ?? null,
    format: (row.format as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    status: row.status as MatchStatus,
    proposed_by_team_id: row.proposed_by_team_id as string,
    created_by: (row.created_by as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || Array.isArray(value) || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function parseMatchTeamSummary(value: unknown): MatchTeamSummary | null {
  const row = asRecord(value);
  if (!row) return null;

  return {
    id: row.id as string,
    name: row.name as string,
    logo_url: (row.logo_url as string | null) ?? null,
    location: (row.location as string | null) ?? null,
    sport: row.sport as string,
  };
}

export function parseMatchWithTeams(row: Record<string, unknown>): MatchWithTeams {
  return {
    ...parseMatch(row),
    home_team: parseMatchTeamSummary(row.home_team),
    away_team: parseMatchTeamSummary(row.away_team),
  };
}

export function getMatchStatusLabel(status: MatchStatus) {
  return MATCH_STATUSES.find((item) => item.value === status)?.label ?? status;
}

export function getMatchFormatLabel(value: string | null) {
  if (!value) return "Not specified";
  return MATCH_FORMATS.find((format) => format.value === value)?.label ?? value;
}

export function asMatchFormat(value: string | null): MatchFormat {
  if (MATCH_FORMATS.some((format) => format.value === value)) {
    return value as MatchFormat;
  }
  return "indoor_6v6";
}

export function getReceivingTeamId(
  match: Pick<Match, "home_team_id" | "away_team_id" | "proposed_by_team_id">
) {
  return match.proposed_by_team_id === match.home_team_id
    ? match.away_team_id
    : match.home_team_id;
}

export function isChangeRequest(match: Pick<Match, "home_team_id" | "proposed_by_team_id" | "created_at" | "updated_at">) {
  if (match.proposed_by_team_id !== match.home_team_id) return true;
  return new Date(match.updated_at).getTime() - new Date(match.created_at).getTime() > 2000;
}

export function formatMatchDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function splitScheduledAt(iso: string) {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");

  return {
    date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  };
}

export function combineDateAndTime(date: string, time: string) {
  return new Date(`${date}T${time}`).toISOString();
}

export function localDateInputValue(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export const MATCH_TEAM_SELECT = `
  *,
  home_team:teams!matches_home_team_id_fkey (
    id,
    name,
    logo_url,
    location,
    sport
  ),
  away_team:teams!matches_away_team_id_fkey (
    id,
    name,
    logo_url,
    location,
    sport
  )
`;
