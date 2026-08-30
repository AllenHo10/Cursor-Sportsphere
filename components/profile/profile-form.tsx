"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { ProfileImageUpload } from "@/components/profile/profile-image-upload";
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
  COMMON_SPORTS,
  DAYS_OF_WEEK,
  SKILL_LEVELS,
  TIME_SLOTS,
} from "@/lib/constants/profile";
import { createClient } from "@/lib/supabase/client";
import type { Availability, Profile, SkillLevel } from "@/lib/types/profile";
import { cn } from "@/lib/utils";

const skillLevelValues = ["beginner", "intermediate", "advanced", "open"] as const;

const profileSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  profile_image_url: z.string().nullable(),
  location: z.string(),
  sports_interests: z.array(z.string()),
  preferred_position: z.string(),
  skill_level: z.enum(skillLevelValues).nullable(),
  availability: z.record(z.array(z.enum(["morning", "afternoon", "evening"]))),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface ProfileFormProps {
  profile: Profile;
}

function emptyAvailability(): Availability {
  return {};
}

function normalizeAvailability(raw: Availability): Availability {
  const normalized: Availability = {};

  for (const day of DAYS_OF_WEEK) {
    const slots = raw[day.value];
    if (slots && slots.length > 0) {
      normalized[day.value] = slots;
    }
  }

  return normalized;
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const router = useRouter();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [sportInput, setSportInput] = useState("");

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: profile.name,
      profile_image_url: profile.profile_image_url,
      location: profile.location ?? "",
      sports_interests: profile.sports_interests ?? [],
      preferred_position: profile.preferred_position ?? "",
      skill_level: profile.skill_level,
      availability: profile.availability ?? emptyAvailability(),
    },
  });

  const isSubmitting = form.formState.isSubmitting;
  const sportsInterests = form.watch("sports_interests");
  const availability = form.watch("availability");

  function addSportInterest(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;

    const current = form.getValues("sports_interests");
    const exists = current.some(
      (sport) => sport.toLowerCase() === trimmed.toLowerCase()
    );

    if (!exists) {
      form.setValue("sports_interests", [...current, trimmed], {
        shouldDirty: true,
      });
    }

    setSportInput("");
  }

  function removeSportInterest(sport: string) {
    form.setValue(
      "sports_interests",
      form.getValues("sports_interests").filter((item) => item !== sport),
      { shouldDirty: true }
    );
  }

  function toggleAvailabilitySlot(
    day: keyof Availability,
    slot: "morning" | "afternoon" | "evening"
  ) {
    const current = form.getValues("availability");
    const daySlots = current[day] ?? [];
    const nextSlots = daySlots.includes(slot)
      ? daySlots.filter((item) => item !== slot)
      : [...daySlots, slot];

    const nextAvailability = { ...current };

    if (nextSlots.length === 0) {
      delete nextAvailability[day];
    } else {
      nextAvailability[day] = nextSlots;
    }

    form.setValue("availability", nextAvailability, { shouldDirty: true });
  }

  async function onSubmit(values: ProfileFormValues) {
    setSaveError(null);
    setSaveSuccess(false);

    const supabase = createClient();
    const payload = {
      name: values.name.trim(),
      profile_image_url: values.profile_image_url,
      location: values.location.trim() || null,
      sports_interests: values.sports_interests,
      preferred_position: values.preferred_position.trim() || null,
      skill_level: values.skill_level as SkillLevel | null,
      availability: normalizeAvailability(values.availability),
    };

    const { error } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", profile.id);

    if (error) {
      setSaveError(error.message);
      return;
    }

    setSaveSuccess(true);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Player profile</CardTitle>
        <CardDescription>
          Update your public player details. Only your name is required.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="profile_image_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Profile photo</FormLabel>
                  <FormControl>
                    <ProfileImageUpload
                      userId={profile.id}
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
                    Name <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      autoComplete="name"
                      placeholder="Alex Morgan"
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
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="City, State or Region"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormItem>
              <FormLabel>Sports interests</FormLabel>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={sportInput}
                    placeholder="Add a sport"
                    disabled={isSubmitting}
                    onChange={(event) => setSportInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addSportInterest(sportInput);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSubmitting}
                    onClick={() => addSportInterest(sportInput)}
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {COMMON_SPORTS.filter(
                    (sport) =>
                      !sportsInterests.some(
                        (item) => item.toLowerCase() === sport.toLowerCase()
                      )
                  ).map((sport) => (
                    <Button
                      key={sport}
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isSubmitting}
                      onClick={() => addSportInterest(sport)}
                    >
                      + {sport}
                    </Button>
                  ))}
                </div>
                {sportsInterests.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {sportsInterests.map((sport) => (
                      <span
                        key={sport}
                        className="inline-flex items-center gap-1 rounded-full border bg-secondary px-3 py-1 text-sm"
                      >
                        {sport}
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground"
                          disabled={isSubmitting}
                          onClick={() => removeSportInterest(sport)}
                          aria-label={`Remove ${sport}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Optional. Add sports you play or follow.
                  </p>
                )}
              </div>
            </FormItem>

            <FormField
              control={form.control}
              name="preferred_position"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred position</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Forward, Point guard, Goalkeeper"
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
              name="skill_level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Skill level</FormLabel>
                  <FormControl>
                    <select
                      className={cn(
                        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      )}
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

            <FormItem>
              <FormLabel>Availability</FormLabel>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full min-w-[28rem] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-3 py-2 text-left font-medium">Day</th>
                      {TIME_SLOTS.map((slot) => (
                        <th
                          key={slot.value}
                          className="px-3 py-2 text-center font-medium"
                        >
                          {slot.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {DAYS_OF_WEEK.map((day) => (
                      <tr key={day.value} className="border-b last:border-0">
                        <td className="px-3 py-2 font-medium">{day.label}</td>
                        {TIME_SLOTS.map((slot) => {
                          const checked =
                            availability[day.value]?.includes(slot.value) ??
                            false;

                          return (
                            <td key={slot.value} className="px-3 py-2 text-center">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-input accent-primary"
                                disabled={isSubmitting}
                                checked={checked}
                                onChange={() =>
                                  toggleAvailabilitySlot(day.value, slot.value)
                                }
                                aria-label={`${day.label} ${slot.label}`}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground">
                Optional. Select when you are generally available to play.
              </p>
            </FormItem>

            {saveError ? (
              <p className="text-sm font-medium text-destructive" role="alert">
                {saveError}
              </p>
            ) : null}
            {saveSuccess ? (
              <p className="text-sm font-medium text-primary" role="status">
                Profile saved successfully.
              </p>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save profile"
                )}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/dashboard">Back to dashboard</Link>
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
