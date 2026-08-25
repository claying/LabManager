import { z } from "zod";
import { PROJECT_RELATION_TYPES } from "@pi-os/types";
import { optionalText } from "./common";

export const projectRelationSchema = z.object({
  related_project_id: z.string().uuid("Choose a project"),
  relation_type: z.enum(PROJECT_RELATION_TYPES),
  notes: optionalText,
});
export type ProjectRelationInput = z.infer<typeof projectRelationSchema>;
