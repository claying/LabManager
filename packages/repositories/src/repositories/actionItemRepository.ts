import type {
  ActionItem,
  ActionItemUpdatePatch,
  ActionItemWithRelations,
  PersonRole,
} from "@pi-os/types";
import type { ActionItemInput } from "@pi-os/domain";
import { getDb } from "../db/client";
import { buildSetClause, newId, nowIso } from "../db/util";

export interface ActionItemRepository {
  list(opts?: {
    projectId?: string;
    assigneePersonId?: string;
    openOnly?: boolean;
  }): Promise<ActionItemWithRelations[]>;
  create(input: ActionItemInput, meetingId?: string): Promise<ActionItem>;
  update(id: string, patch: ActionItemUpdatePatch): Promise<ActionItem>;
  remove(id: string): Promise<void>;
}

interface Row extends ActionItem {
  assignee_name: string | null;
  assignee_avatar_url: string | null;
  assignee_role: string | null;
  project_title: string | null;
}

function mapRow(row: Row): ActionItemWithRelations {
  const { assignee_name, assignee_avatar_url, assignee_role, project_title, ...item } = row;
  return {
    ...item,
    assignee: assignee_name
      ? {
          id: item.assignee_person_id!,
          name: assignee_name,
          avatar_url: assignee_avatar_url,
          role: assignee_role as PersonRole,
        }
      : null,
    project:
      item.project_id && project_title ? { id: item.project_id, title: project_title } : null,
  };
}

export const actionItemRepository: ActionItemRepository = {
  async list(opts = {}) {
    const db = await getDb();
    const clauses: string[] = [];
    const values: unknown[] = [];
    if (opts.projectId) {
      clauses.push("a.project_id = ?");
      values.push(opts.projectId);
    }
    if (opts.assigneePersonId) {
      clauses.push("a.assignee_person_id = ?");
      values.push(opts.assigneePersonId);
    }
    if (opts.openOnly) clauses.push("a.status in ('open', 'in_progress')");
    const where = clauses.length ? `where ${clauses.join(" and ")}` : "";
    const rows = await db.select<Row[]>(
      `select a.*, pe.name as assignee_name, pe.avatar_url as assignee_avatar_url, pe.role as assignee_role, pr.title as project_title
       from action_items a
       left join people pe on pe.id = a.assignee_person_id
       left join projects pr on pr.id = a.project_id
       ${where}
       order by a.due_date is null, a.due_date asc`,
      values,
    );
    return rows.map(mapRow);
  },

  async create(input, meetingId) {
    const db = await getDb();
    const id = newId();
    const now = nowIso();
    await db.execute(
      `insert into action_items (id, project_id, meeting_id, assignee_person_id, title, description, status, priority, due_date, created_at, updated_at)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.project_id ?? null,
        meetingId ?? null,
        input.assignee_person_id ?? null,
        input.title,
        input.description ?? null,
        input.status ?? "open",
        input.priority ?? "medium",
        input.due_date ?? null,
        now,
        now,
      ],
    );
    const rows = await db.select<ActionItem[]>("select * from action_items where id = ?", [id]);
    return rows[0]!;
  },

  async update(id, patch) {
    const db = await getDb();
    const finalPatch = { ...patch };
    if (patch.status === "done" && !patch.completed_at) finalPatch.completed_at = nowIso();
    const { clause, values } = buildSetClause(finalPatch);
    if (clause) await db.execute(`update action_items set ${clause} where id = ?`, [...values, id]);
    const rows = await db.select<ActionItem[]>("select * from action_items where id = ?", [id]);
    if (!rows[0]) throw new Error("Action item not found");
    return rows[0];
  },

  async remove(id) {
    const db = await getDb();
    await db.execute("delete from action_items where id = ?", [id]);
  },
};
