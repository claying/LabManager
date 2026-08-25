import { z } from "zod";
import { DECISION_PRIORITIES } from "@pi-os/types";

export const researchQuestionSchema = z.object({
  question: z.string().trim().min(1, "Question is required").max(500),
  priority: z.enum(DECISION_PRIORITIES).default("normal"),
});
export type ResearchQuestionInput = z.infer<typeof researchQuestionSchema>;
