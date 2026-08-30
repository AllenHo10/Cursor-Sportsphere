"use client";

import { InvitePlayerForm } from "@/components/teams/invite-player-form";
import { PendingRequestsPanel } from "@/components/teams/pending-requests-panel";
import { TeamRosterPanel } from "@/components/teams/team-roster-panel";
import type { TeamMemberWithProfile } from "@/lib/types/team";

interface TeamManageDashboardProps {
  teamId: string;
  currentUserId: string;
  pendingRequests: TeamMemberWithProfile[];
  invitedMembers: TeamMemberWithProfile[];
  activeMembers: TeamMemberWithProfile[];
}

export function TeamManageDashboard({
  teamId,
  currentUserId,
  pendingRequests,
  invitedMembers,
  activeMembers,
}: TeamManageDashboardProps) {
  const existingMemberIds = [
    ...activeMembers,
    ...pendingRequests,
    ...invitedMembers,
  ].map((member) => member.user_id);

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-medium">Pending join requests</h2>
          <p className="text-sm text-muted-foreground">
            Approve or reject players who requested to join your team.
          </p>
        </div>
        <PendingRequestsPanel requests={pendingRequests} />
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-medium">Invite players</h2>
          <p className="text-sm text-muted-foreground">
            Search for players and send them a direct team invite.
          </p>
        </div>
        <InvitePlayerForm teamId={teamId} existingMemberIds={existingMemberIds} />
      </section>

      {invitedMembers.length > 0 ? (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-medium">Outstanding invites</h2>
            <p className="text-sm text-muted-foreground">
              Players who have been invited but have not accepted yet.
            </p>
          </div>
          <ul className="divide-y rounded-lg border">
            {invitedMembers.map((member) => (
              <li key={member.id} className="p-4">
                <p className="font-medium">
                  {member.profile?.name ?? "Unknown player"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Invited{" "}
                  {new Date(member.created_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-medium">Active roster</h2>
          <p className="text-sm text-muted-foreground">
            Manage roles for current team members.
          </p>
        </div>
        <TeamRosterPanel
          members={activeMembers}
          isCaptain
          currentUserId={currentUserId}
        />
      </section>
    </div>
  );
}
