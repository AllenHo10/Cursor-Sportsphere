"use server";

import { headers } from "next/headers";

import { createAdminClient, getServiceRoleKey } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

interface InviteByEmailResult {
  kind: "existing" | "email";
  already?: boolean;
}

interface ExistingInviteResult extends InviteByEmailResult {
  kind: "existing";
}

interface EmailInviteResult extends InviteByEmailResult {
  kind: "email";
  inviteId: string;
}

function parseInviteResult(
  data: unknown
): ExistingInviteResult | EmailInviteResult | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const record = data as Record<string, unknown>;

  if (record.kind === "existing") {
    return {
      kind: "existing",
      already: Boolean(record.already),
    };
  }

  if (record.kind === "email" && typeof record.invite_id === "string") {
    return {
      kind: "email",
      inviteId: record.invite_id,
      already: Boolean(record.already),
    };
  }

  return null;
}

async function getRequestOrigin() {
  const headerStore = await headers();
  const origin = headerStore.get("origin");

  if (origin) {
    return origin;
  }

  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const proto = headerStore.get("x-forwarded-proto") ?? "http";

  if (host) {
    return `${proto}://${host}`;
  }

  return "http://127.0.0.1:3000";
}

async function sendAuthInviteEmail(email: string, teamId: string, inviteId: string) {
  if (!getServiceRoleKey()) {
    return {
      sent: false,
      error:
        "Invite saved, but the signup email was not sent. Set SUPABASE_SERVICE_ROLE_KEY on the server to send invite emails through Supabase Auth.",
    };
  }

  const origin = await getRequestOrigin();
  const redirectTo = `${origin}/auth/confirm?next=${encodeURIComponent(`/teams/${teamId}`)}`;
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: {
      team_email_invite_id: inviteId,
      team_id: teamId,
    },
    redirectTo,
  });

  if (!error) {
    return { sent: true, error: null };
  }

  const message = error.message.toLowerCase();
  const alreadyRegistered =
    message.includes("already") ||
    message.includes("registered") ||
    message.includes("exists");

  if (alreadyRegistered) {
    return { sent: true, error: null };
  }

  return { sent: false, error: error.message };
}

export async function invitePlayerByEmail(teamId: string, email: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to invite players." };
  }

  const { data, error } = await supabase.rpc("invite_player_by_email", {
    p_team_id: teamId,
    p_email: email,
  });

  if (error) {
    return { error: error.message };
  }

  const result = parseInviteResult(data);

  if (!result) {
    return { error: "Could not create the invite." };
  }

  if (result.kind === "existing") {
    return {
      error: null,
      kind: "existing" as const,
      message: result.already
        ? "This player already has a pending invite."
        : "Invited an existing player. They can accept from their teams list.",
    };
  }

  const send = await sendAuthInviteEmail(
    email.trim().toLowerCase(),
    teamId,
    result.inviteId
  );

  if (send.sent) {
    return {
      error: null,
      kind: "email" as const,
      message: result.already
        ? "Invite email resent. They can create an account with that address to see the team invite."
        : "Invite email sent. When they sign up with that address, they will see a pending team invite.",
    };
  }

  const origin = await getRequestOrigin();
  const signupUrl = `${origin}/signup?invite=${result.inviteId}`;

  return {
    error: null,
    kind: "email" as const,
    message: `${send.error ?? "Invite saved, but the email could not be sent."} They can sign up at ${signupUrl} using ${email.trim().toLowerCase()}.`,
  };
}
