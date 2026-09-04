import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CalendarClock, MapPin, Swords } from "lucide-react";

import { MatchConfirmPanel } from "@/components/matches/match-confirm-panel";
import { ChallengeResponseActions } from "@/components/matches/challenge-response-actions";
import {
  MatchStatusBadge,
  TeamMark,
} from "@/components/matches/match-summary-card";
import { MatchVoteForm } from "@/components/matches/match-vote-form";
import { MatchVoteSummary } from "@/components/matches/match-vote-summary";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { fetchLeadershipTeams } from "@/lib/matches/challenge";
import {
  fetchMatchParticipation,
  participationForTeam,
} from "@/lib/matches/confirmation";
import {
  formatMatchDateTime,
  getMatchFormatLabel,
  getReceivingTeamId,
  isChangeRequest,
  isVotableMatchStatus,
  MATCH_TEAM_SELECT,
  parseMatchWithTeams,
} from "@/lib/matches/parse";
import {
  parseVote,
  parseVoteWithProfile,
  VOTE_WITH_PROFILE_SELECT,
} from "@/lib/matches/votes";
import { createClient } from "@/lib/supabase/server";
import { parseTeamMemberWithProfile } from "@/lib/teams/parse";

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
  const canVote = isVotableMatchStatus(match.status);
  const isLeadershipOfMatch =
    leadershipTeamIds.includes(match.home_team_id) ||
    leadershipTeamIds.includes(match.away_team_id);
  const loadVoteBreakdown = canVote && (isLeadershipOfMatch || match.status === "confirmed");

  const [
    { data: memberships },
    { data: ownVoteData },
    { data: allVotesData },
    { data: rosterData },
    { data: participationRows },
  ] = await Promise.all([
    supabase
      .from("team_members")
      .select("team_id, role, status")
      .eq("user_id", user.id)
      .eq("status", "active")
      .in("team_id", [match.home_team_id, match.away_team_id]),
    supabase
      .from("votes")
      .select("*")
      .eq("match_id", id)
      .eq("user_id", user.id)
      .maybeSingle(),
    loadVoteBreakdown
      ? supabase
          .from("votes")
          .select(VOTE_WITH_PROFILE_SELECT)
          .eq("match_id", id)
          .order("responded_at", { ascending: true })
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    loadVoteBreakdown
      ? supabase
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
          .in("team_id", [match.home_team_id, match.away_team_id])
          .eq("status", "active")
          .order("joined_at", { ascending: true })
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    canVote
      ? fetchMatchParticipation(supabase, id)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const isMatchMember = (memberships?.length ?? 0) > 0;
  const canSeeVoteBreakdown = loadVoteBreakdown && isMatchMember;
  const currentVote = ownVoteData
    ? parseVote(ownVoteData as Record<string, unknown>).response
    : null;
  const votes =
    allVotesData?.map((row) =>
      parseVoteWithProfile(row as Record<string, unknown>)
    ) ?? [];
  const members =
    rosterData?.map((row) =>
      parseTeamMemberWithProfile(row as Record<string, unknown>)
    ) ?? [];
  const homeProgress = participationForTeam(
    participationRows,
    match.home_team_id,
    match.format
  );
  const awayProgress = participationForTeam(
    participationRows,
    match.away_team_id,
    match.format
  );

  return (
    <PageShell>
      <header>
        <h1 className="text-2xl font-semibold">
          {match.home_team?.name ?? "Home team"} vs{" "}
          {match.away_team?.name ?? "Away team"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {match.status === "challenge_pending"
            ? changeRequest
              ? "The proposed details were updated and need a response."
              : "Challenge pending captain or co-captain review."
            : match.status === "confirmed"
              ? "This match is confirmed. Details are visible to members of both teams."
              : isVotableMatchStatus(match.status)
                ? "This match has been accepted. Vote Yes to help reach the minimum, or wait for captains to confirm."
                : "Match details"}
        </p>
      </header>

      <section className="space-y-6 rounded-lg border p-4 sm:p-6">
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

      {isMatchMember && (match.status === "scheduled" || match.status === "confirmed") ? (
        <section className="rounded-lg border p-4 sm:p-6">
          <MatchConfirmPanel
            match={match}
            userId={user.id}
            homeTeamName={match.home_team?.name ?? "Home team"}
            awayTeamName={match.away_team?.name ?? "Away team"}
            canConfirmHome={leadershipTeamIds.includes(match.home_team_id)}
            canConfirmAway={leadershipTeamIds.includes(match.away_team_id)}
            homeProgress={homeProgress}
            awayProgress={awayProgress}
          />
        </section>
      ) : null}

      {canVote && isMatchMember ? (
        <section id="votes" className="rounded-lg border p-4 sm:p-6">
          <MatchVoteForm
            matchId={match.id}
            userId={user.id}
            currentVote={currentVote}
            requiredYesVotes={homeProgress.required}
          />
        </section>
      ) : null}

      {canSeeVoteBreakdown ? (
        <section
          className="rounded-lg border p-4 sm:p-6"
          id={canVote && isMatchMember ? undefined : "votes"}
        >
          <MatchVoteSummary
            homeTeamName={match.home_team?.name ?? "Home team"}
            awayTeamName={match.away_team?.name ?? "Away team"}
            homeTeamId={match.home_team_id}
            awayTeamId={match.away_team_id}
            members={members}
            votes={votes}
          />
        </section>
      ) : null}

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
    </PageShell>
  );
}
