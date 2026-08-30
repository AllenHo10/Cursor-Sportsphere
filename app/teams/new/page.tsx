import Link from "next/link";
import { redirect } from "next/navigation";

import { CreateTeamForm } from "@/components/teams/create-team-form";
import { Button } from "@/components/ui/button";
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
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">New team</h1>
          <p className="text-sm text-muted-foreground">
            Create a volleyball team and become its captain.
          </p>
        </div>
        <form action="/logout" method="post">
          <Button type="submit" variant="outline">
            Log out
          </Button>
        </form>
      </header>
      <CreateTeamForm userId={user.id} />
    </main>
  );
}
