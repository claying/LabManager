import type {
  Milestone,
  MilestoneInsert,
  MilestoneUpdatePatch,
  MilestoneWithOwner,
  PersonRole,
} from "@pi-os/types";
import { getDb } from "../db/client";
import { buildSetClause, newId, nowIso } from "../db/util";

export interface MilestoneRepository {
  list(projectId: string): Promise<MilestoneWithOwner[]>;
  create(input: MilestoneInsert): Promise<Milestone>;
  update(id: string, patch: MilestoneUpdatePatch): Promise<Milestone>;
  remove(id: string): Promise<void>;
}

export const milestoneRepository: MilestoneRepository = {
  async list(projectId) {
    const db = await getDb();
    const rows = await db.select<
      (Milestone & {
        owner_name: string | null;
        owner_avatar_url: string | null;
        owner_role: string | null;
      })[]
    >(
      `select m.*, p.name as owner_name, p.avatar_url as owner_avatar_url, p.role as owner_role
       from milestones m
       left join people p on p.id = m.owner_person_id
       where m.project_id = ?
       order by m.due_date is null, m.due_date asc`,
      [projectId],
    );
    return rows.map((row) => {
      const { owner_name, owner_avatar_url, owner_role, ...m } = row;
      return {
        ...m,
        owner: owner_name
          ? {
              id: m.owner_person_id!,
              name: owner_name,
              avatar_url: owner_avatar_url,
              role: owner_role as PersonRole,
            }
          : null,
      };
    });
  },

  async create(input) {
    const db = await getDb();
    const id = newId();
    const now = nowIso();
    await db.execute(
      `insert into milestones (id, project_id, title, description, status, due_date, owner_person_id, created_at, updated_at)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.project_id,
        input.title,
        input.description ?? null,
        input.status ?? "planned",
        input.due_date ?? null,
        input.owner_person_id ?? null,
        now,
        now,
      ],
    );
    const rows = await db.select<Milestone[]>("select * from milestones where id = ?", [id]);
    return rows[0]!;
  },

  async update(id, patch) {
    const db = await getDb();
    const finalPatch = { ...patch };
    if (patch.status === "completed" && !patch.completed_at) finalPatch.completed_at = nowIso();
    const { clause, values } = buildSetClause(finalPatch);
    if (clause) await db.execute(`update milestones set ${clause} where id = ?`, [...values, id]);
    const rows = await db.select<Milestone[]>("select * from milestones where id = ?", [id]);
    if (!rows[0]) throw new Error("Milestone not found");
    return rows[0];
  },

  async remove(id) {
    const db = await getDb();
    await db.execute("delete from milestones where id = ?", [id]);
  },
};
