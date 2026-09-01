import type { SupabaseClient } from "@supabase/supabase-js";

import { getRequiredYesVotes } from "@/lib/constants/match";
import type { Match } from "@/lib/types/match";

type MatchesClient = Pick<SupabaseClient, "from" | "rpc">;

export interface MatchParticipationRow {
  team_id: string;
  yes_count: number;
  required_yes: number;
}

export function bothCaptainsConfirmed(
  match: Pick<Match, "home_confirmed_at" | "away_confirmed_at">
) {
  return Boolean(match.home_confirmed_at && match.away_confirmed_at);
}

export function parseParticipation(
  rows: Record<string, unknown>[] | null
): MatchParticipationRow[] {
  return (
    rows?.map((row) => ({
      team_id: row.team_id as string,
      yes_count: Number(row.yes_count ?? 0),
      required_yes: Number(row.required_yes ?? 0),
    })) ?? []
  );
}

export function participationForTeam(
  rows: MatchParticipationRow[],
  teamId: string,
  format: string | null
) {
  const row = rows.find((item) => item.team_id === teamId);
  const required = row?.required_yes ?? getRequiredYesVotes(format);
  const yesCount = row?.yes_count ?? 0;
  return {
    yesCount,
    required,
    met: yesCount >= required,
  };
}

export async function fetchMatchParticipation(
  supabase: MatchesClient,
  matchId: string
) {
  const { data, error } = await supabase.rpc("get_match_participation", {
    p_match_id: matchId,
  });

  if (error) {
    return { data: [] as MatchParticipationRow[], error };
  }

  return {
    data: parseParticipation((data as Record<string, unknown>[] | null) ?? null),
    error: null,
  };
}

export async function confirmMatchForTeam(
  supabase: MatchesClient,
  matchId: string,
  userId: string,
  side: "home" | "away"
) {
  const payload =
    side === "home"
      ? {
          home_confirmed_at: new Date().toISOString(),
          home_confirmed_by: userId,
        }
      : {
          away_confirmed_at: new Date().toISOString(),
          away_confirmed_by: userId,
        };

  const { error } = await supabase
    .from("matches")
    .update(payload)
    .eq("id", matchId)
    .eq("status", "scheduled");

  return { error: error ? new Error(error.message) : null };
}
