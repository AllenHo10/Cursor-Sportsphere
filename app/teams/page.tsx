import Link from "next/link";
import { redirect } from "next/navigation";
import { Shield } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import type { SkillLevel } from "@/lib/types/profile";
import type { Team, TeamType } from "@/lib/types/team";

function parseTeam(row: Record<string, unknown>): Team {
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
  };
}

export default async function TeamsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/teams");
  }

  const { data, error } = await supabase
    .from("team_members")
    .select(
      `
        role,
        teams (*)
      `
    )
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  const teams =
    data
      ?.map((membership) => {
        const teamRow = membership.teams as unknown;
        if (!teamRow || Array.isArray(teamRow)) return null;

        return {
          role: membership.role as string,
          team: parseTeam(teamRow as Record<string, unknown>),
        };
      })
      .filter(
        (item): item is { role: string; team: Team } => item !== null
      ) ?? [];

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Teams</h1>
          <p className="text-sm text-muted-foreground">
            Create and manage your volleyball teams.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild>
            <Link href="/teams/new">Create team</Link>
          </Button>
          <form action="/logout" method="post">
            <Button type="submit" variant="outline">
              Log out
            </Button>
          </form>
        </div>
      </header>

      <section className="rounded-lg border p-6">
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error.message}
          </p>
        ) : teams.length === 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You are not on any teams yet. Create one to get started.
            </p>
            <Button asChild>
              <Link href="/teams/new">Create your first team</Link>
            </Button>
          </div>
        ) : (
          <ul className="divide-y">
            {teams.map(({ role, team }) => (
              <li key={team.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
                  {team.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={team.logo_url}
                      alt={`${team.name} logo`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Shield className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/teams/${team.id}`}
                    className="font-medium hover:underline"
                  >
                    {team.name}
                  </Link>
                  <p className="truncate text-sm text-muted-foreground">
                    {[team.location, role].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/teams/${team.id}`}>View</Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Button asChild variant="outline" className="w-fit">
        <Link href="/dashboard">Back to dashboard</Link>
      </Button>
    </main>
  );
}
