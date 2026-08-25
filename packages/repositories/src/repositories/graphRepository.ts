import { getDb } from "../db/client";

export type GraphNodeKind = "project" | "person" | "publication" | "grant" | "idea";

export interface GraphNode {
  id: string;
  kind: GraphNodeKind;
  label: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  label: string;
}

export interface GraphNeighborhood {
  center: GraphNode;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

function dedupeNodes(nodes: GraphNode[]): GraphNode[] {
  const seen = new Map<string, GraphNode>();
  for (const n of nodes) seen.set(`${n.kind}:${n.id}`, n);
  return [...seen.values()];
}

/**
 * The Relationship Graph is deliberately 1-hop only (per Tier 3 section 3):
 * this returns the selected entity plus everything directly connected to
 * it, never the whole lab graph. Reuses the same relation queries as the
 * "Related" summary — this is just their data reshaped as nodes/edges.
 */
export const graphRepository = {
  async getNeighborhood(kind: GraphNodeKind, id: string): Promise<GraphNeighborhood> {
    const db = await getDb();
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    let center: GraphNode | null = null;

    if (kind === "project") {
      const projectRows = await db.select<{ id: string; title: string }[]>(
        "select id, title from projects where id = ?",
        [id],
      );
      if (!projectRows[0]) throw new Error("Project not found");
      center = { id, kind: "project", label: projectRows[0].title };

      const people = await db.select<{ id: string; name: string; role: string }[]>(
        `select p.id, p.name, pm.role from project_members pm join people p on p.id = pm.person_id where pm.project_id = ? and pm.left_at is null`,
        [id],
      );
      for (const p of people) {
        nodes.push({ id: p.id, kind: "person", label: p.name });
        edges.push({ source: id, target: p.id, label: p.role });
      }

      const papers = await db.select<{ id: string; title: string }[]>(
        "select id, title from publications where project_id = ?",
        [id],
      );
      for (const p of papers) {
        nodes.push({ id: p.id, kind: "publication", label: p.title });
        edges.push({ source: id, target: p.id, label: "output" });
      }

      const grants = await db.select<{ id: string; title: string }[]>(
        `select g.id, g.title from grant_projects gp join grants g on g.id = gp.grant_id where gp.project_id = ?`,
        [id],
      );
      for (const g of grants) {
        nodes.push({ id: g.id, kind: "grant", label: g.title });
        edges.push({ source: g.id, target: id, label: "funds" });
      }

      const ideas = await db.select<{ id: string; title: string }[]>(
        "select id, title from ideas where related_project_id = ? or converted_project_id = ?",
        [id, id],
      );
      for (const i of ideas) {
        nodes.push({ id: i.id, kind: "idea", label: i.title });
        edges.push({ source: i.id, target: id, label: "relates to" });
      }

      const outgoing = await db.select<
        { related_project_id: string; title: string; relation_type: string }[]
      >(
        `select r.related_project_id, p.title, r.relation_type from project_relations r join projects p on p.id = r.related_project_id where r.project_id = ?`,
        [id],
      );
      for (const r of outgoing) {
        nodes.push({ id: r.related_project_id, kind: "project", label: r.title });
        edges.push({
          source: id,
          target: r.related_project_id,
          label: r.relation_type.replace(/_/g, " "),
        });
      }
      const incoming = await db.select<
        { project_id: string; title: string; relation_type: string }[]
      >(
        `select r.project_id, p.title, r.relation_type from project_relations r join projects p on p.id = r.project_id where r.related_project_id = ?`,
        [id],
      );
      for (const r of incoming) {
        nodes.push({ id: r.project_id, kind: "project", label: r.title });
        edges.push({ source: r.project_id, target: id, label: r.relation_type.replace(/_/g, " ") });
      }
    } else if (kind === "person") {
      const personRows = await db.select<{ id: string; name: string }[]>(
        "select id, name from people where id = ?",
        [id],
      );
      if (!personRows[0]) throw new Error("Person not found");
      center = { id, kind: "person", label: personRows[0].name };

      const projects = await db.select<{ id: string; title: string; role: string }[]>(
        `select p.id, p.title, pm.role from project_members pm join projects p on p.id = pm.project_id where pm.person_id = ? and pm.left_at is null`,
        [id],
      );
      for (const p of projects) {
        nodes.push({ id: p.id, kind: "project", label: p.title });
        edges.push({ source: id, target: p.id, label: p.role });
      }

      const papers = await db.select<{ id: string; title: string }[]>(
        `select p.id, p.title from publication_authors pa join publications p on p.id = pa.publication_id where pa.person_id = ?`,
        [id],
      );
      for (const p of papers) {
        nodes.push({ id: p.id, kind: "publication", label: p.title });
        edges.push({ source: id, target: p.id, label: "author" });
      }

      const grants = await db.select<{ id: string; title: string }[]>(
        "select id, title from grants where pi_person_id = ?",
        [id],
      );
      for (const g of grants) {
        nodes.push({ id: g.id, kind: "grant", label: g.title });
        edges.push({ source: id, target: g.id, label: "PI" });
      }
    } else if (kind === "publication") {
      const pubRows = await db.select<{ id: string; title: string; project_id: string | null }[]>(
        "select id, title, project_id from publications where id = ?",
        [id],
      );
      if (!pubRows[0]) throw new Error("Publication not found");
      center = { id, kind: "publication", label: pubRows[0].title };

      if (pubRows[0].project_id) {
        const proj = await db.select<{ id: string; title: string }[]>(
          "select id, title from projects where id = ?",
          [pubRows[0].project_id],
        );
        if (proj[0]) {
          nodes.push({ id: proj[0].id, kind: "project", label: proj[0].title });
          edges.push({ source: proj[0].id, target: id, label: "output" });
        }
      }

      const authors = await db.select<{ id: string; name: string }[]>(
        `select p.id, p.name from publication_authors pa join people p on p.id = pa.person_id where pa.publication_id = ?`,
        [id],
      );
      for (const a of authors) {
        nodes.push({ id: a.id, kind: "person", label: a.name });
        edges.push({ source: a.id, target: id, label: "author" });
      }
    } else if (kind === "grant") {
      const grantRows = await db.select<
        { id: string; title: string; pi_person_id: string | null }[]
      >("select id, title, pi_person_id from grants where id = ?", [id]);
      if (!grantRows[0]) throw new Error("Grant not found");
      center = { id, kind: "grant", label: grantRows[0].title };

      if (grantRows[0].pi_person_id) {
        const pi = await db.select<{ id: string; name: string }[]>(
          "select id, name from people where id = ?",
          [grantRows[0].pi_person_id],
        );
        if (pi[0]) {
          nodes.push({ id: pi[0].id, kind: "person", label: pi[0].name });
          edges.push({ source: pi[0].id, target: id, label: "PI" });
        }
      }
      const members = await db.select<{ id: string; name: string; role: string }[]>(
        `select p.id, p.name, gm.role from grant_members gm join people p on p.id = gm.person_id where gm.grant_id = ?`,
        [id],
      );
      for (const m of members) {
        nodes.push({ id: m.id, kind: "person", label: m.name });
        edges.push({ source: m.id, target: id, label: m.role });
      }
      const projects = await db.select<{ id: string; title: string }[]>(
        `select p.id, p.title from grant_projects gp join projects p on p.id = gp.project_id where gp.grant_id = ?`,
        [id],
      );
      for (const p of projects) {
        nodes.push({ id: p.id, kind: "project", label: p.title });
        edges.push({ source: id, target: p.id, label: "funds" });
      }
    } else if (kind === "idea") {
      const ideaRows = await db.select<
        {
          id: string;
          title: string;
          related_project_id: string | null;
          converted_project_id: string | null;
        }[]
      >("select id, title, related_project_id, converted_project_id from ideas where id = ?", [id]);
      if (!ideaRows[0]) throw new Error("Idea not found");
      center = { id, kind: "idea", label: ideaRows[0].title };

      const projectIds = [ideaRows[0].related_project_id, ideaRows[0].converted_project_id].filter(
        (v): v is string => Boolean(v),
      );
      for (const pid of new Set(projectIds)) {
        const proj = await db.select<{ id: string; title: string }[]>(
          "select id, title from projects where id = ?",
          [pid],
        );
        if (proj[0]) {
          nodes.push({ id: proj[0].id, kind: "project", label: proj[0].title });
          edges.push({
            source: id,
            target: proj[0].id,
            label: pid === ideaRows[0].converted_project_id ? "converted to" : "relates to",
          });
        }
      }
    }

    if (!center) throw new Error("Unknown entity");
    return { center, nodes: dedupeNodes(nodes), edges };
  },
};
