import { Suspense } from "react";

import { SignupForm } from "@/components/auth/signup-form";
import { LoadingState, PageShell } from "@/components/layout/page-shell";

export default function SignupPage() {
  return (
    <PageShell variant="auth">
      <Suspense fallback={<LoadingState>Loading sign-up form...</LoadingState>}>
        <SignupForm />
      </Suspense>
    </PageShell>
  );
}
