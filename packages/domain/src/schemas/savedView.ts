import { z } from "zod";
import {
  PROJECT_STAGES,
  PROJECT_HEALTHS,
  PROJECT_PRIORITIES,
  PUBLICATION_STATUSES,
  MEMORY_EVENT_TYPES,
  SAVED_VIEW_ENTITY_TYPES,
} from "@pi-os/types";

/**
 * A saved view's filters are this one controlled shape — never arbitrary
 * SQL or a free-text expression. Every field is a known column, enum, or
 * id; the UI for a given entity_type only reads/writes the subset that
 * applies to it (see Tier 3 section 7).
 */
export const savedViewFiltersSchema = z.object({
  stage: z.array(z.enum(PROJECT_STAGES)).optional(),
  health: z.array(z.enum(PROJECT_HEALTHS)).optional(),
  priority: z.array(z.enum(PROJECT_PRIORITIES)).optional(),
  leadPersonId: z.string().uuid().optional(),
  archived: z.boolean().optional(),
  dueWithinDays: z.number().int().positive().optional(),
  publicationStatus: z.array(z.enum(PUBLICATION_STATUSES)).optional(),
  venue: z.string().max(200).optional(),
  memoryTypes: z.array(z.enum(MEMORY_EVENT_TYPES)).optional(),
  projectId: z.string().uuid().optional(),
  personId: z.string().uuid().optional(),
});
export type SavedViewFilters = z.infer<typeof savedViewFiltersSchema>;

export const savedViewSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  entity_type: z.enum(SAVED_VIEW_ENTITY_TYPES),
  filters: savedViewFiltersSchema,
  pinned: z.boolean().default(false),
});
export type SavedViewFormInput = z.infer<typeof savedViewSchema>;
