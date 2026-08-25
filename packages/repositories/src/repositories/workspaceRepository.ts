import type { Workspace, WorkspaceInsert, WorkspaceUpdatePatch } from "@pi-os/types";
import { getDb } from "../db/client";
import { buildSetClause, newId, nowIso } from "../db/util";

export interface WorkspaceRepository {
  /** Null means no workspace exists yet — the app should show first-launch onboarding. */
  get(): Promise<Workspace | null>;
  /** Creates the workspace and the PI's own `people` row atomically, linked via pi_person_id. */
  create(input: WorkspaceInsert): Promise<Workspace>;
  update(patch: WorkspaceUpdatePatch): Promise<Workspace>;
}

export const workspaceRepository: WorkspaceRepository = {
  async get() {
    const db = await getDb();
    const rows = await db.select<Workspace[]>("select * from workspace limit 1");
    return rows[0] ?? null;
  },

  async create(input) {
    const db = await getDb();
    const existing = await workspaceRepository.get();
    if (existing) return existing;

    const workspaceId = newId();
    const personId = newId();
    const now = nowIso();

    // Single-user, but still a real `people` row — the PI shows up as a
    // normal person (project lead, meeting attendee, weekly-update author),
    // not a special-cased concept threaded through every table.
    await db.execute(
      `insert into people (id, name, role, status, created_at, updated_at) values (?, ?, 'PI', 'active', ?, ?)`,
      [personId, input.pi_name, now, now],
    );

    await db.execute(
      `insert into workspace (id, name, institution, pi_name, pi_person_id, description, created_at, updated_at)
       values (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        workspaceId,
        input.name,
        input.institution ?? null,
        input.pi_name,
        personId,
        input.description ?? null,
        now,
        now,
      ],
    );

    const created = await workspaceRepository.get();
    if (!created) throw new Error("Failed to create workspace");
    return created;
  },

  async update(patch) {
    const db = await getDb();
    const current = await workspaceRepository.get();
    if (!current) throw new Error("No workspace exists yet");
    const { clause, values } = buildSetClause(patch);
    if (clause) {
      await db.execute(`update workspace set ${clause} where id = ?`, [...values, current.id]);
    }
    const updated = await workspaceRepository.get();
    if (!updated) throw new Error("Workspace not found");
    return updated;
  },
};
