import Link from "next/link";
import { redirect } from "next/navigation";

import { ProfileForm } from "@/components/profile/profile-form";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import type { Availability, Profile, SkillLevel } from "@/lib/types/profile";

function parseProfile(row: Record<string, unknown>): Profile {
  return {
    id: row.id as string,
    name: row.name as string,
    profile_image_url: (row.profile_image_url as string | null) ?? null,
    location: (row.location as string | null) ?? null,
    sports_interests: (row.sports_interests as string[]) ?? [],
    preferred_position: (row.preferred_position as string | null) ?? null,
    skill_level: (row.skill_level as SkillLevel | null) ?? null,
    availability: (row.availability as Availability) ?? {},
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/profile");
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !data) {
    return (
      <PageShell>
        <header>
          <h1 className="text-2xl font-semibold">Profile</h1>
          <p className="text-sm text-muted-foreground">
            We could not load your profile.
          </p>
        </header>
        <section className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          {error?.message ?? "Profile not found."}
        </section>
        <Button asChild variant="outline" className="w-fit">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </PageShell>
    );
  }

  const profile = parseProfile(data);

  return (
    <PageShell>
      <header>
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="text-sm text-muted-foreground">
          View and edit your player profile.
        </p>
      </header>
      <ProfileForm profile={profile} />
    </PageShell>
  );
}
