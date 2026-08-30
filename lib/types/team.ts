import type { SkillLevel } from "@/lib/types/profile";

export type TeamType = "recreational" | "competitive" | "league" | "pickup";

export type TeamMemberRole = "player" | "captain" | "co_captain";

export type TeamMemberStatus = "pending" | "invited" | "active" | "removed";

export interface Team {
  id: string;
  name: string;
  sport: string;
  logo_url: string | null;
  location: string | null;
  description: string | null;
  team_type: TeamType;
  skill_level: SkillLevel | null;
  captain_id: string;
  created_at: string;
  updated_at: string;
}

export interface TeamWithCaptain extends Team {
  captain: {
    name: string;
    profile_image_url: string | null;
  } | null;
}
