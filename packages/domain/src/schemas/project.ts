import { z } from "zod";
import { PROJECT_HEALTHS, PROJECT_PRIORITIES, PROJECT_STAGES } from "@pi-os/types";
import { optionalDate, optionalText, optionalTextMax, optionalUrl } from "./common";

export const projectSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(300),
  short_name: optionalTextMax(60),
  description: optionalText,
  lead_person_id: z.string().uuid().nullable().optional(),
  stage: z.enum(PROJECT_STAGES),
  health: z.enum(PROJECT_HEALTHS),
  priority: z.enum(PROJECT_PRIORITIES),
  start_date: optionalDate,
  target_date: optionalDate,
  next_milestone: optionalTextMax(300),
  next_milestone_date: optionalDate,
  github_url: optionalUrl,
  overleaf_url: optionalUrl,
  drive_url: optionalUrl,
  website_url: optionalUrl,
  // Local folder references (SPEC_followup section 18) — set via native
  // folder pickers, not typed by hand, but still just plain paths to validate.
  research_folder_path: optionalTextMax(1024),
  git_repository_path: optionalTextMax(1024),
  paper_folder_path: optionalTextMax(1024),
  results_folder_path: optionalTextMax(1024),
});
export type ProjectInput = z.infer<typeof projectSchema>;

export const projectMemberSchema = z.object({
  person_id: z.string().uuid(),
  role: z.enum(["lead", "core_member", "collaborator", "advisor"]),
});
export type ProjectMemberInput = z.infer<typeof projectMemberSchema>;
