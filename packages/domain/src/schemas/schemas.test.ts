import { describe, expect, it } from "vitest";
import { createWorkspaceSchema } from "./workspace";
import { projectSchema } from "./project";
import { projectUpdateSchema } from "./projectUpdate";
import { grantSchema } from "./grant";
import { optionalDate, optionalEmail, optionalText, optionalTextMax, optionalUrl } from "./common";

describe("projectUpdateSchema", () => {
  it("requires only the summary field", () => {
    const result = projectUpdateSchema.safeParse({ summary: "Ran the ablation sweep." });
    expect(result.success).toBe(true);
  });

  it("rejects an empty summary", () => {
    const result = projectUpdateSchema.safeParse({ summary: "" });
    expect(result.success).toBe(false);
  });

  it("normalizes empty-string optional fields to null", () => {
    const result = projectUpdateSchema.parse({ summary: "Update", blockers: "" });
    expect(result.blockers).toBeNull();
  });

  // Regression: form dialogs pre-populate untouched optional fields with
  // `null` (matching the nullable DB columns), not `undefined` or `""`. A
  // real submission of this dialog with only "summary" filled in sends
  // exactly this shape — this used to fail validation because the shared
  // optional-field helpers didn't accept `null` as valid input.
  it("accepts a real form submission where every untouched optional field is null", () => {
    const result = projectUpdateSchema.safeParse({
      summary: "Update",
      progress: null,
      blockers: null,
      next_steps: null,
      health: null,
      update_next_milestone: null,
      update_next_milestone_date: null,
    });
    expect(result.success).toBe(true);
  });
});

describe("optional-field schema helpers", () => {
  it.each([
    ["optionalText", optionalText],
    ["optionalTextMax", optionalTextMax(100)],
    ["optionalDate", optionalDate],
    ["optionalUrl", optionalUrl],
    ["optionalEmail", optionalEmail],
  ])("%s accepts null as valid input and normalizes it to null", (_name, schema) => {
    const result = schema.safeParse(null);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBeNull();
  });
});

describe("projectSchema", () => {
  it("requires a title and a valid stage/health/priority", () => {
    const result = projectSchema.safeParse({
      title: "Geometric Flow Matching",
      stage: "prototype",
      health: "healthy",
      priority: "medium",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid stage", () => {
    const result = projectSchema.safeParse({
      title: "X",
      stage: "not-a-stage",
      health: "healthy",
      priority: "medium",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed URL", () => {
    const result = projectSchema.safeParse({
      title: "X",
      stage: "idea",
      health: "healthy",
      priority: "medium",
      github_url: "not-a-url",
    });
    expect(result.success).toBe(false);
  });
});

describe("createWorkspaceSchema", () => {
  it("requires a workspace name and PI name", () => {
    const result = createWorkspaceSchema.safeParse({
      workspaceName: "SIM Lab",
      piName: "Alex Chen",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a too-short workspace name", () => {
    const result = createWorkspaceSchema.safeParse({ workspaceName: "X", piName: "Alex Chen" });
    expect(result.success).toBe(false);
  });
});

describe("grantSchema", () => {
  it("coerces amount from a string input", () => {
    const result = grantSchema.parse({ title: "NSF Grant", status: "preparing", amount: "50000" });
    expect(result.amount).toBe(50000);
  });
});
