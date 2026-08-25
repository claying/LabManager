import type {
  SubmissionHealth,
  SubmissionPlan,
  SubmissionPlanItem,
  SubmissionPlanWithItems,
} from "@pi-os/types";
import { DEFAULT_SUBMISSION_PLAN_TEMPLATE } from "@pi-os/types";
import { calculateSubmissionHealth } from "@pi-os/domain";
import { getDb } from "../db/client";
import { newId, nowIso } from "../db/util";

export interface SubmissionPlanRepository {
  getForPublication(publicationId: string): Promise<SubmissionPlanWithItems | null>;
  /** Creates a plan from the (editable) default template, backward from the venue cycle's submission_deadline. */
  create(
    publicationId: string,
    venueCycleId: string | null,
    template?: { label: string; offsetDays: number }[],
  ): Promise<SubmissionPlanWithItems>;
  setItemStatus(itemId: string, status: "pending" | "done"): Promise<SubmissionPlanItem>;
  remove(planId: string): Promise<void>;
  /** Null if the plan has no venue cycle (and therefore no deadline to measure against). */
  calculateHealth(publicationId: string): Promise<SubmissionHealth | null>;
}

async function getItems(
  db: Awaited<ReturnType<typeof getDb>>,
  planId: string,
): Promise<SubmissionPlanItem[]> {
  return db.select<SubmissionPlanItem[]>(
    "select * from submission_plan_items where submission_plan_id = ? order by sort_order asc",
    [planId],
  );
}

export const submissionPlanRepository: SubmissionPlanRepository = {
  async getForPublication(publicationId) {
    const db = await getDb();
    const rows = await db.select<SubmissionPlan[]>(
      "select * from submission_plans where publication_id = ?",
      [publicationId],
    );
    const plan = rows[0];
    if (!plan) return null;
    const items = await getItems(db, plan.id);
    return { ...plan, items };
  },

  async create(publicationId, venueCycleId, template = DEFAULT_SUBMISSION_PLAN_TEMPLATE) {
    const db = await getDb();
    const existing = await submissionPlanRepository.getForPublication(publicationId);
    if (existing) return existing;

    const id = newId();
    const now = nowIso();
    await db.execute(
      "insert into submission_plans (id, publication_id, venue_cycle_id, created_at, updated_at) values (?, ?, ?, ?, ?)",
      [id, publicationId, venueCycleId, now, now],
    );
    let order = 0;
    for (const item of template) {
      await db.execute(
        "insert into submission_plan_items (id, submission_plan_id, label, offset_days, sort_order) values (?, ?, ?, ?, ?)",
        [newId(), id, item.label, item.offsetDays, order++],
      );
    }
    const items = await getItems(db, id);
    return {
      id,
      publication_id: publicationId,
      venue_cycle_id: venueCycleId,
      created_at: now,
      updated_at: now,
      items,
    };
  },

  async setItemStatus(itemId, status) {
    const db = await getDb();
    await db.execute("update submission_plan_items set status = ?, completed_at = ? where id = ?", [
      status,
      status === "done" ? nowIso() : null,
      itemId,
    ]);
    const rows = await db.select<SubmissionPlanItem[]>(
      "select * from submission_plan_items where id = ?",
      [itemId],
    );
    if (!rows[0]) throw new Error("Submission plan item not found");
    return rows[0];
  },

  async remove(planId) {
    const db = await getDb();
    await db.execute("delete from submission_plans where id = ?", [planId]);
  },

  async calculateHealth(publicationId) {
    const db = await getDb();
    const plan = await submissionPlanRepository.getForPublication(publicationId);
    if (!plan || !plan.venue_cycle_id) return null;
    const cycleRows = await db.select<{ submission_deadline: string | null }[]>(
      "select submission_deadline from venue_cycles where id = ?",
      [plan.venue_cycle_id],
    );
    const deadline = cycleRows[0]?.submission_deadline;
    if (!deadline) return null;
    return calculateSubmissionHealth(
      plan.items.map((i) => ({ label: i.label, offsetDays: i.offset_days, status: i.status })),
      deadline,
    );
  },
};
