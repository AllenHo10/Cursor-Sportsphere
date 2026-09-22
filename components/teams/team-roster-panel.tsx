"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, ShieldMinus, ShieldPlus } from "lucide-react";

import { EmptyState } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { assignCoCaptain, removeCoCaptain } from "@/lib/teams/membership";
import { getTeamMemberRoleLabel } from "@/lib/teams/parse";
import type { TeamMemberWithProfile } from "@/lib/types/team";

interface TeamRosterPanelProps {
  members: TeamMemberWithProfile[];
  isCaptain: boolean;
  currentUserId: string;
}

export function TeamRosterPanel({
  members,
  isCaptain,
  currentUserId,
}: TeamRosterPanelProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRoleChange(
    memberId: string,
    action: "promote" | "demote"
  ) {
    setLoadingId(memberId);
    setError(null);

    const supabase = createClient();
    const { error: actionError } =
      action === "promote"
        ? await assignCoCaptain(supabase, memberId)
        : await removeCoCaptain(supabase, memberId);

    if (actionError) {
      setError(actionError.message);
      setLoadingId(null);
      return;
    }

    router.refresh();
    setLoadingId(null);
  }

  if (members.length === 0) {
    return <EmptyState>No active members yet.</EmptyState>;
  }

  return (
    <div className="space-y-3">
      <ul className="divide-y rounded-lg border bg-card shadow-sm">
        {members.map((member) => {
          const isSelf = member.user_id === currentUserId;
          const canPromote =
            isCaptain && member.role === "player" && member.status === "active";
          const canDemote =
            isCaptain && member.role === "co_captain" && member.status === "active";

          return (
            <li
              key={member.id}
              className="flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <div>
                <p className="font-medium">
                  {member.profile?.name ?? "Unknown player"}
                  {isSelf ? (
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      (you)
                    </span>
                  ) : null}
                </p>
                <p className="text-sm text-muted-foreground">
                  {getTeamMemberRoleLabel(member.role)}
                  {member.joined_at
                    ? ` · Joined ${new Date(member.joined_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}`
                    : null}
                </p>
              </div>

              {canPromote || canDemote ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    handleRoleChange(member.id, canPromote ? "promote" : "demote")
                  }
                  disabled={loadingId !== null}
                >
                  {loadingId === member.id ? (
                    <Loader2 className="animate-spin" />
                  ) : canPromote ? (
                    <ShieldPlus />
                  ) : (
                    <ShieldMinus />
                  )}
                  {canPromote ? "Make Co-Captain" : "Remove Co-Captain"}
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
