import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-start justify-center gap-6 p-6">
      <div>
        <h1 className="text-3xl font-semibold">SportSphere</h1>
        <p className="mt-2 text-muted-foreground">
          Team coordination for volleyball and beyond.
        </p>
      </div>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/login">Log in</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/signup">Sign up</Link>
        </Button>
      </div>
    </main>
  );
}