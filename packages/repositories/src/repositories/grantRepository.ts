import type {
  Grant,
  GrantMemberRole,
  GrantUpdatePatch,
  GrantWithRelations,
  PersonRole,
} from "@pi-os/types";
import type { GrantInput } from "@pi-os/domain";
import { getDb } from "../db/client";
import { buildSetClause, newId, nowIso } from "../db/util";

export interface GrantRepository {
  list(): Promise<GrantWithRelations[]>;
  get(id: string): Promise<GrantWithRelations | null>;
  create(input: GrantInput): Promise<Grant>;
  update(id: string, patch: GrantUpdatePatch): Promise<Grant>;
  remove(id: string): Promise<void>;
  addMember(grantId: string, personId: string, role: GrantMemberRole): Promise<void>;
  removeMember(grantMemberId: string): Promise<void>;
}

interface Row extends Grant {
  pi_name: string | null;
  pi_avatar_url: string | null;
  pi_role: string | null;
}

async function attachRelations(
  db: Awaited<ReturnType<typeof getDb>>,
  rows: Row[],
): Promise<GrantWithRelations[]> {
  const result: GrantWithRelations[] = [];
  for (const row of rows) {
    const { pi_name, pi_avatar_url, pi_role, ...grant } = row;
    const memberRows = await db.select<
      { id: string; name: string; avatar_url: string | null; role: string; grant_role: string }[]
    >(
      `select p.id, p.name, p.avatar_url, p.role, gm.role as grant_role
       from grant_members gm
       join people p on p.id = gm.person_id
       where gm.grant_id = ?`,
      [grant.id],
    );
    result.push({
      ...grant,
      pi: pi_name
        ? {
            id: grant.pi_person_id!,
            name: pi_name,
            avatar_url: pi_avatar_url,
            role: pi_role as PersonRole,
          }
        : null,
      members: memberRows.map((m) => ({
        id: m.id,
        name: m.name,
        avatar_url: m.avatar_url,
        role: m.role as PersonRole,
        grantRole: m.grant_role as GrantMemberRole,
      })),
    });
  }
  return result;
}

export const grantRepository: GrantRepository = {
  async list() {
    const db = await getDb();
    const rows = await db.select<Row[]>(
      `select g.*, p.name as pi_name, p.avatar_url as pi_avatar_url, p.role as pi_role
       from grants g
       left join people p on p.id = g.pi_person_id
       order by g.deadline is null, g.deadline asc`,
    );
    return attachRelations(db, rows);
  },

  async get(id) {
    const db = await getDb();
    const rows = await db.select<Row[]>(
      `select g.*, p.name as pi_name, p.avatar_url as pi_avatar_url, p.role as pi_role
       from grants g left join people p on p.id = g.pi_person_id where g.id = ?`,
      [id],
    );
    if (!rows[0]) return null;
    return (await attachRelations(db, rows))[0]!;
  },

  async create(input) {
    const db = await getDb();
    const id = newId();
    const now = nowIso();
    await db.execute(
      `insert into grants
        (id, title, funder, program, status, deadline, start_date, end_date, amount, currency, pi_person_id, description, notes, created_at, updated_at)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.title,
        input.funder ?? null,
        input.program ?? null,
        input.status ?? "idea",
        input.deadline ?? null,
        input.start_date ?? null,
        input.end_date ?? null,
        input.amount ?? null,
        input.currency ?? "USD",
        input.pi_person_id ?? null,
        input.description ?? null,
        input.notes ?? null,
        now,
        now,
      ],
    );
    const rows = await db.select<Grant[]>("select * from grants where id = ?", [id]);
    return rows[0]!;
  },

  async update(id, patch) {
    const db = await getDb();
    const { clause, values } = buildSetClause(patch);
    if (clause) await db.execute(`update grants set ${clause} where id = ?`, [...values, id]);
    const rows = await db.select<Grant[]>("select * from grants where id = ?", [id]);
    if (!rows[0]) throw new Error("Grant not found");
    return rows[0];
  },

  async remove(id) {
    const db = await getDb();
    await db.execute("delete from grants where id = ?", [id]);
  },

  async addMember(grantId, personId, role) {
    const db = await getDb();
    await db.execute(
      "insert into grant_members (id, grant_id, person_id, role) values (?, ?, ?, ?)",
      [newId(), grantId, personId, role],
    );
  },

  async removeMember(grantMemberId) {
    const db = await getDb();
    await db.execute("delete from grant_members where id = ?", [grantMemberId]);
  },
};
