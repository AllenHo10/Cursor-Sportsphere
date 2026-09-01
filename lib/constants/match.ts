import type { MatchStatus, VoteResponse } from "@/lib/types/match";

export const MATCH_FORMATS = [
  { value: "indoor_6v6", label: "Indoor 6v6" },
  { value: "indoor_4v4", label: "Indoor 4v4" },
  { value: "beach_2v2", label: "Beach 2v2" },
  { value: "beach_4v4", label: "Beach 4v4" },
  { value: "mixed_6v6", label: "Mixed 6v6" },
  { value: "other", label: "Other" },
] as const;

export type MatchFormat = (typeof MATCH_FORMATS)[number]["value"];

export const MATCH_STATUSES: { value: MatchStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "challenge_pending", label: "Pending" },
  { value: "scheduled", label: "Scheduled" },
  { value: "confirmed", label: "Confirmed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "completed", label: "Completed" },
];

export const VOTE_RESPONSES: { value: VoteResponse; label: string }[] = [
  { value: "yes", label: "Yes" },
  { value: "maybe", label: "Maybe" },
  { value: "no", label: "No" },
];

export const MIN_YES_VOTES_BY_FORMAT: Record<string, number> = {
  indoor_6v6: 6,
  mixed_6v6: 6,
  indoor_4v4: 4,
  beach_4v4: 4,
  beach_2v2: 2,
  other: 4,
};

export const DEFAULT_MIN_YES_VOTES = 4;

export function getRequiredYesVotes(format: string | null) {
  if (!format) return DEFAULT_MIN_YES_VOTES;
  return MIN_YES_VOTES_BY_FORMAT[format] ?? DEFAULT_MIN_YES_VOTES;
}
