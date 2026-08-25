import { getDb } from "../db/client";
import { peopleRepository } from "./peopleRepository";
import { projectRepository } from "./projectRepository";
import { publicationRepository } from "./publicationRepository";
import { grantRepository } from "./grantRepository";
import { meetingRepository } from "./meetingRepository";
import { workspaceRepository } from "./workspaceRepository";

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]!);
  const escape = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(",")),
  ];
  return lines.join("\n");
}

export type ExportFormat = "json" | "csv" | "markdown";

export interface ExportRepository {
  exportProjects(format: "json" | "csv"): Promise<string>;
  exportPeople(format: "json" | "csv"): Promise<string>;
  exportPublications(format: "json" | "csv"): Promise<string>;
  exportGrants(format: "json" | "csv"): Promise<string>;
  exportMeetings(format: "json" | "markdown"): Promise<string>;
  exportWorkspace(): Promise<string>;
}

export const exportRepository: ExportRepository = {
  async exportProjects(format) {
    const projects = await projectRepository.list({ includeArchived: true });
    return format === "csv"
      ? toCsv(projects as unknown as Record<string, unknown>[])
      : JSON.stringify(projects, null, 2);
  },

  async exportPeople(format) {
    const people = await peopleRepository.list();
    return format === "csv"
      ? toCsv(people as unknown as Record<string, unknown>[])
      : JSON.stringify(people, null, 2);
  },

  async exportPublications(format) {
    const publications = await publicationRepository.list();
    const rows = publications.map((p) => ({
      ...p,
      authors: p.authors.map((a) => a.name).join("; "),
    }));
    return format === "csv" ? toCsv(rows) : JSON.stringify(publications, null, 2);
  },

  async exportGrants(format) {
    const grants = await grantRepository.list();
    const rows = grants.map((g) => ({
      ...g,
      pi: g.pi?.name ?? "",
      members: g.members.map((m) => m.name).join("; "),
    }));
    return format === "csv" ? toCsv(rows) : JSON.stringify(grants, null, 2);
  },

  async exportMeetings(format) {
    const meetings = await meetingRepository.list();
    if (format === "json") return JSON.stringify(meetings, null, 2);

    const lines: string[] = [];
    for (const m of meetings) {
      lines.push(`# ${m.title}`);
      lines.push("");
      lines.push(`**Date:** ${new Date(m.meeting_date).toLocaleString()}`);
      if (m.project) lines.push(`**Project:** ${m.project.title}`);
      if (m.attendees.length)
        lines.push(`**Attendees:** ${m.attendees.map((a) => a.name).join(", ")}`);
      lines.push("");
      if (m.progress) lines.push(`## Progress\n\n${m.progress}\n`);
      if (m.results) lines.push(`## Results\n\n${m.results}\n`);
      if (m.blockers) lines.push(`## Blockers\n\n${m.blockers}\n`);
      if (m.decisions) lines.push(`## Decisions\n\n${m.decisions}\n`);
      if (m.next_steps) lines.push(`## Next Steps\n\n${m.next_steps}\n`);
      lines.push("---\n");
    }
    return lines.join("\n");
  },

  async exportWorkspace() {
    const db = await getDb();
    const [
      workspace,
      people,
      projects,
      projectMembers,
      projectUpdates,
      milestones,
      meetings,
      meetingAttendees,
      actionItems,
      publications,
      publicationAuthors,
      grants,
      grantMembers,
      attachments,
    ] = await Promise.all([
      workspaceRepository.get(),
      db.select("select * from people"),
      db.select("select * from projects"),
      db.select("select * from project_members"),
      db.select("select * from project_updates"),
      db.select("select * from milestones"),
      db.select("select * from meetings"),
      db.select("select * from meeting_attendees"),
      db.select("select * from action_items"),
      db.select("select * from publications"),
      db.select("select * from publication_authors"),
      db.select("select * from grants"),
      db.select("select * from grant_members"),
      db.select("select * from attachments"),
    ]);

    return JSON.stringify(
      {
        exported_at: new Date().toISOString(),
        workspace,
        people,
        projects,
        project_members: projectMembers,
        project_updates: projectUpdates,
        milestones,
        meetings,
        meeting_attendees: meetingAttendees,
        action_items: actionItems,
        publications,
        publication_authors: publicationAuthors,
        grants,
        grant_members: grantMembers,
        attachments,
      },
      null,
      2,
    );
  },
};
