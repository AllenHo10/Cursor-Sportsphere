"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Loader2, X } from "lucide-react";
import { useForm } from "react-hook-form";

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
import { MATCH_FORMATS } from "@/lib/constants/match";
import {
  acceptChallenge,
  declineChallenge,
  requestChallengeChanges,
  updateOwnChallengeProposal,
} from "@/lib/matches/challenge";
import { localDateInputValue, asMatchFormat, splitScheduledAt } from "@/lib/matches/parse";
import {
  challengeDetailsSchema,
  isFutureDateTime,
  type ChallengeDetailsFormValues,
} from "@/lib/matches/schema";
import { createClient } from "@/lib/supabase/client";
import type { Match } from "@/lib/types/match";
import { nativeSelectClassName, nativeTextareaClassName } from "@/lib/utils";

interface ChallengeResponseActionsProps {
  match: Match;
  respondingTeamId: string;
  canRespond: boolean;
  canEditProposal: boolean;
  defaultOpenChanges?: boolean;
}

export function ChallengeResponseActions({
  match,
  respondingTeamId,
  canRespond,
  canEditProposal,
  defaultOpenChanges = false,
}: ChallengeResponseActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<
    "accept" | "decline" | "changes" | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [showChanges, setShowChanges] = useState(defaultOpenChanges);
  const scheduled = splitScheduledAt(match.scheduled_at);

  const form = useForm<ChallengeDetailsFormValues>({
    resolver: zodResolver(challengeDetailsSchema),
    defaultValues: {
      home_team_id: respondingTeamId,
      date: scheduled.date,
      time: scheduled.time,
      venue: match.venue ?? "",
      format: asMatchFormat(match.format),
      notes: match.notes ?? "",
    },
  });

  async function runStatusAction(
    action: "accept" | "decline",
    handler: () => Promise<{ error: Error | null }>
  ) {
    setIsLoading(action);
    setError(null);

    const { error: actionError } = await handler();
    if (actionError) {
      setError(actionError.message);
      setIsLoading(null);
      return;
    }

    router.refresh();
    setIsLoading(null);
  }

  async function onSubmitChanges(values: ChallengeDetailsFormValues) {
    setIsLoading("changes");
    setError(null);

    if (!isFutureDateTime(values.date, values.time)) {
      form.setError("date", { message: "Match must be scheduled in the future" });
      setIsLoading(null);
      return;
    }

    const { error: actionError } = canRespond
      ? await requestChallengeChanges(
          createClient(),
          match.id,
          respondingTeamId,
          values
        )
      : await updateOwnChallengeProposal(createClient(), match.id, values);

    if (actionError) {
      setError(actionError.message);
      setIsLoading(null);
      return;
    }

    setShowChanges(false);
    router.refresh();
    setIsLoading(null);
  }

  if (match.status !== "challenge_pending" || (!canRespond && !canEditProposal)) {
    return null;
  }

  return (
    <div className="space-y-4">
      {canRespond ? (
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() =>
              runStatusAction("accept", () =>
                acceptChallenge(createClient(), match.id)
              )
            }
            disabled={isLoading !== null}
          >
            {isLoading === "accept" ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Check />
            )}
            Accept
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              runStatusAction("decline", () =>
                declineChallenge(createClient(), match.id)
              )
            }
            disabled={isLoading !== null}
          >
            {isLoading === "decline" ? (
              <Loader2 className="animate-spin" />
            ) : (
              <X />
            )}
            Decline
          </Button>
          <Button
            variant="secondary"
            type="button"
            onClick={() => setShowChanges((open) => !open)}
            disabled={isLoading !== null}
          >
            {showChanges ? "Hide change form" : "Request changes"}
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() =>
              runStatusAction("decline", () =>
                declineChallenge(createClient(), match.id)
              )
            }
            disabled={isLoading !== null}
          >
            {isLoading === "decline" ? (
              <Loader2 className="animate-spin" />
            ) : (
              <X />
            )}
            Withdraw challenge
          </Button>
          <Button
            variant="secondary"
            type="button"
            onClick={() => setShowChanges((open) => !open)}
            disabled={isLoading !== null}
          >
            {showChanges ? "Hide edit form" : "Update proposal"}
          </Button>
        </div>
      )}

      {showChanges ? (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmitChanges)}
            className="space-y-4 rounded-lg border bg-card p-4 shadow-sm"
          >
            <p className="text-sm text-muted-foreground">
              {canRespond
                ? "Suggest different details. The other team will need to accept, decline, or counter."
                : "Update your proposal. The other team will be notified."}
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        min={localDateInputValue()}
                        disabled={isLoading !== null}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time</FormLabel>
                    <FormControl>
                      <Input
                        type="time"
                        disabled={isLoading !== null}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="venue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Venue</FormLabel>
                  <FormControl>
                    <Input disabled={isLoading !== null} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="format"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Match format</FormLabel>
                  <FormControl>
                    <select
                      className={nativeSelectClassName}
                      disabled={isLoading !== null}
                      value={field.value}
                      onChange={(event) => field.onChange(event.target.value)}
                    >
                      {MATCH_FORMATS.map((format) => (
                        <option key={format.value} value={format.value}>
                          {format.label}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <textarea
                      className={nativeTextareaClassName}
                      disabled={isLoading !== null}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading !== null}>
              {isLoading === "changes" ? (
                <>
                  <Loader2 className="animate-spin" />
                  Saving...
                </>
              ) : canRespond ? (
                "Send requested changes"
              ) : (
                "Update proposal"
              )}
            </Button>
          </form>
        </Form>
      ) : null}

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
