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
  | "hypothesis"
  | "file";

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
  file: "FILE",
};

export { KIND_LABELS };

/**
 * Local FTS5 full-text search across projects, people, weekly updates,
 * meetings (including decisions — see SPEC_followup section 16), publications,
 * grants, and indexed files. Entirely offline; `bm25()` ranks by relevance.
 */
export async function globalSearch(query: string, limit = 20): Promise<SearchResult[]> {
  const term = query.trim();
  if (term.length < 2) return [];

  const db = await getDb();
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

// ============================================================================
// Advanced structured search (Tier 3 section 8)
// ============================================================================

const FILTER_KEYS = ["project", "person", "type", "after", "before", "status", "venue"] as const;
export type SearchFilterKey = (typeof FILTER_KEYS)[number];
export type SearchFilters = Partial<Record<SearchFilterKey, string>>;

export interface ParsedSearchQuery {
  freeText: string;
  filters: SearchFilters;
}

const TYPE_ALIASES: Record<string, SearchResultKind> = {
  project: "project",
  person: "person",
  update: "project_update",
  meeting: "meeting",
  publication: "publication",
  paper: "publication",
  grant: "grant",
  decision: "decision_request",
  idea: "idea",
  question: "research_question",
  hypothesis: "hypothesis",
  file: "file",
};

/** Splits `project:GraphFM person:Alice foo bar` into structured filters + remaining free text. Quoted values (`project:"Graph FM"`) may contain spaces. */
export function parseSearchQuery(input: string): ParsedSearchQuery {
  const filters: SearchFilters = {};
  const tokenRe = /(\w+):("[^"]*"|\S+)/g;
  const consumed: [number, number][] = [];
  let match: RegExpExecArray | null;
  while ((match = tokenRe.exec(input))) {
    const key = match[1]?.toLowerCase();
    let value = match[2];
    if (key && value && (FILTER_KEYS as readonly string[]).includes(key)) {
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      filters[key as SearchFilterKey] = value;
      consumed.push([match.index, match.index + match[0].length]);
    }
  }
  let freeText = input;
  for (const [start, end] of [...consumed].reverse()) {
    freeText = freeText.slice(0, start) + freeText.slice(end);
  }
  return { freeText: freeText.replace(/\s+/g, " ").trim(), filters };
}

interface EnrichedRow {
  kind: SearchResultKind;
  id: string;
  title: string;
  body: string;
  projectId: string | null;
  personId: string | null;
  status: string | null;
  venue: string | null;
  date: string | null;
  matchRank: number; // lower = better FTS rank, 0 when there was no FTS query
}

const METADATA_QUERIES: Record<SearchResultKind, string> = {
  project:
    "select id, id as project_id, null as person_id, stage as status, null as venue, created_at as date from projects where id in (SET)",
  person:
    "select id, null as project_id, id as person_id, null as status, null as venue, created_at as date from people where id in (SET)",
  project_update:
    "select id, project_id, author_person_id as person_id, null as status, null as venue, created_at as date from project_updates where id in (SET)",
  meeting:
    "select id, project_id, null as person_id, null as status, null as venue, meeting_date as date from meetings where id in (SET)",
  publication:
    "select id, project_id, null as person_id, status, venue, created_at as date from publications where id in (SET)",
  grant:
    "select id, (select project_id from grant_projects where grant_id = grants.id limit 1) as project_id, pi_person_id as person_id, status, null as venue, created_at as date from grants where id in (SET)",
  decision_request:
    "select id, project_id, person_id, status, null as venue, created_at as date from decision_requests where id in (SET)",
  idea: "select id, related_project_id as project_id, null as person_id, state as status, null as venue, created_at as date from ideas where id in (SET)",
  research_question:
    "select id, project_id, null as person_id, status, null as venue, created_at as date from research_questions where id in (SET)",
  hypothesis:
    "select id, project_id, null as person_id, status, null as venue, created_at as date from hypotheses where id in (SET)",
  file: "select id, project_id, null as person_id, null as status, null as venue, created_at as date from file_index where id in (SET)",
};

/**
 * Deterministic advanced search: parses `key:value` filter tokens out of
 * the query, runs FTS on whatever free text remains (or lists candidate
 * rows directly per-type when there's no free text), enriches each result
 * with its real project/person/status/venue/date, then filters and ranks:
 * exact title match, then prefix match, then FTS relevance, then recency.
 * No semantic ranking, nothing fuzzy.
 */
export async function advancedSearch(
  rawQuery: string,
  opts: { limit?: number } = {},
): Promise<SearchResult[]> {
  const { freeText, filters } = parseSearchQuery(rawQuery);
  const limit = opts.limit ?? 100;
  const db = await getDb();

  const typeFilter = filters.type ? TYPE_ALIASES[filters.type.toLowerCase()] : undefined;
  const kinds: SearchResultKind[] = typeFilter
    ? [typeFilter]
    : (Object.keys(KIND_LABELS) as SearchResultKind[]);

  let candidates: {
    kind: SearchResultKind;
    id: string;
    title: string;
    body: string;
    rank: number;
  }[];

  if (freeText.length >= 2) {
    const ftsQuery = freeText
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => `${word.replace(/["*]/g, "")}*`)
      .join(" ");
    const rows = await db.select<
      {
        entity_type: SearchResultKind;
        entity_id: string;
        title: string;
        body: string;
        rank: number;
      }[]
    >(
      `select entity_type, entity_id, title, body, bm25(search_index) as rank
       from search_index
       where search_index match ? and entity_type in (${kinds.map(() => "?").join(",")})
       order by bm25(search_index)
       limit 500`,
      [ftsQuery, ...kinds],
    );
    candidates = rows.map((r) => ({
      kind: r.entity_type,
      id: r.entity_id,
      title: r.title,
      body: r.body,
      rank: r.rank,
    }));
  } else {
    // No free text — a pure filter query (e.g. "project:GraphFM type:decision")
    // lists candidates directly rather than requiring an FTS match term.
    candidates = [];
    for (const kind of kinds) {
      const rows = await db.select<
        { entity_type: SearchResultKind; entity_id: string; title: string; body: string }[]
      >(
        "select entity_type, entity_id, title, body from search_index where entity_type = ? limit 500",
        [kind],
      );
      candidates.push(
        ...rows.map((r) => ({
          kind: r.entity_type,
          id: r.entity_id,
          title: r.title,
          body: r.body,
          rank: 0,
        })),
      );
    }
  }
  if (candidates.length === 0) return [];

  const byKind = new Map<SearchResultKind, string[]>();
  for (const c of candidates) {
    const arr = byKind.get(c.kind) ?? [];
    arr.push(c.id);
    byKind.set(c.kind, arr);
  }

  const metaById = new Map<
    string,
    {
      projectId: string | null;
      personId: string | null;
      status: string | null;
      venue: string | null;
      date: string | null;
    }
  >();
  for (const [kind, ids] of byKind) {
    if (ids.length === 0) continue;
    const sql = METADATA_QUERIES[kind].replace("SET", ids.map(() => "?").join(","));
    const rows = await db.select<
      {
        id: string;
        project_id: string | null;
        person_id: string | null;
        status: string | null;
        venue: string | null;
        date: string | null;
      }[]
    >(sql, ids);
    for (const r of rows) {
      metaById.set(`${kind}:${r.id}`, {
        projectId: r.project_id,
        personId: r.person_id,
        status: r.status,
        venue: r.venue,
        date: r.date,
      });
    }
  }

  let enriched: EnrichedRow[] = candidates.map((c) => {
    const meta = metaById.get(`${c.kind}:${c.id}`);
    return {
      kind: c.kind,
      id: c.id,
      title: c.title,
      body: c.body,
      projectId: meta?.projectId ?? null,
      personId: meta?.personId ?? null,
      status: meta?.status ?? null,
      venue: meta?.venue ?? null,
      date: meta?.date ?? null,
      matchRank: c.rank,
    };
  });

  if (filters.project) {
    const needle = filters.project.toLowerCase();
    const projectRows = await db.select<{ id: string; title: string; short_name: string | null }[]>(
      "select id, title, short_name from projects where lower(title) like ? or lower(coalesce(short_name, '')) like ?",
      [`%${needle}%`, `%${needle}%`],
    );
    const matchingProjectIds = new Set(projectRows.map((p) => p.id));
    enriched = enriched.filter(
      (r) =>
        (r.kind === "project" && matchingProjectIds.has(r.id)) ||
        (r.projectId && matchingProjectIds.has(r.projectId)),
    );
  }
  if (filters.person) {
    const needle = filters.person.toLowerCase();
    const personRows = await db.select<{ id: string }[]>(
      "select id from people where lower(name) like ?",
      [`%${needle}%`],
    );
    const matchingPersonIds = new Set(personRows.map((p) => p.id));
    enriched = enriched.filter(
      (r) =>
        (r.kind === "person" && matchingPersonIds.has(r.id)) ||
        (r.personId && matchingPersonIds.has(r.personId)),
    );
  }
  if (filters.status) {
    const needle = filters.status.toLowerCase();
    enriched = enriched.filter((r) => r.status?.toLowerCase() === needle);
  }
  if (filters.venue) {
    const needle = filters.venue.toLowerCase();
    enriched = enriched.filter((r) => r.venue?.toLowerCase().includes(needle));
  }
  if (filters.after) {
    enriched = enriched.filter((r) => r.date !== null && r.date >= filters.after!);
  }
  if (filters.before) {
    enriched = enriched.filter((r) => r.date !== null && r.date <= filters.before!);
  }

  const queryLower = freeText.toLowerCase();
  enriched.sort((a, b) => {
    if (freeText) {
      const aExact = a.title.toLowerCase() === queryLower ? 0 : 1;
      const bExact = b.title.toLowerCase() === queryLower ? 0 : 1;
      if (aExact !== bExact) return aExact - bExact;
      const aPrefix = a.title.toLowerCase().startsWith(queryLower) ? 0 : 1;
      const bPrefix = b.title.toLowerCase().startsWith(queryLower) ? 0 : 1;
      if (aPrefix !== bPrefix) return aPrefix - bPrefix;
      if (a.matchRank !== b.matchRank) return a.matchRank - b.matchRank;
    }
    return (b.date ?? "").localeCompare(a.date ?? "");
  });

  return enriched.slice(0, limit).map((r) => ({
    kind: r.kind,
    id: r.id,
    title: r.title,
    subtitle: r.body ? r.body.slice(0, 80) : undefined,
  }));
}
