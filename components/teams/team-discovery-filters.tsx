"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Loader2, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SKILL_LEVELS, TEAM_SPORTS, TEAM_TYPES } from "@/lib/constants/team";
import { nativeSelectClassName } from "@/lib/utils";

interface TeamDiscoveryFiltersProps {
  profileLocation: string | null;
}

export function TeamDiscoveryFilters({
  profileLocation,
}: TeamDiscoveryFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const sport = searchParams.get("sport") ?? "";
  const location = searchParams.get("location") ?? "";
  const nearMe = searchParams.get("nearMe") === "1";
  const teamType = searchParams.get("teamType") ?? "";
  const skillLevel = searchParams.get("skillLevel") ?? "";

  function applyFilters(formData: FormData) {
    const params = new URLSearchParams();

    const nextSport = String(formData.get("sport") ?? "").trim();
    const nextLocation = String(formData.get("location") ?? "").trim();
    const nextNearMe = formData.get("nearMe") === "on";
    const nextTeamType = String(formData.get("teamType") ?? "").trim();
    const nextSkillLevel = String(formData.get("skillLevel") ?? "").trim();

    if (nextSport) params.set("sport", nextSport);
    if (nextLocation) params.set("location", nextLocation);
    if (nextNearMe) params.set("nearMe", "1");
    if (nextTeamType) params.set("teamType", nextTeamType);
    if (nextSkillLevel) params.set("skillLevel", nextSkillLevel);

    const query = params.toString();
    startTransition(() => {
      router.push(query ? `/teams/discover?${query}` : "/teams/discover");
    });
  }

  function clearFilters() {
    startTransition(() => {
      router.push("/teams/discover");
    });
  }

  const hasActiveFilters =
    Boolean(sport || location || nearMe || teamType || skillLevel);

  return (
    <section className="rounded-lg border bg-card p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-lg font-medium">Filters</h2>
        {isPending ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
      </div>

      <form
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        aria-busy={isPending}
        onSubmit={(event) => {
          event.preventDefault();
          applyFilters(new FormData(event.currentTarget));
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="sport">Sport</Label>
          <select
            id="sport"
            name="sport"
            defaultValue={sport}
            className={nativeSelectClassName}
          >
            <option value="">All sports</option>
            {TEAM_SPORTS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            name="location"
            defaultValue={location}
            placeholder="City, state, or region"
            autoComplete="address-level2"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="teamType">Team type</Label>
          <select
            id="teamType"
            name="teamType"
            defaultValue={teamType}
            className={nativeSelectClassName}
          >
            <option value="">All types</option>
            {TEAM_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="skillLevel">Skill level</Label>
          <select
            id="skillLevel"
            name="skillLevel"
            defaultValue={skillLevel}
            className={nativeSelectClassName}
          >
            <option value="">All levels</option>
            {SKILL_LEVELS.map((level) => (
              <option key={level.value} value={level.value}>
                {level.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end sm:col-span-2 lg:col-span-1">
          <label className="flex items-start gap-2 rounded-md border bg-secondary px-3 py-2 text-sm">
            <input
              type="checkbox"
              name="nearMe"
              defaultChecked={nearMe}
              disabled={!profileLocation}
              className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
            />
            <span>
              <span className="font-medium">Near my location</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {profileLocation
                  ? `Matches teams near ${profileLocation}`
                  : "Add a location to your profile to use this filter"}
              </span>
            </span>
          </label>
        </div>

        <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-3">
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="animate-spin" />
                Applying...
              </>
            ) : (
              "Apply filters"
            )}
          </Button>
          {hasActiveFilters ? (
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={clearFilters}
            >
              Clear filters
            </Button>
          ) : null}
        </div>
      </form>
    </section>
  );
}
