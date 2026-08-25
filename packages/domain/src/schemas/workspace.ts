import { z } from "zod";
import { optionalTextMax } from "./common";

// First-launch onboarding (SPEC_followup.md section 28) — no account,
// no email, no password. Just enough to personalize the workspace.
export const createWorkspaceSchema = z.object({
  workspaceName: z.string().trim().min(2, "Workspace name is too short").max(200),
  piName: z.string().trim().min(1, "Your name is required").max(200),
  institution: optionalTextMax(200),
});
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;

export const workspaceSettingsSchema = z.object({
  name: z.string().trim().min(2, "Workspace name is too short").max(200),
  pi_name: z.string().trim().min(1, "Your name is required").max(200),
  institution: optionalTextMax(200),
  description: optionalTextMax(2000),
});
export type WorkspaceSettingsInput = z.infer<typeof workspaceSettingsSchema>;
