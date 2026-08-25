import { z } from "zod";
import { EVIDENCE_DIRECTIONS, EVIDENCE_TYPES } from "@pi-os/types";
import { optionalTextMax } from "./common";

// Fast-capture by design (SPEC_followup_2 section 10) — just a result and an
// effect, nothing structured or mandatory beyond that.
export const evidenceSchema = z.object({
  summary: z.string().trim().min(1, "Result is required").max(500),
  type: z.enum(EVIDENCE_TYPES).default("observation"),
  direction: z.enum(EVIDENCE_DIRECTIONS).default("supports"),
  source_type: optionalTextMax(60),
  local_path: optionalTextMax(1024),
});
export type EvidenceInput = z.infer<typeof evidenceSchema>;
