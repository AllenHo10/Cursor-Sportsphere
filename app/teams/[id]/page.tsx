import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Shield } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SKILL_LEVELS, TEAM_TYPES } from "@/lib/constants/team";
import { createClient } from "@/lib/supabase/server";
import type { SkillLevel } from "@/lib/types/profile";
import type { TeamType, TeamWithCaptain } from "@/lib/types/team";

function parseTeam(row: Record<string, unknown>): TeamWithCaptain {
  const captain = row.captain as Record<string, unknown> | null;

  return {
    id: row.id as string,
    name: row.name as string,
    sport: row.sport as string,
    logo_url: (row.logo_url as string | null) ?? null,
    location: (row.location as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    team_type: row.team_type as TeamType,
    skill_level: (row.skill_level as SkillLevel | null) ?? null,
    captain_id: row.captain_id as string,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    captain: captain
      ? {
          name: captain.name as string,
          profile_image_url: (captain.profile_image_url as string | null) ?? null,
        }
      : null,
  };
}

function getTeamTypeLabel(value: TeamType) {
  return TEAM_TYPES.find((type) => type.value === value)?.label ?? value;
}

function getSkillLevelLabel(value: SkillLevel | null) {
  if (!value) return "Not specified";
  return SKILL_LEVELS.find((level) => level.value === value)?.label ?? value;
}

interface TeamDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function TeamDetailPage({ params }: TeamDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirectTo=/teams/${id}`);
  }

  const { data, error } = await supabase
    .from("teams")
    .select(
      `
        *,
        captain:profiles!teams_captain_id_fkey (
          name,
          profile_image_url
        )
      `
    )
    .eq("id", id)
    .single();

  if (error || !data) {
    notFound();
  }

  const team = parseTeam(data);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{team.name}</h1>
          <p className="text-sm capitalize text-muted-foreground">
            {team.sport} · {getTeamTypeLabel(team.team_type)}
          </p>
        </div>
        <form action="/logout" method="post">
          <Button type="submit" variant="outline">
            Log out
          </Button>
        </form>
      </header>

      <section className="rounded-lg border p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
            {team.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={team.logo_url}
                alt={`${team.name} logo`}
                className="h-full w-full object-cover"
              />
            ) : (
              <Shield className="h-10 w-10 text-muted-foreground" />
            )}
          </div>

          <dl className="grid flex-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Location</dt>
              <dd className="mt-1 text-sm">{team.location ?? "Not specified"}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Skill level</dt>
              <dd className="mt-1 text-sm">{getSkillLevelLabel(team.skill_level)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Captain</dt>
              <dd className="mt-1 text-sm">{team.captain?.name ?? "Unknown"}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Created</dt>
              <dd className="mt-1 text-sm">
                {new Date(team.created_at).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-muted-foreground">Description</dt>
              <dd className="mt-1 whitespace-pre-wrap text-sm">
                {team.description ?? "No description provided."}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link href="/teams">Back to teams</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard">Dashboard</Link>
        </Button>
      </div>
    </main>
  );
}
