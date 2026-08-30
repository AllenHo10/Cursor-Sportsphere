export type SkillLevel = "beginner" | "intermediate" | "advanced" | "open";

export type AvailabilitySlot = "morning" | "afternoon" | "evening";

export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type Availability = Partial<Record<DayOfWeek, AvailabilitySlot[]>>;

export interface Profile {
  id: string;
  name: string;
  profile_image_url: string | null;
  location: string | null;
  sports_interests: string[];
  preferred_position: string | null;
  skill_level: SkillLevel | null;
  availability: Availability;
  created_at: string;
  updated_at: string;
}

export type ProfileUpdate = Pick<
  Profile,
  | "name"
  | "profile_image_url"
  | "location"
  | "sports_interests"
  | "preferred_position"
  | "skill_level"
  | "availability"
>;
