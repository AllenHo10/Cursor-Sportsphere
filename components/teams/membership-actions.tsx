"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import {
  acceptTeamInvite,
  cancelJoinRequest,
  declineTeamInvite,
} from "@/lib/teams/membership";
import type { TeamMemberStatus } from "@/lib/types/team";

interface MembershipActionsProps {
  memberId: string;
  status: TeamMemberStatus;
}

export function MembershipActions({ memberId, status }: MembershipActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<"accept" | "decline" | "cancel" | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  async function runAction(
    action: "accept" | "decline" | "cancel",
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

  if (status === "invited") {
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() =>
              runAction("accept", () =>
                acceptTeamInvite(createClient(), memberId)
              )
            }
            disabled={isLoading !== null}
          >
            {isLoading === "accept" ? <Loader2 className="animate-spin" /> : null}
            Accept invite
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              runAction("decline", () =>
                declineTeamInvite(createClient(), memberId)
              )
            }
            disabled={isLoading !== null}
          >
            {isLoading === "decline" ? <Loader2 className="animate-spin" /> : null}
            Decline
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

  if (status === "pending") {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Your join request is pending captain approval.
        </p>
        <Button
          variant="outline"
          onClick={() =>
            runAction("cancel", () =>
              cancelJoinRequest(createClient(), memberId)
            )
          }
          disabled={isLoading !== null}
        >
          {isLoading === "cancel" ? <Loader2 className="animate-spin" /> : null}
          Cancel request
        </Button>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return null;
}
