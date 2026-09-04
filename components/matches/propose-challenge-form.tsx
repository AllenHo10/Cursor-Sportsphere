"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { proposeChallenge } from "@/lib/matches/challenge";
import { localDateInputValue } from "@/lib/matches/parse";
import {
  challengeDetailsSchema,
  isFutureDateTime,
  type ChallengeDetailsFormValues,
} from "@/lib/matches/schema";
import { createClient } from "@/lib/supabase/client";
import type { LeadershipTeam } from "@/lib/types/match";
import { nativeSelectClassName, nativeTextareaClassName } from "@/lib/utils";

interface ProposeChallengeFormProps {
  userId: string;
  opponent: {
    id: string;
    name: string;
    location: string | null;
    sport: string;
  };
  challengerTeams: LeadershipTeam[];
  existingPendingMatchId?: string | null;
}

export function ProposeChallengeForm({
  userId,
  opponent,
  challengerTeams,
  existingPendingMatchId = null,
}: ProposeChallengeFormProps) {
  const router = useRouter();
  const eligibleTeams = useMemo(
    () =>
      challengerTeams.filter(
        (team) => team.id !== opponent.id && team.sport === opponent.sport
      ),
    [challengerTeams, opponent.id, opponent.sport]
  );
  const [saveError, setSaveError] = useState<string | null>(null);

  const form = useForm<ChallengeDetailsFormValues>({
    resolver: zodResolver(challengeDetailsSchema),
    defaultValues: {
      home_team_id: eligibleTeams[0]?.id ?? "",
      date: localDateInputValue(),
      time: "18:00",
      venue: opponent.location ?? "",
      format: "indoor_6v6",
      notes: "",
    },
  });

  const isSubmitting = form.formState.isSubmitting;

  async function onSubmit(values: ChallengeDetailsFormValues) {
    setSaveError(null);

    if (!isFutureDateTime(values.date, values.time)) {
      form.setError("date", { message: "Match must be scheduled in the future" });
      return;
    }

    const { data, error } = await proposeChallenge(createClient(), {
      homeTeamId: values.home_team_id,
      awayTeamId: opponent.id,
      date: values.date,
      time: values.time,
      venue: values.venue,
      format: values.format,
      notes: values.notes,
      createdBy: userId,
    });

    if (error || !data) {
      setSaveError(error?.message ?? "Could not send the challenge.");
      return;
    }

    router.push(`/matches/${data.id}`);
    router.refresh();
  }

  if (existingPendingMatchId) {
    return (
      <Card id="challenge-form">
        <CardHeader>
          <CardTitle>Challenge {opponent.name}</CardTitle>
          <CardDescription>
            A pending challenge already exists with this team.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href={`/matches/${existingPendingMatchId}`}>
              View pending challenge
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (eligibleTeams.length === 0) {
    return (
      <Card id="challenge-form">
        <CardHeader>
          <CardTitle>Challenge {opponent.name}</CardTitle>
          <CardDescription>
            Only captains and co-captains can propose a match, and both teams
            must play the same sport.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card id="challenge-form">
      <CardHeader>
        <CardTitle>Challenge {opponent.name}</CardTitle>
        <CardDescription>
          Propose a match with a date, time, venue, and format. Their captain or
          co-captain can accept, decline, or request changes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="home_team_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Your team <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <select
                      className={nativeSelectClassName}
                      disabled={isSubmitting || eligibleTeams.length === 1}
                      value={field.value}
                      onChange={(event) => field.onChange(event.target.value)}
                    >
                      {eligibleTeams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Date <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        min={localDateInputValue()}
                        disabled={isSubmitting}
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
                    <FormLabel>
                      Time <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input type="time" disabled={isSubmitting} {...field} />
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
                  <FormLabel>
                    Venue <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Gym, court, or park"
                      disabled={isSubmitting}
                      {...field}
                    />
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
                  <FormLabel>
                    Match format <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <select
                      className={nativeSelectClassName}
                      disabled={isSubmitting}
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
                      placeholder="Warm-up time, bringing a ball, or anything else they should know"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {saveError ? (
              <p className="text-sm font-medium text-destructive" role="alert">
                {saveError}
              </p>
            ) : null}

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" />
                  Sending...
                </>
              ) : (
                "Send challenge"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
