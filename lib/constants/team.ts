import { SKILL_LEVELS } from "@/lib/constants/profile";
import type { TeamType } from "@/lib/types/team";

export { SKILL_LEVELS };

export const TEAM_TYPES: { value: TeamType; label: string }[] = [
  { value: "recreational", label: "Recreational" },
  { value: "competitive", label: "Competitive" },
  { value: "league", label: "League" },
  { value: "pickup", label: "Pickup" },
];

export const DEFAULT_TEAM_SPORT = "volleyball";

export const TEAM_SPORTS = [{ value: "volleyball", label: "Volleyball" }] as const;

export const TEAM_LOGO_BUCKET = "team-logos";

export const TEAM_LOGO_MAX_BYTES = 5 * 1024 * 1024;

export const TEAM_LOGO_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
