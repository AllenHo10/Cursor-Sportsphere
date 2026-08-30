import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { TeamManageDashboard } from "@/components/teams/team-manage-dashboard";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { parseTeam, parseTeamMemberWithProfile } from "@/lib/teams/parse";

interface TeamManagePageProps {
  params: Promise<{ id: string }>;
}

export default async function TeamManagePage({ params }: TeamManagePageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirectTo=/teams/${id}/manage`);
  }

  const { data: teamData, error: teamError } = await supabase
    .from("teams")
    .select("*")
    .eq("id", id)
    .single();

  if (teamError || !teamData) {
    notFound();
  }

  const team = parseTeam(teamData as Record<string, unknown>);

  if (team.captain_id !== user.id) {
    redirect(`/teams/${id}`);
  }

  const { data: membersData, error: membersError } = await supabase
    .from("team_members")
    .select(
      `
        *,
        profile:profiles!team_members_user_id_fkey (
          name,
          profile_image_url
        )
      `
    )
    .eq("team_id", id)
    .in("status", ["pending", "invited", "active"])
    .order("created_at", { ascending: true });

  const members =
    membersData?.map((row) =>
      parseTeamMemberWithProfile(row as Record<string, unknown>)
    ) ?? [];

  const pendingRequests = members.filter((member) => member.status === "pending");
  const invitedMembers = members.filter((member) => member.status === "invited");
  const activeMembers = members.filter((member) => member.status === "active");

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Manage {team.name}</h1>
          <p className="text-sm text-muted-foreground">
            Review join requests, invite players, and manage roles.
          </p>
        </div>
        <form action="/logout" method="post">
          <Button type="submit" variant="outline">
            Log out
          </Button>
        </form>
      </header>

      {membersError ? (
        <p className="text-sm text-destructive" role="alert">
          {membersError.message}
        </p>
      ) : (
        <TeamManageDashboard
          teamId={id}
          currentUserId={user.id}
          pendingRequests={pendingRequests}
          invitedMembers={invitedMembers}
          activeMembers={activeMembers}
        />
      )}

      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link href={`/teams/${id}`}>Back to team</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/teams">My teams</Link>
        </Button>
      </div>
    </main>
  );
}
