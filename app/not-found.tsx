import Link from "next/link";

import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <PageShell>
      <header>
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          That page does not exist or you do not have access to it.
        </p>
      </header>
      <Button asChild>
        <Link href="/dashboard">Back to dashboard</Link>
      </Button>
    </PageShell>
  );
}
