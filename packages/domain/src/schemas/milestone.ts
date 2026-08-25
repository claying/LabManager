import { z } from "zod";
import { MILESTONE_STATUSES } from "@pi-os/types";
import { optionalDate, optionalText } from "./common";

export const milestoneSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(300),
  description: optionalText,
  status: z.enum(MILESTONE_STATUSES),
  due_date: optionalDate,
  owner_person_id: z.string().uuid().nullable().optional(),
});
export type MilestoneInput = z.infer<typeof milestoneSchema>;
