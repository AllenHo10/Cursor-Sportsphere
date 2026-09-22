import Link from "next/link";
import { redirect } from "next/navigation";
import { Shield } from "lucide-react";

import { MembershipActions } from "@/components/teams/membership-actions";
import { EmptyState, PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { getTeamMemberRoleLabel, parseTeam } from "@/lib/teams/parse";
import type { Team, TeamMemberRole, TeamMemberStatus } from "@/lib/types/team";

export default async function TeamsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/teams");
  }

  const { data, error } = await supabase
    .from("team_members")
    .select(
      `
        id,
        role,
        status,
        teams (*)
      `
    )
    .eq("user_id", user.id)
    .neq("status", "removed")
    .order("created_at", { ascending: false });

  const memberships =
    data
      ?.map((membership) => {
        const teamRow = membership.teams as unknown;
        if (!teamRow || Array.isArray(teamRow)) return null;

        return {
          id: membership.id as string,
          role: membership.role as TeamMemberRole,
          status: membership.status as TeamMemberStatus,
          team: parseTeam(teamRow as Record<string, unknown>),
        };
      })
      .filter(
        (
          item
        ): item is {
          id: string;
          role: TeamMemberRole;
          status: TeamMemberStatus;
          team: Team;
        } => item !== null
      ) ?? [];

  const activeTeams = memberships.filter((item) => item.status === "active");
  const pendingInvites = memberships.filter((item) => item.status === "invited");
  const pendingRequests = memberships.filter((item) => item.status === "pending");

  return (
    <PageShell>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Teams</h1>
          <p className="text-sm text-muted-foreground">
            Create and manage your volleyball teams.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/teams/discover">Discover teams</Link>
          </Button>
          <Button asChild>
            <Link href="/teams/new">Create team</Link>
          </Button>
        </div>
      </header>

      {pendingInvites.length > 0 ? (
        <section className="rounded-lg border bg-card p-4 shadow-sm sm:p-6">
          <h2 className="mb-4 text-lg font-medium">Team invites</h2>
          <ul className="divide-y">
            {pendingInvites.map(({ id, team }) => (
              <li key={id} className="space-y-3 py-4 first:pt-0 last:pb-0">
                <div>
                  <Link
                    href={`/teams/${team.id}`}
                    className="font-medium hover:underline"
                  >
                    {team.name}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    You have been invited to join this team.
                  </p>
                </div>
                <MembershipActions memberId={id} status="invited" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {pendingRequests.length > 0 ? (
        <section className="rounded-lg border bg-card p-4 shadow-sm sm:p-6">
          <h2 className="mb-4 text-lg font-medium">Pending join requests</h2>
          <ul className="divide-y">
            {pendingRequests.map(({ id, team }) => (
              <li key={id} className="space-y-3 py-4 first:pt-0 last:pb-0">
                <div>
                  <Link
                    href={`/teams/${team.id}`}
                    className="font-medium hover:underline"
                  >
                    {team.name}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    Waiting for captain approval.
                  </p>
                </div>
                <MembershipActions memberId={id} status="pending" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-lg border bg-card p-4 shadow-sm sm:p-6">
        <h2 className="mb-4 text-lg font-medium">My teams</h2>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error.message}
          </p>
        ) : activeTeams.length === 0 ? (
          <EmptyState
            title="No teams yet"
            action={
              <div className="flex flex-wrap gap-2">
                <Button asChild>
                  <Link href="/teams/discover">Discover teams</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/teams/new">Create team</Link>
                </Button>
              </div>
            }
          >
            You are not on any teams yet. Discover teams or create your own.
          </EmptyState>
        ) : (
          <ul className="divide-y">
            {activeTeams.map(({ role, team }) => (
              <li key={team.id} className="flex flex-wrap items-center gap-4 py-4 first:pt-0 last:pb-0">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
                  {team.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={team.logo_url}
                      alt={`${team.name} logo`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Shield className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/teams/${team.id}`}
                    className="font-medium hover:underline"
                  >
                    {team.name}
                  </Link>
                  <p className="truncate text-sm text-muted-foreground">
                    {[team.location, getTeamMemberRoleLabel(role)]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {role === "captain" ? (
                    <>
                      <Button asChild variant="secondary" size="sm">
                        <Link href={`/teams/${team.id}/manage#edit-team`}>
                          Edit team
                        </Link>
                      </Button>
                      <Button asChild variant="secondary" size="sm">
                        <Link href={`/teams/${team.id}/manage`}>Manage</Link>
                      </Button>
                    </>
                  ) : null}
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/teams/${team.id}`}>View</Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Button asChild variant="outline" className="w-fit">
        <Link href="/dashboard">Back to dashboard</Link>
      </Button>
    </PageShell>
  );
}
