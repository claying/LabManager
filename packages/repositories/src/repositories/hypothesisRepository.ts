import type {
  Evidence,
  Hypothesis,
  HypothesisInsert,
  HypothesisUpdatePatch,
  HypothesisWithEvidence,
} from "@pi-os/types";
import { getDb } from "../db/client";
import { buildSetClause, newId, nowIso } from "../db/util";

async function attachEvidence(
  db: Awaited<ReturnType<typeof getDb>>,
  hypotheses: Hypothesis[],
): Promise<HypothesisWithEvidence[]> {
  const result: HypothesisWithEvidence[] = [];
  for (const h of hypotheses) {
    const evidence = await db.select<Evidence[]>(
      "select * from evidence where hypothesis_id = ? order by created_at desc",
      [h.id],
    );
    result.push({
      ...h,
      evidence,
      supportingCount: evidence.filter((e) => e.direction === "supports").length,
      contradictingCount: evidence.filter((e) => e.direction === "contradicts").length,
    });
  }
  return result;
}

export interface HypothesisRepository {
  list(projectId: string): Promise<HypothesisWithEvidence[]>;
  listForQuestion(researchQuestionId: string): Promise<HypothesisWithEvidence[]>;
  get(id: string): Promise<HypothesisWithEvidence | null>;
  create(input: HypothesisInsert): Promise<Hypothesis>;
  update(id: string, patch: HypothesisUpdatePatch): Promise<Hypothesis>;
  remove(id: string): Promise<void>;
}

export const hypothesisRepository: HypothesisRepository = {
  async list(projectId) {
    const db = await getDb();
    const rows = await db.select<Hypothesis[]>(
      "select * from hypotheses where project_id = ? order by created_at desc",
      [projectId],
    );
    return attachEvidence(db, rows);
  },

  async listForQuestion(researchQuestionId) {
    const db = await getDb();
    const rows = await db.select<Hypothesis[]>(
      "select * from hypotheses where research_question_id = ? order by created_at asc",
      [researchQuestionId],
    );
    return attachEvidence(db, rows);
  },

  async get(id) {
    const db = await getDb();
    const rows = await db.select<Hypothesis[]>("select * from hypotheses where id = ?", [id]);
    if (!rows[0]) return null;
    return (await attachEvidence(db, rows))[0]!;
  },

  async create(input) {
    const db = await getDb();
    const id = newId();
    const now = nowIso();
    await db.execute(
      `insert into hypotheses (id, research_question_id, project_id, statement, confidence, notes, created_at, updated_at)
       values (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.research_question_id ?? null,
        input.project_id,
        input.statement,
        input.confidence ?? null,
        input.notes ?? null,
        now,
        now,
      ],
    );
    const rows = await db.select<Hypothesis[]>("select * from hypotheses where id = ?", [id]);
    return rows[0]!;
  },

  async update(id, patch) {
    const db = await getDb();
    const { clause, values } = buildSetClause(patch);
    if (clause) await db.execute(`update hypotheses set ${clause} where id = ?`, [...values, id]);
    const rows = await db.select<Hypothesis[]>("select * from hypotheses where id = ?", [id]);
    if (!rows[0]) throw new Error("Hypothesis not found");
    return rows[0];
  },

  async remove(id) {
    const db = await getDb();
    await db.execute("delete from hypotheses where id = ?", [id]);
  },
};
