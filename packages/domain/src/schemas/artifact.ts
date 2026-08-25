import { z } from "zod";
import { ARTIFACT_TYPES } from "@pi-os/types";
import { optionalText, optionalUrl } from "./common";

export const artifactSchema = z.object({
  type: z.enum(ARTIFACT_TYPES),
  title: z.string().trim().min(1, "Title is required").max(300),
  local_path: optionalText,
  url: optionalUrl,
  notes: optionalText,
});
export type ArtifactInput = z.infer<typeof artifactSchema>;
