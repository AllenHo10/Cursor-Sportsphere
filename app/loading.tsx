import { PageShell, LoadingState } from "@/components/layout/page-shell";

export default function Loading() {
  return (
    <PageShell>
      <LoadingState>Loading page...</LoadingState>
    </PageShell>
  );
}
