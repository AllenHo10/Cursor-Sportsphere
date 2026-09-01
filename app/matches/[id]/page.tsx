import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CalendarClock, MapPin, Swords } from "lucide-react";

import { ChallengeResponseActions } from "@/components/matches/challenge-response-actions";
import {
  MatchStatusBadge,
  TeamMark,
} from "@/components/matches/match-summary-card";
import { Button } from "@/components/ui/button";
import { fetchLeadershipTeams } from "@/lib/matches/challenge";
import {
  formatMatchDateTime,
  getMatchFormatLabel,
  getReceivingTeamId,
  isChangeRequest,
  MATCH_TEAM_SELECT,
  parseMatchWithTeams,
} from "@/lib/matches/parse";
import { createClient } from "@/lib/supabase/server";

interface MatchDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ action?: string }>;
}

export default async function MatchDetailPage({
  params,
  searchParams,
}: MatchDetailPageProps) {
  const { id } = await params;
  const { action } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirectTo=/matches/${id}`);
  }

  const [{ data, error }, leadershipTeams] = await Promise.all([
    supabase.from("matches").select(MATCH_TEAM_SELECT).eq("id", id).single(),
    fetchLeadershipTeams(supabase, user.id),
  ]);

  if (error || !data) {
    notFound();
  }

  const match = parseMatchWithTeams(data as Record<string, unknown>);
  const leadershipTeamIds = leadershipTeams.map((team) => team.id);
  const receivingTeamId = getReceivingTeamId(match);
  const canRespond =
    match.status === "challenge_pending" &&
    leadershipTeamIds.includes(receivingTeamId);
  const canEditProposal =
    match.status === "challenge_pending" &&
    leadershipTeamIds.includes(match.proposed_by_team_id) &&
    !canRespond;
  const respondingTeamId = canRespond
    ? receivingTeamId
    : match.proposed_by_team_id;
  const changeRequest = isChangeRequest(match);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {match.home_team?.name ?? "Home team"} vs{" "}
            {match.away_team?.name ?? "Away team"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {match.status === "challenge_pending"
              ? changeRequest
                ? "The proposed details were updated and need a response."
                : "Challenge pending captain or co-captain review."
              : match.status === "scheduled"
                ? "This match has been accepted and scheduled."
                : "Match details"}
          </p>
        </div>
        <form action="/logout" method="post">
          <Button type="submit" variant="outline">
            Log out
          </Button>
        </form>
      </header>

      <section className="space-y-6 rounded-lg border p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <TeamMark
              name={match.home_team?.name ?? "Home team"}
              logoUrl={match.home_team?.logo_url ?? null}
            />
            <span className="text-sm text-muted-foreground">vs</span>
            <TeamMark
              name={match.away_team?.name ?? "Away team"}
              logoUrl={match.away_team?.logo_url ?? null}
            />
          </div>
          <MatchStatusBadge match={match} />
        </div>

        <dl className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-start gap-2">
            <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Date & time
              </dt>
              <dd className="mt-1 text-sm">
                {formatMatchDateTime(match.scheduled_at)}
              </dd>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Venue</dt>
              <dd className="mt-1 text-sm">{match.venue ?? "Not specified"}</dd>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Swords className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Match format
              </dt>
              <dd className="mt-1 text-sm">{getMatchFormatLabel(match.format)}</dd>
            </div>
          </div>
          <div>
            <dt className="text-sm font-medium text-muted-foreground">
              Last proposed by
            </dt>
            <dd className="mt-1 text-sm">
              {match.proposed_by_team_id === match.home_team_id
                ? match.home_team?.name
                : match.away_team?.name}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-sm font-medium text-muted-foreground">Notes</dt>
            <dd className="mt-1 whitespace-pre-wrap text-sm">
              {match.notes ?? "No notes."}
            </dd>
          </div>
        </dl>

        {match.status === "challenge_pending" &&
        !canRespond &&
        !canEditProposal ? (
          <p className="text-sm text-muted-foreground">
            A captain or co-captain of the receiving team can accept, decline, or
            request changes.
          </p>
        ) : null}

        <ChallengeResponseActions
          match={match}
          respondingTeamId={respondingTeamId}
          canRespond={canRespond}
          canEditProposal={canEditProposal}
          defaultOpenChanges={action === "changes"}
        />
      </section>

      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link href="/matches">Back to matches</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/teams/${match.away_team_id}`}>View away team</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/teams/${match.home_team_id}`}>View home team</Link>
        </Button>
      </div>
    </main>
  );
}
