import { z } from "zod";
import { PUBLICATION_STATUSES } from "@pi-os/types";
import { optionalDate, optionalText, optionalTextMax, optionalUrl } from "./common";

export const publicationSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(400),
  status: z.enum(PUBLICATION_STATUSES),
  venue: optionalTextMax(200),
  project_id: z.string().uuid().nullable().optional(),
  submission_deadline: optionalDate,
  submission_date: optionalDate,
  acceptance_date: optionalDate,
  publication_date: optionalDate,
  doi: optionalTextMax(200),
  arxiv_url: optionalUrl,
  overleaf_url: optionalUrl,
  code_url: optionalUrl,
  paper_url: optionalUrl,
  notes: optionalText,
  author_person_ids: z.array(z.string().uuid()).default([]),
  target_venue_cycle_id: z.string().uuid().nullable().optional(),
});
export type PublicationInput = z.infer<typeof publicationSchema>;
