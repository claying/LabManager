import type {
  ResearchQuestion,
  ResearchQuestionInsert,
  ResearchQuestionUpdatePatch,
} from "@pi-os/types";
import { getDb } from "../db/client";
import { buildSetClause, newId, nowIso } from "../db/util";

export interface ResearchQuestionRepository {
  list(projectId: string): Promise<ResearchQuestion[]>;
  get(id: string): Promise<ResearchQuestion | null>;
  create(input: ResearchQuestionInsert): Promise<ResearchQuestion>;
  update(id: string, patch: ResearchQuestionUpdatePatch): Promise<ResearchQuestion>;
  remove(id: string): Promise<void>;
}

export const researchQuestionRepository: ResearchQuestionRepository = {
  async list(projectId) {
    const db = await getDb();
    return db.select<ResearchQuestion[]>(
      "select * from research_questions where project_id = ? order by status = 'answered', status = 'parked', created_at desc",
      [projectId],
    );
  },

  async get(id) {
    const db = await getDb();
    const rows = await db.select<ResearchQuestion[]>(
      "select * from research_questions where id = ?",
      [id],
    );
    return rows[0] ?? null;
  },

  async create(input) {
    const db = await getDb();
    const id = newId();
    const now = nowIso();
    await db.execute(
      "insert into research_questions (id, project_id, question, priority, created_at, updated_at) values (?, ?, ?, ?, ?, ?)",
      [id, input.project_id, input.question, input.priority ?? "normal", now, now],
    );
    const rows = await db.select<ResearchQuestion[]>(
      "select * from research_questions where id = ?",
      [id],
    );
    return rows[0]!;
  },

  async update(id, patch) {
    const db = await getDb();
    const { clause, values } = buildSetClause(patch);
    if (clause)
      await db.execute(`update research_questions set ${clause} where id = ?`, [...values, id]);
    const rows = await db.select<ResearchQuestion[]>(
      "select * from research_questions where id = ?",
      [id],
    );
    if (!rows[0]) throw new Error("Research question not found");
    return rows[0];
  },

  async remove(id) {
    const db = await getDb();
    await db.execute("delete from research_questions where id = ?", [id]);
  },
};
