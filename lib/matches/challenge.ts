import type { SupabaseClient } from "@supabase/supabase-js";

import { combineDateAndTime } from "@/lib/matches/parse";
import type { LeadershipTeam } from "@/lib/types/match";

type MatchesClient = Pick<SupabaseClient, "from">;

export interface ProposeChallengeInput {
  homeTeamId: string;
  awayTeamId: string;
  date: string;
  time: string;
  venue: string;
  format: string;
  notes: string;
  createdBy: string;
}

export interface ChallengeDetailsInput {
  date: string;
  time: string;
  venue: string;
  format: string;
  notes: string;
}

function mapMatchError(error: { code?: string; message: string } | null) {
  if (!error) return null;

  if (error.code === "23505") {
    return new Error("A pending challenge already exists between these teams.");
  }

  return new Error(error.message);
}

export async function fetchLeadershipTeams(
  supabase: MatchesClient,
  userId: string
): Promise<LeadershipTeam[]> {
  const { data, error } = await supabase
    .from("team_members")
    .select(
      `
        role,
        teams (
          id,
          name,
          sport,
          location
        )
      `
    )
    .eq("user_id", userId)
    .eq("status", "active")
    .in("role", ["captain", "co_captain"]);

  if (error) throw error;

  return (
    data
      ?.map((row) => {
        const team = row.teams as unknown;
        if (!team || Array.isArray(team)) return null;
        const record = team as Record<string, unknown>;
        return {
          id: record.id as string,
          name: record.name as string,
          sport: record.sport as string,
          location: (record.location as string | null) ?? null,
        } satisfies LeadershipTeam;
      })
      .filter((team): team is LeadershipTeam => team !== null) ?? []
  );
}

export async function proposeChallenge(
  supabase: MatchesClient,
  input: ProposeChallengeInput
) {
  const { data, error } = await supabase
    .from("matches")
    .insert({
      home_team_id: input.homeTeamId,
      away_team_id: input.awayTeamId,
      scheduled_at: combineDateAndTime(input.date, input.time),
      venue: input.venue.trim(),
      format: input.format,
      notes: input.notes.trim() || null,
      status: "challenge_pending",
      proposed_by_team_id: input.homeTeamId,
      created_by: input.createdBy,
    })
    .select("id")
    .single();

  return { data, error: mapMatchError(error) };
}

export async function acceptChallenge(supabase: MatchesClient, matchId: string) {
  const { error } = await supabase
    .from("matches")
    .update({ status: "scheduled" })
    .eq("id", matchId)
    .eq("status", "challenge_pending");

  return { error: mapMatchError(error) };
}

export async function declineChallenge(supabase: MatchesClient, matchId: string) {
  const { error } = await supabase
    .from("matches")
    .update({ status: "cancelled" })
    .eq("id", matchId)
    .eq("status", "challenge_pending");

  return { error: mapMatchError(error) };
}

export async function requestChallengeChanges(
  supabase: MatchesClient,
  matchId: string,
  respondingTeamId: string,
  details: ChallengeDetailsInput
) {
  const { error } = await supabase
    .from("matches")
    .update({
      scheduled_at: combineDateAndTime(details.date, details.time),
      venue: details.venue.trim(),
      format: details.format,
      notes: details.notes.trim() || null,
      proposed_by_team_id: respondingTeamId,
    })
    .eq("id", matchId)
    .eq("status", "challenge_pending");

  return { error: mapMatchError(error) };
}

export async function updateOwnChallengeProposal(
  supabase: MatchesClient,
  matchId: string,
  details: ChallengeDetailsInput
) {
  const { error } = await supabase
    .from("matches")
    .update({
      scheduled_at: combineDateAndTime(details.date, details.time),
      venue: details.venue.trim(),
      format: details.format,
      notes: details.notes.trim() || null,
    })
    .eq("id", matchId)
    .eq("status", "challenge_pending");

  return { error: mapMatchError(error) };
}
