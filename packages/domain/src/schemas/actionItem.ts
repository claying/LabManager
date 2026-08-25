import { z } from "zod";
import { ACTION_ITEM_PRIORITIES, ACTION_ITEM_STATUSES } from "@pi-os/types";
import { optionalDate, optionalText } from "./common";

export const actionItemSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(300),
  description: optionalText,
  status: z.enum(ACTION_ITEM_STATUSES),
  priority: z.enum(ACTION_ITEM_PRIORITIES),
  due_date: optionalDate,
  assignee_person_id: z.string().uuid().nullable().optional(),
  project_id: z.string().uuid().nullable().optional(),
});
export type ActionItemInput = z.infer<typeof actionItemSchema>;
