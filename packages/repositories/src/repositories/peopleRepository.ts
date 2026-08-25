import type { Person, PersonInsert, PersonUpdatePatch } from "@pi-os/types";
import { getDb } from "../db/client";
import { buildSetClause, fromJsonArray, newId, nowIso, toJsonArray } from "../db/util";

interface PersonRow {
  id: string;
  name: string;
  email: string | null;
  avatar_url: string | null;
  role: Person["role"];
  status: Person["status"];
  start_date: string | null;
  end_date: string | null;
  expected_graduation: string | null;
  research_interests: string;
  skills: string;
  bio: string | null;
  website_url: string | null;
  github_url: string | null;
  google_scholar_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function mapRow(row: PersonRow): Person {
  return {
    ...row,
    research_interests: fromJsonArray(row.research_interests),
    skills: fromJsonArray(row.skills),
  };
}

export interface PeopleRepository {
  list(): Promise<Person[]>;
  get(id: string): Promise<Person | null>;
  create(input: PersonInsert): Promise<Person>;
  update(id: string, patch: PersonUpdatePatch): Promise<Person>;
  remove(id: string): Promise<void>;
}

export const peopleRepository: PeopleRepository = {
  async list() {
    const db = await getDb();
    const rows = await db.select<PersonRow[]>("select * from people order by name asc");
    return rows.map(mapRow);
  },

  async get(id) {
    const db = await getDb();
    const rows = await db.select<PersonRow[]>("select * from people where id = ?", [id]);
    return rows[0] ? mapRow(rows[0]) : null;
  },

  async create(input) {
    const db = await getDb();
    const id = newId();
    const now = nowIso();
    await db.execute(
      `insert into people
        (id, name, email, avatar_url, role, status, start_date, end_date, expected_graduation,
         research_interests, skills, bio, website_url, github_url, google_scholar_url, notes,
         created_at, updated_at)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.name,
        input.email ?? null,
        input.avatar_url ?? null,
        input.role ?? "PhD",
        input.status ?? "active",
        input.start_date ?? null,
        input.end_date ?? null,
        input.expected_graduation ?? null,
        toJsonArray(input.research_interests ?? []),
        toJsonArray(input.skills ?? []),
        input.bio ?? null,
        input.website_url ?? null,
        input.github_url ?? null,
        input.google_scholar_url ?? null,
        input.notes ?? null,
        now,
        now,
      ],
    );
    const created = await peopleRepository.get(id);
    if (!created) throw new Error("Failed to create person");
    return created;
  },

  async update(id, patch) {
    const db = await getDb();
    const dbPatch: Record<string, unknown> = { ...patch };
    if (patch.research_interests !== undefined)
      dbPatch.research_interests = toJsonArray(patch.research_interests);
    if (patch.skills !== undefined) dbPatch.skills = toJsonArray(patch.skills);
    const { clause, values } = buildSetClause(dbPatch);
    if (clause) {
      await db.execute(`update people set ${clause} where id = ?`, [...values, id]);
    }
    const updated = await peopleRepository.get(id);
    if (!updated) throw new Error("Person not found");
    return updated;
  },

  async remove(id) {
    const db = await getDb();
    await db.execute("delete from people where id = ?", [id]);
  },
};
