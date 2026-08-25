import { z } from "zod";
import { VENUE_CATEGORIES } from "@pi-os/types";
import { optionalText, optionalTextMax, optionalUrl, optionalDate } from "./common";

export const venueSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(300),
  short_name: optionalTextMax(60),
  category: z.enum(VENUE_CATEGORIES).default("conference"),
  website_url: optionalUrl,
  notes: optionalText,
});
export type VenueInput = z.infer<typeof venueSchema>;

export const venueCycleSchema = z.object({
  cycle_label: z.string().trim().min(1, "Label is required").max(120),
  abstract_deadline: optionalDate,
  submission_deadline: optionalDate,
  rebuttal_start: optionalDate,
  rebuttal_end: optionalDate,
  notification_date: optionalDate,
  camera_ready_date: optionalDate,
  event_start: optionalDate,
  event_end: optionalDate,
});
export type VenueCycleInput = z.infer<typeof venueCycleSchema>;
