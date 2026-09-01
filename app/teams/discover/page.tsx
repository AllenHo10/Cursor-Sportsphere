import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";

import { TeamCard } from "@/components/teams/team-card";
import { TeamDiscoveryFilters } from "@/components/teams/team-discovery-filters";
import { Button } from "@/components/ui/button";
import { fetchLeadershipTeams } from "@/lib/matches/challenge";
import { createClient } from "@/lib/supabase/server";
import { parseTeam } from "@/lib/teams/parse";
import type { SkillLevel } from "@/lib/types/profile";
import type { Team, TeamMemberStatus, TeamType } from "@/lib/types/team";

interface DiscoverPageProps {
  searchParams: Promise<{
    sport?: string;
    location?: string;
    nearMe?: string;
    teamType?: string;
    skillLevel?: string;
  }>;
}

function getLocationSearchTerm(
  location: string | undefined,
  nearMe: string | undefined,
  profileLocation: string | null
) {
  const trimmedLocation = location?.trim();
  if (trimmedLocation) return trimmedLocation;

  if (nearMe === "1" && profileLocation) {
    return profileLocation.split(",")[0]?.trim() ?? profileLocation.trim();
  }

  return null;
}

export default async function TeamDiscoverPage({ searchParams }: DiscoverPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/teams/discover");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("location")
    .eq("id", user.id)
    .single();

  const profileLocation = (profile?.location as string | null) ?? null;
  const locationSearch = getLocationSearchTerm(
    params.location,
    params.nearMe,
    profileLocation
  );

  let query = supabase.from("teams").select("*").order("created_at", { ascending: false });

  if (params.sport) {
    query = query.eq("sport", params.sport);
  }

  if (params.teamType) {
    query = query.eq("team_type", params.teamType as TeamType);
  }

  if (params.skillLevel) {
    query = query.eq("skill_level", params.skillLevel as SkillLevel);
  }

  if (locationSearch) {
    query = query.ilike("location", `%${locationSearch}%`);
  }

  const [{ data: teamsData, error: teamsError }, { data: memberships }, leadershipTeams] =
    await Promise.all([
      query,
      supabase
        .from("team_members")
        .select("team_id, status")
        .eq("user_id", user.id)
        .neq("status", "removed"),
      fetchLeadershipTeams(supabase, user.id),
    ]);
  const canChallenge = leadershipTeams.length > 0;

  const membershipByTeamId = new Map<string, TeamMemberStatus>(
    memberships?.map((membership) => [
      membership.team_id as string,
      membership.status as TeamMemberStatus,
    ]) ?? []
  );

  const teams: Team[] =
    teamsData?.map((row) => parseTeam(row as Record<string, unknown>)) ?? [];

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Discover teams</h1>
          <p className="text-sm text-muted-foreground">
            Browse volleyball teams and find opponents to challenge.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/matches">Matches</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/teams">My teams</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/teams/new">Create team</Link>
          </Button>
          <form action="/logout" method="post">
            <Button type="submit" variant="outline">
              Log out
            </Button>
          </form>
        </div>
      </header>

      <Suspense fallback={<div className="rounded-lg border p-6 text-sm text-muted-foreground">Loading filters...</div>}>
        <TeamDiscoveryFilters profileLocation={profileLocation} />
      </Suspense>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {teams.length} team{teams.length === 1 ? "" : "s"} found
          </p>
        </div>

        {teamsError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
            {teamsError.message}
          </div>
        ) : teams.length === 0 ? (
          <div className="rounded-lg border p-6">
            <p className="text-sm text-muted-foreground">
              No teams match your filters. Try broadening your search or create a
              new team.
            </p>
            <Button asChild className="mt-4">
              <Link href="/teams/new">Create team</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {teams.map((team) => (
              <TeamCard
                key={team.id}
                team={team}
                membershipStatus={membershipByTeamId.get(team.id) ?? null}
                isOwnTeam={membershipByTeamId.get(team.id) === "active"}
                canChallenge={canChallenge}
              />
            ))}
          </div>
        )}
      </section>

      <Button asChild variant="outline" className="w-fit">
        <Link href="/dashboard">Back to dashboard</Link>
      </Button>
    </main>
  );
}
