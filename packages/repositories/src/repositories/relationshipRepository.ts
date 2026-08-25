import type { RelatedEntityRef, RelatedSummary } from "@pi-os/types";
import { getDb } from "../db/client";

async function refs(
  db: Awaited<ReturnType<typeof getDb>>,
  sql: string,
  params: unknown[],
  kind: RelatedEntityRef["kind"],
): Promise<RelatedEntityRef[]> {
  const rows = await db.select<{ id: string; title: string }[]>(sql, params);
  return rows.map((r) => ({ id: r.id, title: r.title, kind }));
}

export interface RelationshipRepository {
  /** Everything connected to a project — powers the compact "Related" line and its expanded view on the project page. */
  getProjectRelated(projectId: string): Promise<RelatedSummary>;
  /** A lighter variant for the person page: projects, decisions, papers, and meetings this person is directly tied to. */
  getPersonRelated(personId: string): Promise<RelatedSummary>;
}

const EMPTY: RelatedSummary = {
  projects: [],
  decisions: [],
  meetings: [],
  papers: [],
  grants: [],
  ideas: [],
  questions: [],
  evidence: [],
};

export const relationshipRepository: RelationshipRepository = {
  async getProjectRelated(projectId) {
    const db = await getDb();
    const [relatedOut, relatedIn, decisions, meetings, papers, grants, ideas, questions, evidence] =
      await Promise.all([
        refs(
          db,
          `select p.id, p.title from project_relations r join projects p on p.id = r.related_project_id where r.project_id = ?`,
          [projectId],
          "project",
        ),
        refs(
          db,
          `select p.id, p.title from project_relations r join projects p on p.id = r.project_id where r.related_project_id = ?`,
          [projectId],
          "project",
        ),
        refs(
          db,
          `select id, coalesce(decision, title) as title from decision_requests where project_id = ?`,
          [projectId],
          "decision",
        ),
        refs(db, `select id, title from meetings where project_id = ?`, [projectId], "meeting"),
        refs(
          db,
          `select id, title from publications where project_id = ?`,
          [projectId],
          "publication",
        ),
        refs(
          db,
          `select g.id, g.title from grant_projects gp join grants g on g.id = gp.grant_id where gp.project_id = ?`,
          [projectId],
          "grant",
        ),
        refs(
          db,
          `select id, title from ideas where related_project_id = ? or converted_project_id = ?`,
          [projectId, projectId],
          "idea",
        ),
        refs(
          db,
          `select id, question as title from research_questions where project_id = ?`,
          [projectId],
          "research_question",
        ),
        refs(
          db,
          `select id, summary as title from evidence where project_id = ?`,
          [projectId],
          "evidence",
        ),
      ]);

    // De-dupe project ids that show up on both sides (a relation could
    // theoretically be declared in both directions between the same pair).
    const seen = new Set<string>();
    const projects = [...relatedOut, ...relatedIn].filter((p) =>
      seen.has(p.id) ? false : (seen.add(p.id), true),
    );

    return { projects, decisions, meetings, papers, grants, ideas, questions, evidence };
  },

  async getPersonRelated(personId) {
    const db = await getDb();
    const [ledProjects, memberProjects, decisions, papers, meetings, grants] = await Promise.all([
      refs(db, `select id, title from projects where lead_person_id = ?`, [personId], "project"),
      refs(
        db,
        `select p.id, p.title from project_members pm join projects p on p.id = pm.project_id where pm.person_id = ? and pm.left_at is null`,
        [personId],
        "project",
      ),
      refs(
        db,
        `select id, coalesce(decision, title) as title from decision_requests where person_id = ?`,
        [personId],
        "decision",
      ),
      refs(
        db,
        `select p.id, p.title from publication_authors pa join publications p on p.id = pa.publication_id where pa.person_id = ?`,
        [personId],
        "publication",
      ),
      refs(
        db,
        `select m.id, m.title from meeting_attendees ma join meetings m on m.id = ma.meeting_id where ma.person_id = ?`,
        [personId],
        "meeting",
      ),
      refs(db, `select id, title from grants where pi_person_id = ?`, [personId], "grant"),
    ]);
    const seen = new Set<string>();
    const projects = [...ledProjects, ...memberProjects].filter((p) =>
      seen.has(p.id) ? false : (seen.add(p.id), true),
    );
    return { ...EMPTY, projects, decisions, papers, meetings, grants };
  },
};
