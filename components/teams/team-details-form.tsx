"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";

import { TeamLogoUpload } from "@/components/teams/team-logo-upload";
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
import { SKILL_LEVELS, TEAM_TYPES } from "@/lib/constants/team";
import { createTeam, updateTeamDetails } from "@/lib/teams/details";
import {
  teamDetailsSchema,
  type TeamDetailsFormValues,
} from "@/lib/teams/schema";
import { createClient } from "@/lib/supabase/client";
import type { SkillLevel } from "@/lib/types/profile";
import type { Team, TeamType } from "@/lib/types/team";
import { nativeSelectClassName, nativeTextareaClassName } from "@/lib/utils";

interface TeamDetailsFormProps {
  userId: string;
  team?: Team;
}

export function TeamDetailsForm({ userId, team }: TeamDetailsFormProps) {
  const router = useRouter();
  const isEdit = Boolean(team);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const form = useForm<TeamDetailsFormValues>({
    resolver: zodResolver(teamDetailsSchema),
    defaultValues: {
      name: team?.name ?? "",
      logo_url: team?.logo_url ?? null,
      location: team?.location ?? "",
      description: team?.description ?? "",
      team_type: team?.team_type ?? "recreational",
      skill_level: team?.skill_level ?? null,
    },
  });

  const isSubmitting = form.formState.isSubmitting;

  async function onSubmit(values: TeamDetailsFormValues) {
    setSaveError(null);
    setSaveSuccess(false);

    const supabase = createClient();

    if (team) {
      const { error } = await updateTeamDetails(supabase, team.id, values);
      if (error) {
        setSaveError(error.message);
        return;
      }
      setSaveSuccess(true);
      router.refresh();
      return;
    }

    const { data, error } = await createTeam(supabase, userId, values);
    if (error || !data) {
      setSaveError(error?.message ?? "Could not create the team.");
      return;
    }

    router.push(`/teams/${data.id}`);
    router.refresh();
  }

  return (
    <Card id={isEdit ? "edit-team" : undefined}>
      <CardHeader>
        <CardTitle>{isEdit ? "Edit team" : "Create team"}</CardTitle>
        <CardDescription>
          {isEdit
            ? "Update your team name, logo, location, description, type, and skill level."
            : "Set up a new volleyball team. You will be added as captain automatically."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="logo_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Team logo</FormLabel>
                  <FormControl>
                    <TeamLogoUpload
                      userId={userId}
                      value={field.value}
                      onChange={field.onChange}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Team name <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Spike Squad"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormItem>
              <FormLabel htmlFor="team-sport">Sport</FormLabel>
              <Input id="team-sport" value="Volleyball" disabled readOnly />
              <p className="text-xs text-muted-foreground">
                Only volleyball teams are supported for now.
              </p>
            </FormItem>

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="City, State or Region"
                      autoComplete="address-level2"
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <textarea
                      className={nativeTextareaClassName}
                      placeholder="Tell others about your team..."
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
              name="team_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Team type <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <select
                      className={nativeSelectClassName}
                      disabled={isSubmitting}
                      value={field.value}
                      onChange={(event) =>
                        field.onChange(event.target.value as TeamType)
                      }
                    >
                      {TEAM_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
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
              name="skill_level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Skill level</FormLabel>
                  <FormControl>
                    <select
                      className={nativeSelectClassName}
                      disabled={isSubmitting}
                      value={field.value ?? ""}
                      onChange={(event) => {
                        const value = event.target.value;
                        field.onChange(
                          value === "" ? null : (value as SkillLevel)
                        );
                      }}
                    >
                      <option value="">Not specified</option>
                      {SKILL_LEVELS.map((level) => (
                        <option key={level.value} value={level.value}>
                          {level.label}
                        </option>
                      ))}
                    </select>
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
            {saveSuccess ? (
              <p className="text-sm font-medium" role="status">
                Team details saved.
              </p>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" />
                    {isEdit ? "Saving..." : "Creating..."}
                  </>
                ) : isEdit ? (
                  "Save team"
                ) : (
                  "Create team"
                )}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href={team ? `/teams/${team.id}` : "/teams"}>Cancel</Link>
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
