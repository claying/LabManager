import { z } from "zod";
import { PERSON_ROLES, PERSON_STATUSES } from "@pi-os/types";
import { optionalDate, optionalEmail, optionalText, optionalUrl } from "./common";

export const personSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  email: optionalEmail,
  role: z.enum(PERSON_ROLES),
  status: z.enum(PERSON_STATUSES),
  start_date: optionalDate,
  end_date: optionalDate,
  expected_graduation: optionalDate,
  research_interests: z.array(z.string().trim().min(1)).default([]),
  skills: z.array(z.string().trim().min(1)).default([]),
  bio: optionalText,
  website_url: optionalUrl,
  github_url: optionalUrl,
  google_scholar_url: optionalUrl,
  notes: optionalText,
});
export type PersonInput = z.infer<typeof personSchema>;
