"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Loader2, X } from "lucide-react";

import { EmptyState } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { approveJoinRequest, rejectJoinRequest } from "@/lib/teams/membership";
import type { TeamMemberWithProfile } from "@/lib/types/team";

interface PendingRequestsPanelProps {
  requests: TeamMemberWithProfile[];
}

export function PendingRequestsPanel({ requests }: PendingRequestsPanelProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAction(
    memberId: string,
    action: "approve" | "reject"
  ) {
    setLoadingId(memberId);
    setError(null);

    const supabase = createClient();
    const { error: actionError } =
      action === "approve"
        ? await approveJoinRequest(supabase, memberId)
        : await rejectJoinRequest(supabase, memberId);

    if (actionError) {
      setError(actionError.message);
      setLoadingId(null);
      return;
    }

    router.refresh();
    setLoadingId(null);
  }

  if (requests.length === 0) {
    return <EmptyState>No pending join requests.</EmptyState>;
  }

  return (
    <div className="space-y-3">
      <ul className="divide-y rounded-lg border">
        {requests.map((request) => (
          <li
            key={request.id}
            className="flex flex-wrap items-center justify-between gap-3 p-4"
          >
            <div>
              <p className="font-medium">
                {request.profile?.name ?? "Unknown player"}
              </p>
              <p className="text-sm text-muted-foreground">
                Requested{" "}
                {new Date(request.created_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => handleAction(request.id, "approve")}
                disabled={loadingId !== null}
              >
                {loadingId === request.id ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Check />
                )}
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAction(request.id, "reject")}
                disabled={loadingId !== null}
              >
                {loadingId === request.id ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <X />
                )}
                Reject
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
