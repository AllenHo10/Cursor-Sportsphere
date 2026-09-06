import type { SupabaseClient } from "@supabase/supabase-js";

import { DEFAULT_TEAM_SPORT } from "@/lib/constants/team";
import type { TeamDetailsFormValues } from "@/lib/teams/schema";
import type { SkillLevel } from "@/lib/types/profile";
import type { TeamType } from "@/lib/types/team";

type TeamClient = Pick<SupabaseClient, "from">;

function toTeamPayload(values: TeamDetailsFormValues) {
  return {
    name: values.name.trim(),
    logo_url: values.logo_url,
    location: values.location.trim() || null,
    description: values.description.trim() || null,
    team_type: values.team_type as TeamType,
    skill_level: values.skill_level as SkillLevel | null,
  };
}

export async function createTeam(
  supabase: TeamClient,
  userId: string,
  values: TeamDetailsFormValues
) {
  const { data, error } = await supabase
    .from("teams")
    .insert({
      ...toTeamPayload(values),
      sport: DEFAULT_TEAM_SPORT,
      captain_id: userId,
    })
    .select("id")
    .single();

  return { data, error };
}

export async function updateTeamDetails(
  supabase: TeamClient,
  teamId: string,
  values: TeamDetailsFormValues
) {
  const { error } = await supabase
    .from("teams")
    .update(toTeamPayload(values))
    .eq("id", teamId);

  return { error };
}
