"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

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
import {
  DEFAULT_TEAM_SPORT,
  SKILL_LEVELS,
  TEAM_TYPES,
} from "@/lib/constants/team";
import { createClient } from "@/lib/supabase/client";
import type { SkillLevel } from "@/lib/types/profile";
import type { TeamType } from "@/lib/types/team";
import { nativeSelectClassName, nativeTextareaClassName } from "@/lib/utils";

const teamTypeValues = [
  "recreational",
  "competitive",
  "league",
  "pickup",
] as const;

const skillLevelValues = ["beginner", "intermediate", "advanced", "open"] as const;

const createTeamSchema = z.object({
  name: z.string().trim().min(1, "Team name is required"),
  logo_url: z.string().nullable(),
  location: z.string(),
  description: z.string(),
  team_type: z.enum(teamTypeValues),
  skill_level: z.enum(skillLevelValues).nullable(),
});

type CreateTeamFormValues = z.infer<typeof createTeamSchema>;

interface CreateTeamFormProps {
  userId: string;
}

export function CreateTeamForm({ userId }: CreateTeamFormProps) {
  const router = useRouter();
  const [saveError, setSaveError] = useState<string | null>(null);

  const form = useForm<CreateTeamFormValues>({
    resolver: zodResolver(createTeamSchema),
    defaultValues: {
      name: "",
      logo_url: null,
      location: "",
      description: "",
      team_type: "recreational",
      skill_level: null,
    },
  });

  const isSubmitting = form.formState.isSubmitting;

  async function onSubmit(values: CreateTeamFormValues) {
    setSaveError(null);

    const supabase = createClient();
    const payload = {
      name: values.name.trim(),
      sport: DEFAULT_TEAM_SPORT,
      logo_url: values.logo_url,
      location: values.location.trim() || null,
      description: values.description.trim() || null,
      team_type: values.team_type as TeamType,
      skill_level: values.skill_level as SkillLevel | null,
      captain_id: userId,
    };

    const { data, error } = await supabase
      .from("teams")
      .insert(payload)
      .select("id")
      .single();

    if (error) {
      setSaveError(error.message);
      return;
    }

    router.push(`/teams/${data.id}`);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create team</CardTitle>
        <CardDescription>
          Set up a new volleyball team. You will be added as captain automatically.
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

            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create team"
                )}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/teams">Cancel</Link>
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
