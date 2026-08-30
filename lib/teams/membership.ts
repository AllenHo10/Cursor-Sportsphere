import type { SupabaseClient } from "@supabase/supabase-js";

import type { TeamMemberRole, TeamMemberStatus } from "@/lib/types/team";

type MembershipClient = Pick<SupabaseClient, "from">;

interface ExistingMembership {
  id: string;
  status: TeamMemberStatus;
  role: TeamMemberRole;
}

async function getExistingMembership(
  supabase: MembershipClient,
  teamId: string,
  userId: string
): Promise<ExistingMembership | null> {
  const { data, error } = await supabase
    .from("team_members")
    .select("id, status, role")
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data as ExistingMembership | null;
}

export async function requestToJoinTeam(
  supabase: MembershipClient,
  teamId: string,
  userId: string
) {
  const existing = await getExistingMembership(supabase, teamId, userId);

  if (existing) {
    if (existing.status === "pending") {
      return { error: null };
    }

    if (existing.status === "active" || existing.status === "invited") {
      return { error: new Error("You already have a membership with this team.") };
    }

    const { error } = await supabase
      .from("team_members")
      .update({ status: "pending", role: "player" })
      .eq("id", existing.id);

    return { error };
  }

  const { error } = await supabase.from("team_members").insert({
    team_id: teamId,
    user_id: userId,
    role: "player",
    status: "pending",
  });

  return { error };
}

export async function invitePlayerToTeam(
  supabase: MembershipClient,
  teamId: string,
  userId: string
) {
  const existing = await getExistingMembership(supabase, teamId, userId);

  if (existing) {
    if (existing.status === "invited") {
      return { error: null };
    }

    if (existing.status === "active") {
      return { error: new Error("This player is already on the team.") };
    }

    if (existing.status === "pending") {
      return { error: new Error("This player already requested to join.") };
    }

    const { error } = await supabase
      .from("team_members")
      .update({ status: "invited", role: "player" })
      .eq("id", existing.id);

    return { error };
  }

  const { error } = await supabase.from("team_members").insert({
    team_id: teamId,
    user_id: userId,
    role: "player",
    status: "invited",
  });

  return { error };
}

export async function approveJoinRequest(
  supabase: MembershipClient,
  memberId: string
) {
  const { error } = await supabase
    .from("team_members")
    .update({ status: "active" })
    .eq("id", memberId)
    .eq("status", "pending");

  return { error };
}

export async function rejectJoinRequest(
  supabase: MembershipClient,
  memberId: string
) {
  const { error } = await supabase
    .from("team_members")
    .update({ status: "removed" })
    .eq("id", memberId)
    .eq("status", "pending");

  return { error };
}

export async function acceptTeamInvite(
  supabase: MembershipClient,
  memberId: string
) {
  const { error } = await supabase
    .from("team_members")
    .update({ status: "active" })
    .eq("id", memberId)
    .eq("status", "invited");

  return { error };
}

export async function declineTeamInvite(
  supabase: MembershipClient,
  memberId: string
) {
  const { error } = await supabase
    .from("team_members")
    .update({ status: "removed" })
    .eq("id", memberId)
    .eq("status", "invited");

  return { error };
}

export async function cancelJoinRequest(
  supabase: MembershipClient,
  memberId: string
) {
  const { error } = await supabase
    .from("team_members")
    .update({ status: "removed" })
    .eq("id", memberId)
    .eq("status", "pending");

  return { error };
}

export async function assignCoCaptain(
  supabase: MembershipClient,
  memberId: string
) {
  const { error } = await supabase
    .from("team_members")
    .update({ role: "co_captain" })
    .eq("id", memberId)
    .eq("role", "player")
    .eq("status", "active");

  return { error };
}

export async function removeCoCaptain(
  supabase: MembershipClient,
  memberId: string
) {
  const { error } = await supabase
    .from("team_members")
    .update({ role: "player" })
    .eq("id", memberId)
    .eq("role", "co_captain")
    .eq("status", "active");

  return { error };
}
