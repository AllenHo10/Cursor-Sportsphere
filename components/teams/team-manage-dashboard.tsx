"use client";

import { InviteByEmailForm } from "@/components/teams/invite-by-email-form";
import { InvitePlayerForm } from "@/components/teams/invite-player-form";
import { PendingRequestsPanel } from "@/components/teams/pending-requests-panel";
import { TeamRosterPanel } from "@/components/teams/team-roster-panel";
import type { TeamEmailInvite, TeamMemberWithProfile } from "@/lib/types/team";

interface TeamManageDashboardProps {
  teamId: string;
  currentUserId: string;
  isCaptain: boolean;
  pendingRequests: TeamMemberWithProfile[];
  invitedMembers: TeamMemberWithProfile[];
  pendingEmailInvites: TeamEmailInvite[];
  activeMembers: TeamMemberWithProfile[];
}

export function TeamManageDashboard({
  teamId,
  currentUserId,
  isCaptain,
  pendingRequests,
  invitedMembers,
  pendingEmailInvites,
  activeMembers,
}: TeamManageDashboardProps) {
  const existingMemberIds = [
    ...activeMembers,
    ...pendingRequests,
    ...invitedMembers,
  ].map((member) => member.user_id);

  return (
    <div className="space-y-8">
      {isCaptain ? (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-medium">Pending join requests</h2>
            <p className="text-sm text-muted-foreground">
              Approve or reject players who requested to join your team.
            </p>
          </div>
          <PendingRequestsPanel requests={pendingRequests} />
        </section>
      ) : null}

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-medium">Invite players</h2>
          <p className="text-sm text-muted-foreground">
            Search for existing players or send an email invite to someone who
            does not have an account yet.
          </p>
        </div>
        <InvitePlayerForm teamId={teamId} existingMemberIds={existingMemberIds} />
        <div className="border-t pt-4">
          <h3 className="mb-1 text-sm font-medium">Invite by email</h3>
          <p className="mb-3 text-sm text-muted-foreground">
            If they already have an account, they get a normal team invite. If
            not, they receive a signup email linked to this team.
          </p>
          <InviteByEmailForm teamId={teamId} />
        </div>
      </section>

      {invitedMembers.length > 0 || pendingEmailInvites.length > 0 ? (
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
            {pendingEmailInvites.map((invite) => (
              <li key={invite.id} className="p-4">
                <p className="font-medium">{invite.email}</p>
                <p className="text-sm text-muted-foreground">
                  Email invite sent{" "}
                  {new Date(invite.created_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                  . Waiting for them to sign up with this address.
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
            {isCaptain
              ? "Manage roles for current team members."
              : "Current team members."}
          </p>
        </div>
        <TeamRosterPanel
          members={activeMembers}
          isCaptain={isCaptain}
          currentUserId={currentUserId}
        />
      </section>
    </div>
  );
}
