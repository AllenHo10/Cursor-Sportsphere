"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getRequiredYesVotes } from "@/lib/constants/match";
import { confirmMatchForTeam } from "@/lib/matches/confirmation";
import { getMatchFormatLabel } from "@/lib/matches/parse";
import { createClient } from "@/lib/supabase/client";
import type { Match } from "@/lib/types/match";

interface TeamProgress {
  yesCount: number;
  required: number;
  met: boolean;
}

interface MatchConfirmPanelProps {
  match: Match;
  userId: string;
  homeTeamName: string;
  awayTeamName: string;
  canConfirmHome: boolean;
  canConfirmAway: boolean;
  homeProgress: TeamProgress;
  awayProgress: TeamProgress;
}

function ConfirmationLine({
  teamName,
  confirmed,
  progress,
}: {
  teamName: string;
  confirmed: boolean;
  progress: TeamProgress;
}) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium">{teamName}</p>
        <span className="text-sm text-muted-foreground">
          {confirmed ? "Captain confirmed" : "Waiting on captain"}
        </span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Yes votes {progress.yesCount} / {progress.required}
        {progress.met ? " — minimum reached" : ""}
      </p>
    </div>
  );
}

export function MatchConfirmPanel({
  match,
  userId,
  homeTeamName,
  awayTeamName,
  canConfirmHome,
  canConfirmAway,
  homeProgress,
  awayProgress,
}: MatchConfirmPanelProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<"home" | "away" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const required = getRequiredYesVotes(match.format);
  const bothCaptains =
    Boolean(match.home_confirmed_at) && Boolean(match.away_confirmed_at);
  const autoReady = homeProgress.met && awayProgress.met;

  async function handleConfirm(side: "home" | "away") {
    setIsLoading(side);
    setError(null);

    const { error: confirmError } = await confirmMatchForTeam(
      createClient(),
      match.id,
      userId,
      side
    );

    if (confirmError) {
      setError(confirmError.message);
      setIsLoading(null);
      return;
    }

    router.refresh();
    setIsLoading(null);
  }

  if (match.status === "confirmed") {
    return (
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-medium">Match confirmed</h2>
          <p className="text-sm text-muted-foreground">
            {bothCaptains
              ? "Both captains confirmed this match. Details are visible to members of both teams."
              : "Minimum participation was reached from Yes votes. Details are visible to members of both teams."}
          </p>
        </div>
      </section>
    );
  }

  if (match.status !== "scheduled") {
    return null;
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-medium">Confirm this match</h2>
        <p className="text-sm text-muted-foreground">
          A {getMatchFormatLabel(match.format)} match is confirmed when both
          captains confirm, or automatically when each team has at least{" "}
          {required} Yes votes.
        </p>
      </div>

      {autoReady ? (
        <p className="text-sm text-muted-foreground">
          Both teams have reached the minimum Yes votes. This match should
          confirm automatically.
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <ConfirmationLine
          teamName={homeTeamName}
          confirmed={Boolean(match.home_confirmed_at)}
          progress={homeProgress}
        />
        <ConfirmationLine
          teamName={awayTeamName}
          confirmed={Boolean(match.away_confirmed_at)}
          progress={awayProgress}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {canConfirmHome && !match.home_confirmed_at ? (
          <Button
            type="button"
            onClick={() => handleConfirm("home")}
            disabled={isLoading !== null}
          >
            {isLoading === "home" ? <Loader2 className="animate-spin" /> : <Check />}
            Confirm for {homeTeamName}
          </Button>
        ) : null}
        {canConfirmAway && !match.away_confirmed_at ? (
          <Button
            type="button"
            onClick={() => handleConfirm("away")}
            disabled={isLoading !== null}
          >
            {isLoading === "away" ? <Loader2 className="animate-spin" /> : <Check />}
            Confirm for {awayTeamName}
          </Button>
        ) : null}
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
