"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { LoadingState, PageShell } from "@/components/layout/page-shell";
import { safeInternalPath } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/client";

export function AuthConfirm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeInternalPath(searchParams.get("next"));
  const code = searchParams.get("code");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let finished = false;
    let timeoutId: number | undefined;
    let unsubscribe: (() => void) | undefined;

    async function complete(hasSession: boolean) {
      if (finished || cancelled) {
        return;
      }

      finished = true;

      if (hasSession) {
        await supabase.rpc("apply_pending_email_invites");
      }

      if (cancelled) {
        return;
      }

      router.replace(next);
      router.refresh();
    }

    async function run() {
      if (code) {
        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);

        if (cancelled) {
          return;
        }

        if (exchangeError) {
          setError(exchangeError.message);
          return;
        }

        await complete(true);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (cancelled) {
        return;
      }

      if (session) {
        await complete(true);
        return;
      }

      const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
        if (newSession) {
          void complete(true);
        }
      });
      unsubscribe = () => data.subscription.unsubscribe();
      timeoutId = window.setTimeout(() => {
        void complete(false);
      }, 4000);
    }

    void run();

    return () => {
      cancelled = true;
      unsubscribe?.();
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [code, next, router]);

  return (
    <PageShell variant="auth">
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : (
        <LoadingState>Finishing sign up...</LoadingState>
      )}
    </PageShell>
  );
}
