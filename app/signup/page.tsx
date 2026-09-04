import { SignupForm } from "@/components/auth/signup-form";
import { PageShell } from "@/components/layout/page-shell";

export default function SignupPage() {
  return (
    <PageShell variant="auth">
      <SignupForm />
    </PageShell>
  );
}
