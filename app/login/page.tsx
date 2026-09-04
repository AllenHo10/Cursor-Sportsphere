import { Suspense } from "react";

import { LoginForm } from "@/components/auth/login-form";
import { LoadingState, PageShell } from "@/components/layout/page-shell";

export default function LoginPage() {
  return (
    <PageShell variant="auth">
      <Suspense fallback={<LoadingState>Loading sign-in form...</LoadingState>}>
        <LoginForm />
      </Suspense>
    </PageShell>
  );
}
