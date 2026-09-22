import Link from "next/link";
import { redirect } from "next/navigation";

import { IncomingChallengeActions } from "@/components/matches/incoming-challenge-actions";
import { MatchSummaryCard } from "@/components/matches/match-summary-card";
import { EmptyState, PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { fetchLeadershipTeams } from "@/lib/matches/challenge";
import {
  getReceivingTeamId,
  MATCH_TEAM_SELECT,
  parseMatchWithTeams,
} from "@/lib/matches/parse";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: profile }, leadershipTeams, { data: matchesData }] =
    await Promise.all([
      supabase.from("profiles").select("name").eq("id", user.id).single(),
      fetchLeadershipTeams(supabase, user.id),
      supabase
        .from("matches")
        .select(MATCH_TEAM_SELECT)
        .in("status", ["challenge_pending", "scheduled", "confirmed"])
        .order("scheduled_at", { ascending: true }),
    ]);

  const name = profile?.name ?? user.email ?? "Player";
  const leadershipTeamIds = leadershipTeams.map((team) => team.id);
  const matches =
    matchesData?.map((row) =>
      parseMatchWithTeams(row as Record<string, unknown>)
    ) ?? [];
  const incoming = matches.filter(
    (match) =>
      match.status === "challenge_pending" &&
      leadershipTeamIds.includes(getReceivingTeamId(match))
  );
  const upcoming = matches
    .filter((match) => match.status === "scheduled" || match.status === "confirmed")
    .slice(0, 5);

  return (
    <PageShell>
      <header>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Welcome back, {name}</p>
      </header>
      <section className="rounded-lg border bg-card p-4 shadow-sm sm:p-6">
        <h2 className="mb-2 text-lg font-medium">Quick links</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Manage your teams and matches from here.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link href="/profile">Edit profile</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/teams">Manage teams</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/matches">Matches</Link>
          </Button>
          <Button asChild>
            <Link href="/teams/discover">Discover teams</Link>
          </Button>
        </div>
      </section>

      {incoming.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-medium">Incoming challenges</h2>
              <p className="text-sm text-muted-foreground">
                Your teams have match proposals waiting for a response.
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/matches">View all</Link>
            </Button>
          </div>
          {incoming.map((match) => (
            <MatchSummaryCard
              key={match.id}
              match={match}
              leadershipTeamIds={leadershipTeamIds}
              footer={<IncomingChallengeActions matchId={match.id} />}
            />
          ))}
        </section>
      ) : null}

      {upcoming.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-medium">Upcoming matches</h2>
            <Button asChild variant="outline" size="sm">
              <Link href="/matches">View all</Link>
            </Button>
          </div>
          {upcoming.map((match) => (
            <MatchSummaryCard
              key={match.id}
              match={match}
              leadershipTeamIds={leadershipTeamIds}
            />
          ))}
        </section>
      ) : incoming.length === 0 ? (
        <EmptyState title="No matches yet">
          Discover a team to challenge, or wait for an upcoming match to appear
          here.
        </EmptyState>
      ) : null}
    </PageShell>
  );
}
