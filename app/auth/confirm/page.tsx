import { Suspense } from "react";

import { AuthConfirm } from "@/components/auth/auth-confirm";
import { LoadingState, PageShell } from "@/components/layout/page-shell";

export default function AuthConfirmPage() {
  return (
    <Suspense
      fallback={
        <PageShell variant="auth">
          <LoadingState>Finishing sign up...</LoadingState>
        </PageShell>
      }
    >
      <AuthConfirm />
    </Suspense>
  );
}
