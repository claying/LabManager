import { z } from "zod";
import { HYPOTHESIS_CONFIDENCE_LEVELS } from "@pi-os/types";
import { optionalText } from "./common";

// Confidence is deliberately optional and qualitative (low/medium/high) —
// never a fake statistically-calibrated number (SPEC_followup_2 section 7).
export const hypothesisSchema = z.object({
  statement: z.string().trim().min(1, "Statement is required").max(500),
  research_question_id: z.string().uuid().nullable().optional(),
  confidence: z.enum(HYPOTHESIS_CONFIDENCE_LEVELS).nullable().optional(),
  notes: optionalText,
});
export type HypothesisInput = z.infer<typeof hypothesisSchema>;
