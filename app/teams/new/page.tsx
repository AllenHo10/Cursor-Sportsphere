import { redirect } from "next/navigation";

import { CreateTeamForm } from "@/components/teams/create-team-form";
import { PageShell } from "@/components/layout/page-shell";
import { createClient } from "@/lib/supabase/server";

export default async function NewTeamPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/teams/new");
  }

  return (
    <PageShell>
      <header>
        <h1 className="text-2xl font-semibold">New team</h1>
        <p className="text-sm text-muted-foreground">
          Create a volleyball team and become its captain.
        </p>
      </header>
      <CreateTeamForm userId={user.id} />
    </PageShell>
  );
}
