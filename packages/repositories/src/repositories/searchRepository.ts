import { getDb } from "../db/client";

export type SearchResultKind =
  | "project"
  | "person"
  | "project_update"
  | "meeting"
  | "publication"
  | "grant"
  | "decision_request"
  | "idea"
  | "research_question"
  | "hypothesis";

export interface SearchResult {
  kind: SearchResultKind;
  id: string;
  title: string;
  subtitle?: string;
}

const KIND_LABELS: Record<SearchResultKind, string> = {
  project: "PROJECT",
  person: "PERSON",
  project_update: "UPDATE",
  meeting: "MEETING",
  publication: "PUBLICATION",
  grant: "GRANT",
  decision_request: "DECISION",
  idea: "IDEA",
  research_question: "QUESTION",
  hypothesis: "HYPOTHESIS",
};

export { KIND_LABELS };

/**
 * Local FTS5 full-text search across projects, people, weekly updates,
 * meetings (including decisions — see SPEC_followup section 16), publications,
 * and grants. Entirely offline; `bm25()` ranks by relevance.
 */
export async function globalSearch(query: string, limit = 20): Promise<SearchResult[]> {
  const term = query.trim();
  if (term.length < 2) return [];

  const db = await getDb();
  // FTS5 query syntax treats bare terms as AND by default and doesn't like
  // dangling punctuation; a simple prefix-match per word keeps this forgiving
  // for a PI typing half a phrase.
  const ftsQuery = term
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => `${word.replace(/["*]/g, "")}*`)
    .join(" ");

  const rows = await db.select<
    { entity_type: SearchResultKind; entity_id: string; title: string; body: string }[]
  >(
    `select entity_type, entity_id, title, body
     from search_index
     where search_index match ?
     order by bm25(search_index)
     limit ?`,
    [ftsQuery, limit],
  );

  return rows.map((row) => ({
    kind: row.entity_type,
    id: row.entity_id,
    title: row.title,
    subtitle: row.body ? row.body.slice(0, 80) : undefined,
  }));
}
