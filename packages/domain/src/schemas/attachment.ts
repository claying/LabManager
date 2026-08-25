import { z } from "zod";
import { optionalTextMax } from "./common";

// `path`/`kind` come from a native file/folder picker result, not free
// typing — see SPEC_followup.md section 17 ("use native pickers rather
// than asking the user to type paths"). This still validates the shape
// before it's written, e.g. after import or a future drag-and-drop path.
export const attachmentSchema = z.object({
  entity_type: z.enum(["project", "meeting", "publication", "grant"]),
  entity_id: z.string().uuid(),
  kind: z.enum(["file", "folder"]),
  label: optionalTextMax(200),
  path: z.string().trim().min(1, "Path is required"),
});
export type AttachmentInput = z.infer<typeof attachmentSchema>;
