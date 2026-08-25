import type {
  PersonRole,
  Project,
  ProjectInsert,
  ProjectListItem,
  ProjectMember,
  ProjectMemberRole,
  ProjectMemberWithPerson,
  ProjectStage,
  ProjectUpdatePatch,
  ProjectWithRelations,
} from "@pi-os/types";
import { getDb } from "../db/client";
import { buildSetClause, fromSqlBool, newId, nowIso, toSqlBool } from "../db/util";

interface ProjectRow extends Omit<Project, "archived"> {
  archived: number;
  lead_id: string | null;
  lead_name: string | null;
  lead_avatar_url: string | null;
  lead_role: string | null;
}

function mapProjectRow(row: ProjectRow): Project & { lead: ProjectListItem["lead"] } {
  const { lead_id, lead_name, lead_avatar_url, lead_role, archived, ...rest } = row;
  return {
    ...rest,
    archived: fromSqlBool(archived),
    lead: lead_id
      ? {
          id: lead_id,
          name: lead_name!,
          avatar_url: lead_avatar_url,
          role: lead_role as PersonRole,
        }
      : null,
  } as Project & { lead: ProjectListItem["lead"] };
}

const LEAD_JOIN = `
  left join people lp on lp.id = p.lead_person_id
`;
const LEAD_SELECT = `lp.id as lead_id, lp.name as lead_name, lp.avatar_url as lead_avatar_url, lp.role as lead_role`;

export interface ProjectRepository {
  list(opts?: { includeArchived?: boolean }): Promise<ProjectListItem[]>;
  get(id: string): Promise<ProjectWithRelations | null>;
  create(input: ProjectInsert): Promise<Project>;
  update(id: string, patch: ProjectUpdatePatch): Promise<Project>;
  updateStage(id: string, stage: ProjectStage): Promise<Project>;
  archive(id: string): Promise<void>;
  remove(id: string): Promise<void>;
  addMember(projectId: string, personId: string, role: ProjectMemberRole): Promise<ProjectMember>;
  updateMemberRole(memberId: string, role: ProjectMemberRole): Promise<ProjectMember>;
  removeMember(memberId: string): Promise<void>;
}

