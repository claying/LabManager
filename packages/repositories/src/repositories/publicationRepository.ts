import type {
  Publication,
  PublicationUpdatePatch,
  PublicationWithRelations,
  VenueCycleWithVenue,
} from "@pi-os/types";
import type { PublicationInput } from "@pi-os/domain";
import { getDb } from "../db/client";
import { buildSetClause, newId, nowIso } from "../db/util";
import { venueCycleRepository } from "./venueRepository";

export interface PublicationRepository {
  list(opts?: { projectId?: string }): Promise<PublicationWithRelations[]>;
  get(id: string): Promise<PublicationWithRelations | null>;
  create(input: PublicationInput): Promise<Publication>;
  update(id: string, patch: PublicationUpdatePatch): Promise<Publication>;
  setAuthors(publicationId: string, personIds: string[]): Promise<void>;
  remove(id: string): Promise<void>;
}

interface Row extends Publication {
  project_title: string | null;
}

async function attachRelations(
  db: Awaited<ReturnType<typeof getDb>>,
  rows: Row[],
): Promise<PublicationWithRelations[]> {
  const result: PublicationWithRelations[] = [];
  for (const row of rows) {
    const { project_title, ...pub } = row;
    const authorRows = await db.select<
      {
        id: string;
        name: string;
        avatar_url: string | null;
        role: string;
        author_order: number;
        is_corresponding: number;
        is_equal_contribution: number;
      }[]
    >(
      `select p.id, p.name, p.avatar_url, p.role, pa.author_order, pa.is_corresponding, pa.is_equal_contribution
       from publication_authors pa
       join people p on p.id = pa.person_id
       where pa.publication_id = ?
       order by pa.author_order asc`,
      [pub.id],
    );
    let targetVenueCycle: VenueCycleWithVenue | null = null;
    if (pub.target_venue_cycle_id) {
      targetVenueCycle = await venueCycleRepository.get(pub.target_venue_cycle_id);
    }
    result.push({
      ...pub,
      project:
        pub.project_id && project_title ? { id: pub.project_id, title: project_title } : null,
      authors: authorRows.map((a) => ({
        id: a.id,
        name: a.name,
        avatar_url: a.avatar_url,
        role: a.role as PublicationWithRelations["authors"][number]["role"],
        author_order: a.author_order,
        is_corresponding: a.is_corresponding === 1,
        is_equal_contribution: a.is_equal_contribution === 1,
      })),
      targetVenueCycle,
    });
  }
  return result;
}

export const publicationRepository: PublicationRepository = {
  async list(opts = {}) {
    const db = await getDb();
    const where = opts.projectId ? "where pub.project_id = ?" : "";
    const values = opts.projectId ? [opts.projectId] : [];
    const rows = await db.select<Row[]>(
      `select pub.*, pr.title as project_title
       from publications pub
       left join projects pr on pr.id = pub.project_id
       ${where}
       order by pub.submission_deadline is null, pub.submission_deadline asc`,
      values,
    );
    return attachRelations(db, rows);
  },

  async get(id) {
    const db = await getDb();
    const rows = await db.select<Row[]>(
      `select pub.*, pr.title as project_title from publications pub left join projects pr on pr.id = pub.project_id where pub.id = ?`,
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
      `insert into publications
        (id, project_id, title, status, venue, submission_deadline, submission_date, acceptance_date, publication_date,
         doi, arxiv_url, overleaf_url, code_url, paper_url, notes, target_venue_cycle_id, created_at, updated_at)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.project_id ?? null,
        input.title,
        input.status ?? "idea",
        input.venue ?? null,
        input.submission_deadline ?? null,
        input.submission_date ?? null,
        input.acceptance_date ?? null,
        input.publication_date ?? null,
        input.doi ?? null,
        input.arxiv_url ?? null,
        input.overleaf_url ?? null,
        input.code_url ?? null,
        input.paper_url ?? null,
        input.notes ?? null,
        input.target_venue_cycle_id ?? null,
        now,
        now,
      ],
    );
    if (input.author_person_ids.length > 0) {
      await publicationRepository.setAuthors(id, input.author_person_ids);
    }
    const rows = await db.select<Publication[]>("select * from publications where id = ?", [id]);
    return rows[0]!;
  },

  async update(id, patch) {
    const db = await getDb();
    const { clause, values } = buildSetClause(patch);
    if (clause) await db.execute(`update publications set ${clause} where id = ?`, [...values, id]);
    const rows = await db.select<Publication[]>("select * from publications where id = ?", [id]);
    if (!rows[0]) throw new Error("Publication not found");
    return rows[0];
  },

  async setAuthors(publicationId, personIds) {
    const db = await getDb();
    await db.execute("delete from publication_authors where publication_id = ?", [publicationId]);
    let order = 1;
    for (const personId of personIds) {
      await db.execute(
        "insert into publication_authors (id, publication_id, person_id, author_order) values (?, ?, ?, ?)",
        [newId(), publicationId, personId, order++],
      );
    }
  },

  async remove(id) {
    const db = await getDb();
    await db.execute("delete from publications where id = ?", [id]);
  },
};
