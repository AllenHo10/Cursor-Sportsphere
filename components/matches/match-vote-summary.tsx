import { getVoteResponseLabel, tallyVotes } from "@/lib/matches/votes";
import { getTeamMemberRoleLabel } from "@/lib/teams/parse";
import type { VoteResponse, VoteWithProfile } from "@/lib/types/match";
import type { TeamMemberWithProfile } from "@/lib/types/team";
import { cn } from "@/lib/utils";

interface MatchVoteSummaryProps {
  homeTeamName: string;
  awayTeamName: string;
  homeTeamId: string;
  awayTeamId: string;
  members: TeamMemberWithProfile[];
  votes: VoteWithProfile[];
}

function VoteBadge({ response }: { response: VoteResponse | null }) {
  return (
    <span
      className={cn(
        "rounded-full border px-2.5 py-0.5 text-xs font-medium",
        response === "yes" && "border-emerald-500/30 bg-emerald-500/10 text-emerald-800",
        response === "maybe" && "border-amber-500/30 bg-amber-500/10 text-amber-800",
        response === "no" && "border-destructive/30 bg-destructive/10 text-destructive",
        !response && "bg-muted text-muted-foreground"
      )}
    >
      {response ? getVoteResponseLabel(response) : "No response"}
    </span>
  );
}

function TeamVoteList({
  teamName,
  members,
  votesByUserId,
}: {
  teamName: string;
  members: TeamMemberWithProfile[];
  votesByUserId: Map<string, VoteWithProfile>;
}) {
  const teamVotes = members
    .map((member) => votesByUserId.get(member.user_id))
    .filter((vote): vote is VoteWithProfile => Boolean(vote));
  const totals = tallyVotes(teamVotes);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-medium">{teamName}</h3>
        <p className="text-sm text-muted-foreground">
          Yes {totals.yes} · Maybe {totals.maybe} · No {totals.no} · No response{" "}
          {members.length - teamVotes.length}
        </p>
      </div>
      {members.length === 0 ? (
        <p className="text-sm text-muted-foreground">No roster to show.</p>
      ) : (
        <ul className="divide-y rounded-lg border bg-card shadow-sm">
          {members.map((member) => {
            const vote = votesByUserId.get(member.user_id) ?? null;
            return (
              <li
                key={member.id}
                className="flex flex-wrap items-center justify-between gap-3 p-3"
              >
                <div>
                  <p className="font-medium">
                    {member.profile?.name ?? "Unknown player"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {getTeamMemberRoleLabel(member.role)}
                  </p>
                </div>
                <VoteBadge response={vote?.response ?? null} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function MatchVoteSummary({
  homeTeamName,
  awayTeamName,
  homeTeamId,
  awayTeamId,
  members,
  votes,
}: MatchVoteSummaryProps) {
  const votesByUserId = new Map(votes.map((vote) => [vote.user_id, vote]));
  const homeMembers = members.filter((member) => member.team_id === homeTeamId);
  const awayMembers = members.filter((member) => member.team_id === awayTeamId);
  const totals = tallyVotes(votes);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-medium">Attendance</h2>
        <p className="text-sm text-muted-foreground">
          Vote totals and individual responses for this match.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Yes</p>
          <p className="text-2xl font-semibold">{totals.yes}</p>
        </div>
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Maybe</p>
          <p className="text-2xl font-semibold">{totals.maybe}</p>
        </div>
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">No</p>
          <p className="text-2xl font-semibold">{totals.no}</p>
        </div>
      </div>
      <TeamVoteList
        teamName={homeTeamName}
        members={homeMembers}
        votesByUserId={votesByUserId}
      />
      <TeamVoteList
        teamName={awayTeamName}
        members={awayMembers}
        votesByUserId={votesByUserId}
      />
    </section>
  );
}
