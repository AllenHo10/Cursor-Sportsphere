"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { requestToJoinTeam } from "@/lib/teams/membership";

interface JoinTeamButtonProps {
  teamId: string;
  userId: string;
}

export function JoinTeamButton({ teamId, userId }: JoinTeamButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleJoin() {
    setIsLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: joinError } = await requestToJoinTeam(supabase, teamId, userId);

    if (joinError) {
      setError(joinError.message);
      setIsLoading(false);
      return;
    }

    router.refresh();
    setIsLoading(false);
  }

  return (
    <div className="space-y-2">
      <Button onClick={handleJoin} disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="animate-spin" />
            Sending request...
          </>
        ) : (
          "Request to join"
        )}
      </Button>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
