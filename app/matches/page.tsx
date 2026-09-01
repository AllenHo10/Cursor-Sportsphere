import Link from "next/link";
import { redirect } from "next/navigation";

import { IncomingChallengeActions } from "@/components/matches/incoming-challenge-actions";
import { MatchSummaryCard } from "@/components/matches/match-summary-card";
import { Button } from "@/components/ui/button";
import { fetchLeadershipTeams } from "@/lib/matches/challenge";
import {
  getReceivingTeamId,
  MATCH_TEAM_SELECT,
  parseMatchWithTeams,
} from "@/lib/matches/parse";
import { createClient } from "@/lib/supabase/server";

export default async function MatchesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/matches");
  }

  const [leadershipTeams, { data: matchesData, error }] = await Promise.all([
    fetchLeadershipTeams(supabase, user.id),
    supabase
      .from("matches")
      .select(MATCH_TEAM_SELECT)
      .in("status", ["challenge_pending", "scheduled", "confirmed", "cancelled"])
      .order("scheduled_at", { ascending: true }),
  ]);

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
  const outgoing = matches.filter(
    (match) =>
      match.status === "challenge_pending" &&
      leadershipTeamIds.includes(match.proposed_by_team_id) &&
      !leadershipTeamIds.includes(getReceivingTeamId(match))
  );
  const scheduled = matches.filter((match) => match.status === "scheduled");
  const confirmed = matches.filter((match) => match.status === "confirmed");
  const cancelled = matches.filter((match) => match.status === "cancelled");

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Matches</h1>
          <p className="text-sm text-muted-foreground">
            Propose challenges, respond to opponents, and track scheduled games.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild>
            <Link href="/teams/discover">Find a team to challenge</Link>
          </Button>
          <form action="/logout" method="post">
            <Button type="submit" variant="outline">
              Log out
            </Button>
          </form>
        </div>
      </header>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error.message}
        </p>
      ) : null}

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-medium">Needs your response</h2>
          <p className="text-sm text-muted-foreground">
            Incoming challenges and requested changes for teams you captain or
            co-captain.
          </p>
        </div>
        {incoming.length === 0 ? (
          <p className="rounded-lg border p-4 text-sm text-muted-foreground">
            No pending challenges to review.
          </p>
        ) : (
          <div className="space-y-3">
            {incoming.map((match) => (
              <MatchSummaryCard
                key={match.id}
                match={match}
                leadershipTeamIds={leadershipTeamIds}
                footer={<IncomingChallengeActions matchId={match.id} />}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-medium">Waiting for opponent</h2>
          <p className="text-sm text-muted-foreground">
            Challenges you sent that are still waiting on the other team.
          </p>
        </div>
        {outgoing.length === 0 ? (
          <p className="rounded-lg border p-4 text-sm text-muted-foreground">
            No outgoing challenges. Discover a team to send one.
          </p>
        ) : (
          <div className="space-y-3">
            {outgoing.map((match) => (
              <MatchSummaryCard
                key={match.id}
                match={match}
                leadershipTeamIds={leadershipTeamIds}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-medium">Scheduled</h2>
          <p className="text-sm text-muted-foreground">
            Accepted matches waiting for votes or captain confirmation.
          </p>
        </div>
        {scheduled.length === 0 ? (
          <p className="rounded-lg border p-4 text-sm text-muted-foreground">
            No scheduled matches yet.
          </p>
        ) : (
          <div className="space-y-3">
            {scheduled.map((match) => (
              <MatchSummaryCard
                key={match.id}
                match={match}
                leadershipTeamIds={leadershipTeamIds}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-medium">Confirmed</h2>
          <p className="text-sm text-muted-foreground">
            Locked-in matches visible to members of both teams.
          </p>
        </div>
        {confirmed.length === 0 ? (
          <p className="rounded-lg border p-4 text-sm text-muted-foreground">
            No confirmed matches yet.
          </p>
        ) : (
          <div className="space-y-3">
            {confirmed.map((match) => (
              <MatchSummaryCard
                key={match.id}
                match={match}
                leadershipTeamIds={leadershipTeamIds}
              />
            ))}
          </div>
        )}
      </section>

      {cancelled.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Declined or withdrawn</h2>
          <div className="space-y-3">
            {cancelled.map((match) => (
              <MatchSummaryCard
                key={match.id}
                match={match}
                leadershipTeamIds={leadershipTeamIds}
              />
            ))}
          </div>
        </section>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link href="/teams">My teams</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard">Dashboard</Link>
        </Button>
      </div>
    </main>
  );
}
