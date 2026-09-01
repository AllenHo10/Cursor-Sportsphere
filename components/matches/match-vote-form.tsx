"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Check, HelpCircle, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { VOTE_RESPONSES } from "@/lib/constants/match";
import { submitMatchVote } from "@/lib/matches/votes";
import { createClient } from "@/lib/supabase/client";
import type { VoteResponse } from "@/lib/types/match";

interface MatchVoteFormProps {
  matchId: string;
  userId: string;
  currentVote: VoteResponse | null;
}

const voteIcons: Record<VoteResponse, ReactNode> = {
  yes: <Check />,
  maybe: <HelpCircle />,
  no: <X />,
};

export function MatchVoteForm({
  matchId,
  userId,
  currentVote,
}: MatchVoteFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<VoteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleVote(response: VoteResponse) {
    if (response === currentVote) return;

    setIsLoading(response);
    setError(null);

    const { error: voteError } = await submitMatchVote(
      createClient(),
      matchId,
      userId,
      response
    );

    if (voteError) {
      setError(voteError.message);
      setIsLoading(null);
      return;
    }

    router.refresh();
    setIsLoading(null);
  }

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-medium">Can you play?</h2>
        <p className="text-sm text-muted-foreground">
          Let your captain know if you can make this match.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {VOTE_RESPONSES.map((option) => {
          const isSelected = currentVote === option.value;
          return (
            <Button
              key={option.value}
              type="button"
              variant={isSelected ? "default" : "outline"}
              onClick={() => handleVote(option.value)}
              disabled={isLoading !== null}
            >
              {isLoading === option.value ? (
                <Loader2 className="animate-spin" />
              ) : (
                voteIcons[option.value]
              )}
              {option.label}
            </Button>
          );
        })}
      </div>
      {currentVote ? (
        <p className="text-sm text-muted-foreground">
          Your vote: {VOTE_RESPONSES.find((item) => item.value === currentVote)?.label}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">You have not voted yet.</p>
      )}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
