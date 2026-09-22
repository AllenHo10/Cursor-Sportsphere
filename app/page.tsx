import Link from "next/link";

import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <PageShell variant="landing">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">SportSphere</h1>
        <p className="mt-2 text-muted-foreground">
          Team coordination for volleyball and beyond.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/login">Log in</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/signup">Sign up</Link>
        </Button>
      </div>
    </PageShell>
  );
}
