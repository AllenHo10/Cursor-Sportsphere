import type { DayOfWeek, SkillLevel } from "@/lib/types/profile";

export const SKILL_LEVELS: { value: SkillLevel; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
  { value: "open", label: "Open / Competitive" },
];

export const DAYS_OF_WEEK: { value: DayOfWeek; label: string }[] = [
  { value: "monday", label: "Mon" },
  { value: "tuesday", label: "Tue" },
  { value: "wednesday", label: "Wed" },
  { value: "thursday", label: "Thu" },
  { value: "friday", label: "Fri" },
  { value: "saturday", label: "Sat" },
  { value: "sunday", label: "Sun" },
];

export const TIME_SLOTS = [
  { value: "morning" as const, label: "Morning" },
  { value: "afternoon" as const, label: "Afternoon" },
  { value: "evening" as const, label: "Evening" },
];

export const COMMON_SPORTS = [
  "Soccer",
  "Basketball",
  "Tennis",
  "Volleyball",
  "Baseball",
  "Softball",
  "Hockey",
  "Rugby",
  "Cricket",
  "Golf",
  "Swimming",
  "Running",
];

export const PROFILE_IMAGE_BUCKET = "profile-images";

export const PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export const PROFILE_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
