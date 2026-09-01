import Link from "next/link";
import type { ReactNode } from "react";
import { CalendarClock, MapPin, Shield, Swords } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  getMatchFormatLabel,
  formatMatchDateTime,
  getMatchStatusLabel,
  getReceivingTeamId,
  isChangeRequest,
} from "@/lib/matches/parse";
import type { MatchWithTeams } from "@/lib/types/match";
import { cn } from "@/lib/utils";

function teamName(
  match: MatchWithTeams,
  side: "home" | "away"
) {
  const team = side === "home" ? match.home_team : match.away_team;
  return team?.name ?? "Unknown team";
}

export function MatchStatusBadge({
  match,
}: {
  match: MatchWithTeams;
}) {
  const isPending = match.status === "challenge_pending";
  const changeRequest = isPending && isChangeRequest(match);

  return (
    <span
      className={cn(
        "rounded-full border px-2.5 py-0.5 text-xs font-medium",
        match.status === "scheduled" &&
          "border-emerald-500/30 bg-emerald-500/10 text-emerald-800",
        match.status === "confirmed" &&
          "border-blue-500/30 bg-blue-500/10 text-blue-800",
        match.status === "cancelled" && "border bg-muted text-muted-foreground",
        isPending &&
          "border-amber-500/30 bg-amber-500/10 text-amber-800"
      )}
    >
      {isPending && changeRequest
        ? "Changes requested"
        : getMatchStatusLabel(match.status)}
    </span>
  );
}

interface MatchSummaryCardProps {
  match: MatchWithTeams;
  leadershipTeamIds: string[];
  footer?: ReactNode;
}

export function MatchSummaryCard({
  match,
  leadershipTeamIds,
  footer,
}: MatchSummaryCardProps) {
  const leadership = new Set(leadershipTeamIds);
  const receivingTeamId = getReceivingTeamId(match);
  const isIncoming =
    match.status === "challenge_pending" && leadership.has(receivingTeamId);
  const proposingTeam =
    match.proposed_by_team_id === match.home_team_id
      ? match.home_team
      : match.away_team;

  return (
    <article className="rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium">
              {teamName(match, "home")} vs {teamName(match, "away")}
            </h3>
            <MatchStatusBadge match={match} />
          </div>
          {match.status === "challenge_pending" ? (
            <p className="text-sm text-muted-foreground">
              {isIncoming
                ? `Proposed by ${proposingTeam?.name ?? "the other team"}. Review the details below.`
                : `Waiting for ${
                    match.proposed_by_team_id === match.home_team_id
                      ? teamName(match, "away")
                      : teamName(match, "home")
                  } to respond.`}
            </p>
          ) : null}
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/matches/${match.id}`}>View details</Link>
        </Button>
      </div>

      {match.status === "scheduled" ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Accepted match —{" "}
          <Link href={`/matches/${match.id}#votes`} className="underline-offset-4 hover:underline">
            vote on availability
          </Link>{" "}
          or wait for captains to confirm.
        </p>
      ) : null}

      {match.status === "confirmed" ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Confirmed —{" "}
          <Link href={`/matches/${match.id}`} className="underline-offset-4 hover:underline">
            view match details
          </Link>
          .
        </p>
      ) : null}

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        <div className="flex items-start gap-2">
          <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            <dt className="text-muted-foreground">Date & time</dt>
            <dd>{formatMatchDateTime(match.scheduled_at)}</dd>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            <dt className="text-muted-foreground">Venue</dt>
            <dd>{match.venue ?? "Not specified"}</dd>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Swords className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            <dt className="text-muted-foreground">Format</dt>
            <dd>{getMatchFormatLabel(match.format)}</dd>
          </div>
        </div>
      </dl>

      {footer ? <div className="mt-4">{footer}</div> : null}
    </article>
  );
}

export function TeamMark({
  name,
  logoUrl,
}: {
  name: string;
  logoUrl: string | null;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <Shield className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      <span className="font-medium">{name}</span>
    </div>
  );
}
