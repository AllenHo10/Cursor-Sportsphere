"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  acceptChallenge,
  declineChallenge,
} from "@/lib/matches/challenge";
import { createClient } from "@/lib/supabase/client";

interface IncomingChallengeActionsProps {
  matchId: string;
}

export function IncomingChallengeActions({
  matchId,
}: IncomingChallengeActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<"accept" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runAction(
    action: "accept" | "decline",
    handler: () => Promise<{ error: Error | null }>
  ) {
    setIsLoading(action);
    setError(null);

    const { error: actionError } = await handler();
    if (actionError) {
      setError(actionError.message);
      setIsLoading(null);
      return;
    }

    router.refresh();
    setIsLoading(null);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={() =>
            runAction("accept", () => acceptChallenge(createClient(), matchId))
          }
          disabled={isLoading !== null}
        >
          {isLoading === "accept" ? <Loader2 className="animate-spin" /> : <Check />}
          Accept
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            runAction("decline", () =>
              declineChallenge(createClient(), matchId)
            )
          }
          disabled={isLoading !== null}
        >
          {isLoading === "decline" ? <Loader2 className="animate-spin" /> : <X />}
          Decline
        </Button>
        <Button asChild size="sm" variant="secondary">
          <Link href={`/matches/${matchId}?action=changes`}>Request changes</Link>
        </Button>
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
