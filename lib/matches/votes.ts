import type { SupabaseClient } from "@supabase/supabase-js";

import { VOTE_RESPONSES } from "@/lib/constants/match";
import type { Vote, VoteResponse, VoteWithProfile } from "@/lib/types/match";

type VotesClient = Pick<SupabaseClient, "from">;

export function parseVote(row: Record<string, unknown>): Vote {
  return {
    id: row.id as string,
    match_id: row.match_id as string,
    user_id: row.user_id as string,
    response: row.response as VoteResponse,
    responded_at: row.responded_at as string,
  };
}

export function parseVoteWithProfile(row: Record<string, unknown>): VoteWithProfile {
  const profile = row.profile as Record<string, unknown> | null;

  return {
    ...parseVote(row),
    profile:
      profile && !Array.isArray(profile)
        ? {
            name: profile.name as string,
            profile_image_url: (profile.profile_image_url as string | null) ?? null,
          }
        : null,
  };
}

export function getVoteResponseLabel(value: VoteResponse) {
  return VOTE_RESPONSES.find((item) => item.value === value)?.label ?? value;
}

export function tallyVotes(votes: Pick<Vote, "response">[]) {
  return {
    yes: votes.filter((vote) => vote.response === "yes").length,
    maybe: votes.filter((vote) => vote.response === "maybe").length,
    no: votes.filter((vote) => vote.response === "no").length,
  };
}

export const VOTE_WITH_PROFILE_SELECT = `
  *,
  profile:profiles!votes_user_id_fkey (
    name,
    profile_image_url
  )
`;

export async function submitMatchVote(
  supabase: VotesClient,
  matchId: string,
  userId: string,
  response: VoteResponse
) {
  const { error } = await supabase.from("votes").upsert(
    {
      match_id: matchId,
      user_id: userId,
      response,
    },
    { onConflict: "match_id,user_id" }
  );

  return { error: error ? new Error(error.message) : null };
}
