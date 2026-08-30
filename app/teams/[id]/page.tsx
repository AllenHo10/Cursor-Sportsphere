import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Shield } from "lucide-react";

import { JoinTeamButton } from "@/components/teams/join-team-button";
import { MembershipActions } from "@/components/teams/membership-actions";
import { TeamRosterPanel } from "@/components/teams/team-roster-panel";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import {
  getSkillLevelLabel,
  getTeamMemberRoleLabel,
  getTeamTypeLabel,
  parseTeamMemberWithProfile,
  parseTeamWithCaptain,
} from "@/lib/teams/parse";
import type { TeamMemberStatus } from "@/lib/types/team";

interface TeamDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function TeamDetailPage({ params }: TeamDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirectTo=/teams/${id}`);
  }

  const [{ data, error }, { data: membershipData }, { data: rosterData }] =
    await Promise.all([
      supabase
        .from("teams")
        .select(
          `
            *,
            captain:profiles!teams_captain_id_fkey (
              name,
              profile_image_url
            )
          `
        )
        .eq("id", id)
        .single(),
      supabase
        .from("team_members")
        .select("id, role, status")
        .eq("team_id", id)
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
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
        .eq("status", "active")
        .order("joined_at", { ascending: true }),
    ]);

  if (error || !data) {
    notFound();
  }

  const team = parseTeamWithCaptain(data as Record<string, unknown>);
  const membership = membershipData as {
    id: string;
    role: string;
    status: TeamMemberStatus;
  } | null;
  const isCaptain = team.captain_id === user.id;
  const isActiveMember = membership?.status === "active";
  const activeMembers =
    rosterData?.map((row) =>
      parseTeamMemberWithProfile(row as Record<string, unknown>)
    ) ?? [];

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{team.name}</h1>
          <p className="text-sm capitalize text-muted-foreground">
            {team.sport} · {getTeamTypeLabel(team.team_type)}
          </p>
        </div>
        <form action="/logout" method="post">
          <Button type="submit" variant="outline">
            Log out
          </Button>
        </form>
      </header>

      <section className="rounded-lg border p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
            {team.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={team.logo_url}
                alt={`${team.name} logo`}
                className="h-full w-full object-cover"
              />
            ) : (
              <Shield className="h-10 w-10 text-muted-foreground" />
            )}
          </div>

          <dl className="grid flex-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Location</dt>
              <dd className="mt-1 text-sm">{team.location ?? "Not specified"}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Skill level</dt>
              <dd className="mt-1 text-sm">{getSkillLevelLabel(team.skill_level)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Captain</dt>
              <dd className="mt-1 text-sm">{team.captain?.name ?? "Unknown"}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Your role</dt>
              <dd className="mt-1 text-sm">
                {membership
                  ? getTeamMemberRoleLabel(
                      membership.role as "player" | "captain" | "co_captain"
                    )
                  : "Not a member"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-muted-foreground">Description</dt>
              <dd className="mt-1 whitespace-pre-wrap text-sm">
                {team.description ?? "No description provided."}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {!membership ? (
        <section className="rounded-lg border p-6">
          <h2 className="mb-2 text-lg font-medium">Join this team</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Send a join request to the team captain for approval.
          </p>
          <JoinTeamButton teamId={id} userId={user.id} />
        </section>
      ) : membership.status === "invited" || membership.status === "pending" ? (
        <section className="rounded-lg border p-6">
          <h2 className="mb-2 text-lg font-medium">
            {membership.status === "invited" ? "Team invite" : "Join request"}
          </h2>
          <MembershipActions memberId={membership.id} status={membership.status} />
        </section>
      ) : null}

      {isCaptain ? (
        <section className="rounded-lg border border-primary/20 bg-primary/5 p-6">
          <h2 className="mb-2 text-lg font-medium">Captain dashboard</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Review pending requests, invite players, and assign Co-Captain roles.
          </p>
          <Button asChild>
            <Link href={`/teams/${id}/manage`}>Manage team</Link>
          </Button>
        </section>
      ) : null}

      {isActiveMember ? (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Roster</h2>
          <TeamRosterPanel
            members={activeMembers}
            isCaptain={isCaptain}
            currentUserId={user.id}
          />
        </section>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link href="/teams">Back to teams</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard">Dashboard</Link>
        </Button>
      </div>
    </main>
  );
}
