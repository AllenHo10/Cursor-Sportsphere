import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .single();

  const name = profile?.name ?? user.email ?? "Player";

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Welcome back, {name}</p>
        </div>
        <form action="/logout" method="post">
          <Button type="submit" variant="outline">
            Log out
          </Button>
        </form>
      </header>
      <section className="rounded-lg border p-6">
        <h2 className="mb-2 text-lg font-medium">Quick links</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Manage your teams and matches from here.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link href="/profile">Edit profile</Link>
          </Button>
          <Button asChild>
            <Link href="/teams">Manage teams</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
