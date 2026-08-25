import type {
  PersonRole,
  ProjectHealth,
  ProjectUpdate,
  ProjectUpdatePatch,
  ProjectUpdateWithAuthor,
} from "@pi-os/types";
import type { ProjectUpdateInput } from "@pi-os/domain";
import { getDb } from "../db/client";
import { buildSetClause, newId, nowIso } from "../db/util";

export interface SubmitProjectUpdateParams {
  projectId: string;
  authorPersonId: string | null;
  input: ProjectUpdateInput;
}

export interface ProjectUpdatesRepository {
  list(projectId: string): Promise<ProjectUpdateWithAuthor[]>;
  /**
   * The Weekly Update workflow (the app's core loop): writes the journal
   * entry, then applies whichever optional project-level side effects the
   * PI asked for (health, next milestone). `last_update_at` is kept in sync
   * by the trg_project_updates_bump_project SQLite trigger, not here — that
   * guarantee holds no matter which code path inserts a project_update.
   */
  submit(params: SubmitProjectUpdateParams): Promise<ProjectUpdate>;
}

export const projectUpdatesRepository: ProjectUpdatesRepository = {
  async list(projectId) {
    const db = await getDb();
    const rows = await db.select<
      (ProjectUpdate & {
        author_name: string | null;
        author_avatar_url: string | null;
        author_role: string | null;
      })[]
    >(
      `select u.*, p.name as author_name, p.avatar_url as author_avatar_url, p.role as author_role
       from project_updates u
       left join people p on p.id = u.author_person_id
       where u.project_id = ?
       order by u.created_at desc`,
      [projectId],
    );
    return rows.map((row) => {
      const { author_name, author_avatar_url, author_role, ...update } = row;
      return {
        ...update,
        author: author_name
          ? {
              id: update.author_person_id!,
              name: author_name,
              avatar_url: author_avatar_url,
              role: author_role as PersonRole,
            }
          : null,
      };
    });
  },

  async submit({ projectId, authorPersonId, input }) {
    const db = await getDb();
    const id = newId();
    const now = nowIso();
    await db.execute(
      `insert into project_updates
        (id, project_id, author_person_id, summary, progress, blockers, next_steps, health, created_at)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        projectId,
        authorPersonId,
        input.summary,
        input.progress ?? null,
        input.blockers ?? null,
        input.next_steps ?? null,
        input.health ?? null,
        now,
      ],
    );

    const projectPatch: ProjectUpdatePatch = {};
    if (input.health) (projectPatch as { health?: ProjectHealth }).health = input.health;
    if (input.update_next_milestone) {
      projectPatch.next_milestone = input.update_next_milestone;
      projectPatch.next_milestone_date = input.update_next_milestone_date;
    }
    const { clause, values } = buildSetClause(projectPatch);
    if (clause) {
      await db.execute(`update projects set ${clause} where id = ?`, [...values, projectId]);
    }

    const rows = await db.select<ProjectUpdate[]>("select * from project_updates where id = ?", [
      id,
    ]);
    return rows[0]!;
  },
};
