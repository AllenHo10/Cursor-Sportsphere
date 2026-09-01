import { z } from "zod";

export const challengeDetailsSchema = z.object({
  home_team_id: z.string().uuid("Select one of your teams"),
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  venue: z.string().trim().min(1, "Venue is required"),
  format: z.enum([
    "indoor_6v6",
    "indoor_4v4",
    "beach_2v2",
    "beach_4v4",
    "mixed_6v6",
    "other",
  ]),
  notes: z.string().max(1000, "Notes must be 1000 characters or less"),
});

export type ChallengeDetailsFormValues = z.infer<typeof challengeDetailsSchema>;

export function isFutureDateTime(date: string, time: string) {
  const when = new Date(`${date}T${time}`);
  return !Number.isNaN(when.getTime()) && when.getTime() > Date.now() - 60_000;
}
