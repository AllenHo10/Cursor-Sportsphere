"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { invitePlayerByEmail } from "@/lib/teams/email-invite";

const emailInviteSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

type EmailInviteValues = z.infer<typeof emailInviteSchema>;

interface InviteByEmailFormProps {
  teamId: string;
}

export function InviteByEmailForm({ teamId }: InviteByEmailFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const form = useForm<EmailInviteValues>({
    resolver: zodResolver(emailInviteSchema),
    defaultValues: {
      email: "",
    },
  });

  const isSubmitting = form.formState.isSubmitting;

  async function onSubmit(values: EmailInviteValues) {
    setError(null);
    setSuccess(null);

    const result = await invitePlayerByEmail(teamId, values.email);

    if (result.error) {
      setError(result.error);
      return;
    }

    setSuccess(result.message ?? "Invite sent.");
    form.reset();
    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email address</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder="player@example.com"
                  disabled={isSubmitting}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="text-sm text-muted-foreground" role="status">
            {success}
          </p>
        ) : null}

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Mail />
          )}
          {isSubmitting ? "Sending invite..." : "Send email invite"}
        </Button>
      </form>
    </Form>
  );
}
