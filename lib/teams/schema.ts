import { z } from "zod";

const teamTypeValues = [
  "recreational",
  "competitive",
  "league",
  "pickup",
] as const;

const skillLevelValues = ["beginner", "intermediate", "advanced", "open"] as const;

export const teamDetailsSchema = z.object({
  name: z.string().trim().min(1, "Team name is required"),
  logo_url: z.string().nullable(),
  location: z.string(),
  description: z.string(),
  team_type: z.enum(teamTypeValues),
  skill_level: z.enum(skillLevelValues).nullable(),
});

export type TeamDetailsFormValues = z.infer<typeof teamDetailsSchema>;
