import type { MatchStatus } from "@/lib/types/match";

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
