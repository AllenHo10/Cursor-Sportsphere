"use client";

import { TeamDetailsForm } from "@/components/teams/team-details-form";

interface CreateTeamFormProps {
  userId: string;
}

export function CreateTeamForm({ userId }: CreateTeamFormProps) {
  return <TeamDetailsForm userId={userId} />;
}
