import { z } from "zod";

// Quick capture (SPEC_followup section 12): idea text, optional project,
// optional tags. Nothing else — description/priority/owner/deadline are
// deliberately not fields here; they can be added later via edit if ever.
export const ideaSchema = z.object({
  title: z.string().trim().min(1, "Say what the idea is").max(500),
  related_project_id: z.string().uuid().nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(6).default([]),
});
export type IdeaInput = z.infer<typeof ideaSchema>;
