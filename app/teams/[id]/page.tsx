import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Shield } from "lucide-react";

import { IncomingChallengeActions } from "@/components/matches/incoming-challenge-actions";
import { MatchSummaryCard } from "@/components/matches/match-summary-card";
import { ProposeChallengeForm } from "@/components/matches/propose-challenge-form";
import { JoinTeamButton } from "@/components/teams/join-team-button";
import { MembershipActions } from "@/components/teams/membership-actions";
import { TeamRosterPanel } from "@/components/teams/team-roster-panel";
import { EmptyState, PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { fetchLeadershipTeams } from "@/lib/matches/challenge";
import {
  getReceivingTeamId,
  MATCH_TEAM_SELECT,
  parseMatchWithTeams,
} from "@/lib/matches/parse";
import { createClient } from "@/lib/supabase/server";
import {
  getSkillLevelLabel,
  getTeamMemberRoleLabel,
  getTeamTypeLabel,
  parseTeamMemberWithProfile,
  parseTeamWithCaptain,
} from "@/lib/teams/parse";
import type { TeamMemberRole, TeamMemberStatus } from "@/lib/types/team";

interface TeamDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ intent?: string }>;
}

export default async function TeamDetailPage({
  params,
  searchParams,
}: TeamDetailPageProps) {
  const { id } = await params;
  const { intent } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirectTo=/teams/${id}`);
  }

  const [
    { data, error },
    { data: membershipData },
    { data: rosterData },
    leadershipTeams,
    { data: matchesData },
  ] = await Promise.all([
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
    fetchLeadershipTeams(supabase, user.id),
    supabase
      .from("matches")
      .select(MATCH_TEAM_SELECT)
      .or(`home_team_id.eq.${id},away_team_id.eq.${id}`)
      .in("status", ["challenge_pending", "scheduled", "confirmed"])
      .order("scheduled_at", { ascending: true }),
  ]);

  if (error || !data) {
    notFound();
  }

  const team = parseTeamWithCaptain(data as Record<string, unknown>);
  const membership = membershipData as {
    id: string;
    role: TeamMemberRole;
    status: TeamMemberStatus;
  } | null;
  const isCaptain = team.captain_id === user.id;
  const isCoCaptain =
    membership?.status === "active" && membership.role === "co_captain";
  const isActiveMember = membership?.status === "active";
  const isLeadershipOfThisTeam = leadershipTeams.some((item) => item.id === id);
  const activeMembers =
    rosterData?.map((row) =>
      parseTeamMemberWithProfile(row as Record<string, unknown>)
    ) ?? [];
  const matches =
    matchesData?.map((row) =>
      parseMatchWithTeams(row as Record<string, unknown>)
    ) ?? [];
  const leadershipTeamIds = leadershipTeams.map((item) => item.id);
  const incomingForThisTeam = matches.filter(
    (match) =>
      match.status === "challenge_pending" &&
      getReceivingTeamId(match) === id &&
      isLeadershipOfThisTeam
  );
  const teamMatches = matches.filter((match) => {
    if (incomingForThisTeam.some((item) => item.id === match.id)) return false;
    return (
      match.status === "scheduled" ||
      match.status === "confirmed" ||
      match.status === "challenge_pending"
    );
  });
  const eligibleChallengerTeams = leadershipTeams.filter(
    (item) => item.id !== id && item.sport === team.sport
  );
  const pendingAgainstThisTeam = matches.filter((match) => {
    if (match.status !== "challenge_pending") return false;
    return (
      (match.home_team_id === id && leadershipTeamIds.includes(match.away_team_id)) ||
      (match.away_team_id === id && leadershipTeamIds.includes(match.home_team_id))
    );
  });
  const teamsWithPendingChallenge = new Set(
    pendingAgainstThisTeam.map((match) =>
      match.home_team_id === id ? match.away_team_id : match.home_team_id
    )
  );
  const availableChallengerTeams = eligibleChallengerTeams.filter(
    (item) => !teamsWithPendingChallenge.has(item.id)
  );
  const canProposeChallenge =
    !isActiveMember && eligibleChallengerTeams.length > 0;
  const showChallengeForm = canProposeChallenge;

  return (
    <PageShell>
      <header>
        <h1 className="text-2xl font-semibold">{team.name}</h1>
        <p className="text-sm capitalize text-muted-foreground">
          {team.sport} · {getTeamTypeLabel(team.team_type)}
        </p>
      </header>

      <section className="rounded-lg border p-4 sm:p-6">
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
                  ? getTeamMemberRoleLabel(membership.role)
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
        <section className="rounded-lg border p-4 sm:p-6">
          <h2 className="mb-2 text-lg font-medium">Join this team</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Send a join request to the team captain for approval.
          </p>
          <JoinTeamButton teamId={id} userId={user.id} />
        </section>
      ) : membership.status === "invited" || membership.status === "pending" ? (
        <section className="rounded-lg border p-4 sm:p-6">
          <h2 className="mb-2 text-lg font-medium">
            {membership.status === "invited" ? "Team invite" : "Join request"}
          </h2>
          <MembershipActions memberId={membership.id} status={membership.status} />
        </section>
      ) : null}

      {isCaptain ? (
        <section className="rounded-lg border border-primary/20 bg-primary/5 p-4 sm:p-6">
          <h2 className="mb-2 text-lg font-medium">Captain dashboard</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Edit team details, review pending requests, invite players, and
            assign Co-Captain roles.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href={`/teams/${id}/manage#edit-team`}>Edit team</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/teams/${id}/manage`}>Manage members</Link>
            </Button>
          </div>
        </section>
      ) : isCoCaptain ? (
        <section className="rounded-lg border border-primary/20 bg-primary/5 p-4 sm:p-6">
          <h2 className="mb-2 text-lg font-medium">Invite players</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Search for existing players or invite someone by email, including
            people who do not have an account yet.
          </p>
          <Button asChild>
            <Link href={`/teams/${id}/manage`}>Invite players</Link>
          </Button>
        </section>
      ) : null}

      {incomingForThisTeam.length > 0 ? (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-medium">Incoming challenges</h2>
            <p className="text-sm text-muted-foreground">
              Accept, decline, or request changes to proposed match details.
            </p>
          </div>
          {incomingForThisTeam.map((match) => (
            <MatchSummaryCard
              key={match.id}
              match={match}
              leadershipTeamIds={leadershipTeamIds}
              footer={<IncomingChallengeActions matchId={match.id} />}
            />
          ))}
        </section>
      ) : null}

      {showChallengeForm ? (
        <ProposeChallengeForm
          userId={user.id}
          opponent={{
            id: team.id,
            name: team.name,
            location: team.location,
            sport: team.sport,
          }}
          challengerTeams={
            availableChallengerTeams.length > 0
              ? availableChallengerTeams
              : eligibleChallengerTeams
          }
          existingPendingMatchId={
            availableChallengerTeams.length === 0
              ? pendingAgainstThisTeam[0]?.id ?? null
              : null
          }
        />
      ) : intent === "challenge" && !isActiveMember ? (
        <section className="rounded-lg border p-4 sm:p-6">
          <h2 className="mb-2 text-lg font-medium">Challenge this team</h2>
          <p className="text-sm text-muted-foreground">
            Only captains and co-captains can propose a match. Create a team or
            ask to be made co-captain first.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/teams/new">Create team</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/teams">My teams</Link>
            </Button>
          </div>
        </section>
      ) : null}

      {isActiveMember ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-medium">Matches</h2>
            <Button asChild variant="outline" size="sm">
              <Link href="/matches">View all</Link>
            </Button>
          </div>
          {teamMatches.length === 0 ? (
            <EmptyState>No matches for this team yet.</EmptyState>
          ) : (
            <div className="space-y-3">
              {teamMatches.map((match) => (
                <MatchSummaryCard
                  key={match.id}
                  match={match}
                  leadershipTeamIds={leadershipTeamIds}
                />
              ))}
            </div>
          )}
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
          <Link href="/matches">Matches</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard">Dashboard</Link>
        </Button>
      </div>
    </PageShell>
  );
}
