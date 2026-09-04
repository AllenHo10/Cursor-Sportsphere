"use client";

import { useEffect } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <PageShell>
      <header>
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {error.message || "An unexpected error occurred. Try again."}
        </p>
      </header>
      <Button type="button" onClick={reset}>
        Try again
      </Button>
    </PageShell>
  );
}
