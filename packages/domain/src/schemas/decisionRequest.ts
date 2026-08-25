import { z } from "zod";
import { DECISION_PRIORITIES } from "@pi-os/types";
import { optionalText, optionalTextMax } from "./common";

// Compact creation form (SPEC_followup section 10): Question, Project,
// Options, Recommendation, Priority. No mandatory long description.
export const decisionRequestSchema = z.object({
  title: z.string().trim().min(1, "Question is required").max(300),
  project_id: z.string().uuid().nullable().optional(),
  person_id: z.string().uuid().nullable().optional(),
  context: optionalText,
  options: z.array(z.string().trim().min(1).max(200)).max(8).default([]),
  recommendation: optionalTextMax(200),
  priority: z.enum(DECISION_PRIORITIES).default("normal"),
});
export type DecisionRequestInput = z.infer<typeof decisionRequestSchema>;

// Resolving never requires rationale (SPEC_followup section 10: "Do not make
// rationale mandatory").
export const resolveDecisionSchema = z.object({
  decision: z.string().trim().min(1, "Pick an option").max(200),
  rationale: optionalText,
});
export type ResolveDecisionInput = z.infer<typeof resolveDecisionSchema>;
