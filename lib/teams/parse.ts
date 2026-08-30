import { SKILL_LEVELS, TEAM_TYPES } from "@/lib/constants/team";
import type { SkillLevel } from "@/lib/types/profile";
import type { Team, TeamType, TeamWithCaptain } from "@/lib/types/team";

export function parseTeam(row: Record<string, unknown>): Team {
  return {
    id: row.id as string,
    name: row.name as string,
    sport: row.sport as string,
    logo_url: (row.logo_url as string | null) ?? null,
    location: (row.location as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    team_type: row.team_type as TeamType,
    skill_level: (row.skill_level as SkillLevel | null) ?? null,
    captain_id: row.captain_id as string,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export function parseTeamWithCaptain(row: Record<string, unknown>): TeamWithCaptain {
  const captain = row.captain as Record<string, unknown> | null;

  return {
    ...parseTeam(row),
    captain: captain
      ? {
          name: captain.name as string,
          profile_image_url: (captain.profile_image_url as string | null) ?? null,
        }
      : null,
  };
}

export function getTeamTypeLabel(value: TeamType) {
  return TEAM_TYPES.find((type) => type.value === value)?.label ?? value;
}

export function getSkillLevelLabel(value: SkillLevel | null) {
  if (!value) return "Not specified";
  return SKILL_LEVELS.find((level) => level.value === value)?.label ?? value;
}

export function formatSportLabel(sport: string) {
  return sport.charAt(0).toUpperCase() + sport.slice(1);
}
