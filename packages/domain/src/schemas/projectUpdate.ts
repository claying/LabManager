import { z } from "zod";
import { PROJECT_HEALTHS } from "@pi-os/types";
import { optionalDate, optionalText, optionalTextMax } from "./common";

// The Weekly Update form — this is the most important workflow in the app,
// so it stays intentionally short: one required field, everything else optional.
export const projectUpdateSchema = z.object({
  summary: z.string().trim().min(1, "Tell us what changed since the last update"),
  progress: optionalText,
  blockers: optionalText,
  next_steps: optionalText,
  health: z.enum(PROJECT_HEALTHS).nullable().optional(),
  update_next_milestone: optionalTextMax(300),
  update_next_milestone_date: optionalDate,
});
export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>;
