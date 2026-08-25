import { z } from "zod";
import { MEETING_TYPES } from "@pi-os/types";
import { optionalText } from "./common";

export const meetingSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(300),
  meeting_type: z.enum(MEETING_TYPES),
  meeting_date: z.string().trim().min(1, "Meeting date is required"),
  project_id: z.string().uuid().nullable().optional(),
  attendee_person_ids: z.array(z.string().uuid()).default([]),
  progress: optionalText,
  results: optionalText,
  blockers: optionalText,
  decisions: optionalText,
  next_steps: optionalText,
});
export type MeetingInput = z.infer<typeof meetingSchema>;