export const projectRepository: ProjectRepository = {
  async list(opts = {}) {
    const db = await getDb();
    const where = opts.includeArchived ? "" : "where p.archived = 0";
    const rows = await db.select<ProjectRow[]>(
      `select p.*, ${LEAD_SELECT},
         (select count(*) from project_members pm where pm.project_id = p.id and pm.left_at is null) as member_count
       from projects p
       ${LEAD_JOIN}
       ${where}
       order by p.updated_at desc`,
    );
    return rows.map((row) => {
      const mapped = mapProjectRow(row);
      return {
        ...mapped,
        member_count: Number((row as unknown as { member_count: number }).member_count),
      };
    });
  },

  async get(id) {
    const db = await getDb();
    const rows = await db.select<ProjectRow[]>(
      `select p.*, ${LEAD_SELECT} from projects p ${LEAD_JOIN} where p.id = ?`,
      [id],
    );
    if (!rows[0]) return null;
    const project = mapProjectRow(rows[0]);

    const memberRows = await db.select<
      (ProjectMember & {
        person_name: string;
        person_avatar_url: string | null;
        person_role: string;
      })[]
    >(
      `select pm.*, pe.name as person_name, pe.avatar_url as person_avatar_url, pe.role as person_role
       from project_members pm
       join people pe on pe.id = pm.person_id
       where pm.project_id = ? and pm.left_at is null
       order by pm.joined_at asc`,
      [id],
    );

    const members: ProjectMemberWithPerson[] = memberRows.map((row) => ({
      id: row.id,
      project_id: row.project_id,
      person_id: row.person_id,
      role: row.role,
      joined_at: row.joined_at,
      left_at: row.left_at,
      person: {
        id: row.person_id,
        name: row.person_name,
        avatar_url: row.person_avatar_url,
        role: row.person_role as PersonRole,
      },
    }));

    return { ...project, members };
  },

  async create(input) {
    const db = await getDb();
    const id = newId();
    const now = nowIso();
    await db.execute(
      `insert into projects
        (id, title, short_name, description, lead_person_id, stage, health, priority, start_date, target_date,
         next_milestone, next_milestone_date, github_url, overleaf_url, drive_url, website_url,
         research_folder_path, git_repository_path, paper_folder_path, results_folder_path,
         created_at, updated_at)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.title,
        input.short_name ?? null,
        input.description ?? null,
        input.lead_person_id ?? null,
        input.stage ?? "idea",
        input.health ?? "healthy",
        input.priority ?? "medium",
        input.start_date ?? null,
        input.target_date ?? null,
        input.next_milestone ?? null,
        input.next_milestone_date ?? null,
        input.github_url ?? null,
        input.overleaf_url ?? null,
        input.drive_url ?? null,
        input.website_url ?? null,
        input.research_folder_path ?? null,
        input.git_repository_path ?? null,
        input.paper_folder_path ?? null,
        input.results_folder_path ?? null,
        now,
        now,
      ],
    );
    const rows = await db.select<Project[]>("select * from projects where id = ?", [id]);
    return rows[0]!;
  },

  async update(id, patch) {
    const db = await getDb();

    // Stage/health have no other history source (unlike updates/milestones/
    // meetings, which the project timeline derives dynamically), so a real
    // change is logged here — the one place both fields are actually
    // written — into their respective structured history tables (needed for
    // stage-aging/movement/health-trend analytics, not just display).
    let before: { stage: ProjectStage; health: Project["health"] } | null = null;
    if (patch.stage !== undefined || patch.health !== undefined) {
      const rows = await db.select<{ stage: ProjectStage; health: Project["health"] }[]>(
        "select stage, health from projects where id = ?",
        [id],
      );
      before = rows[0] ?? null;
    }

    const dbPatch: Record<string, unknown> = { ...patch };
    if (patch.archived !== undefined) dbPatch.archived = toSqlBool(patch.archived);
    const { clause, values } = buildSetClause(dbPatch);
    if (clause) {
      await db.execute(`update projects set ${clause} where id = ?`, [...values, id]);
    }

    if (before && patch.stage !== undefined && patch.stage !== before.stage) {
      await db.execute(
        "insert into project_stage_history (id, project_id, from_stage, to_stage, changed_at) values (?, ?, ?, ?, ?)",
        [newId(), id, before.stage, patch.stage, nowIso()],
      );
    }
    if (before && patch.health !== undefined && patch.health !== before.health) {
      await db.execute(
        "insert into project_health_history (id, project_id, from_health, to_health, changed_at) values (?, ?, ?, ?, ?)",
        [newId(), id, before.health, patch.health, nowIso()],
      );
    }

    const rows = await db.select<Project[]>("select * from projects where id = ?", [id]);
    if (!rows[0]) throw new Error("Project not found");
    return { ...rows[0], archived: fromSqlBool(rows[0].archived as unknown as number) };
  },

  async updateStage(id, stage) {
    return projectRepository.update(id, { stage });
  },

  async archive(id) {
    const db = await getDb();
    await db.execute("update projects set archived = 1 where id = ?", [id]);
  },

  async remove(id) {
    const db = await getDb();
    await db.execute("delete from projects where id = ?", [id]);
  },

  async addMember(projectId, personId, role) {
    const db = await getDb();
    const id = newId();
    const now = nowIso();
    await db.execute(
      "insert into project_members (id, project_id, person_id, role, joined_at) values (?, ?, ?, ?, ?)",
      [id, projectId, personId, role, now],
    );
    const rows = await db.select<ProjectMember[]>("select * from project_members where id = ?", [
      id,
    ]);
    return rows[0]!;
  },

  async updateMemberRole(memberId, role) {
    const db = await getDb();
    await db.execute("update project_members set role = ? where id = ?", [role, memberId]);
    const rows = await db.select<ProjectMember[]>("select * from project_members where id = ?", [
      memberId,
    ]);
    if (!rows[0]) throw new Error("Project member not found");
    return rows[0];
  },

  async removeMember(memberId) {
    const db = await getDb();
    await db.execute("update project_members set left_at = ? where id = ?", [nowIso(), memberId]);
  },
};
