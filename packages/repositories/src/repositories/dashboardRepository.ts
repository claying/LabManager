import type {
  ActionItemWithRelations,
  GrantWithRelations,
  MeetingWithRelations,
  MilestoneWithOwner,
  Person,
  ProjectListItem,
  ProjectUpdateWithAuthor,
  PublicationWithRelations,
} from "@pi-os/types";
import { getWeekRange } from "@pi-os/domain";
import { getDb } from "../db/client";
import { projectRepository } from "./projectRepository";
import { peopleRepository } from "./peopleRepository";
import { publicationRepository } from "./publicationRepository";
import { grantRepository } from "./grantRepository";
import { actionItemRepository } from "./actionItemRepository";
import { meetingRepository } from "./meetingRepository";

export interface DashboardMilestone extends MilestoneWithOwner {
  project_id: string;
  project_title: string;
}

export interface DashboardData {
  projects: ProjectListItem[];
  people: Person[];
  openMilestones: DashboardMilestone[];
  publications: PublicationWithRelations[];
  grants: GrantWithRelations[];
  openActionItems: ActionItemWithRelations[];
  recentUpdates: (ProjectUpdateWithAuthor & { project_title: string })[];
  recentMeetings: MeetingWithRelations[];
  projectMemberships: { person_id: string; project_archived: boolean }[];
}

/** One-shot fetch of everything the PI Dashboard needs, all from local SQLite. */
export async function getDashboardData(): Promise<DashboardData> {
  const db = await getDb();

  const [projects, people, publications, grants, openActionItems, recentMeetings] =
    await Promise.all([
      projectRepository.list(),
      peopleRepository.list(),
      publicationRepository.list(),
      grantRepository.list(),
      actionItemRepository.list({ openOnly: true }),
      meetingRepository.list({ limit: 8 }),
    ]);

  const activeProjectIds = projects.filter((p) => !p.archived).map((p) => p.id);

  let openMilestones: DashboardMilestone[] = [];
  let recentUpdates: (ProjectUpdateWithAuthor & { project_title: string })[] = [];
  let projectMemberships: { person_id: string; project_archived: boolean }[] = [];

  if (activeProjectIds.length > 0) {
    const placeholders = activeProjectIds.map(() => "?").join(",");

    const milestoneRows = await db.select<
      (DashboardMilestone & {
        owner_name: string | null;
        owner_avatar_url: string | null;
        owner_role: string | null;
      })[]
    >(
      `select m.*, pr.title as project_title, p.name as owner_name, p.avatar_url as owner_avatar_url, p.role as owner_role
       from milestones m
       join projects pr on pr.id = m.project_id
       left join people p on p.id = m.owner_person_id
       where m.project_id in (${placeholders}) and m.status in ('planned', 'in_progress')`,
      activeProjectIds,
    );
    openMilestones = milestoneRows.map((row) => {
      const { owner_name, owner_avatar_url, owner_role, ...m } = row;
      return {
        ...m,
        owner: owner_name
          ? {
              id: m.owner_person_id!,
              name: owner_name,
              avatar_url: owner_avatar_url,
              role: owner_role as Person["role"],
            }
          : null,
      };
    });

    const updateRows = await db.select<
      (ProjectUpdateWithAuthor & {
        project_title: string;
        author_name: string | null;
        author_avatar_url: string | null;
        author_role: string | null;
      })[]
    >(
      `select u.*, pr.title as project_title, p.name as author_name, p.avatar_url as author_avatar_url, p.role as author_role
       from project_updates u
       join projects pr on pr.id = u.project_id
       left join people p on p.id = u.author_person_id
       where u.project_id in (${placeholders})
       order by u.created_at desc
       limit 10`,
      activeProjectIds,
    );
    recentUpdates = updateRows.map((row) => {
      const { author_name, author_avatar_url, author_role, ...u } = row;
      return {
        ...u,
        author: author_name
          ? {
              id: u.author_person_id!,
              name: author_name,
              avatar_url: author_avatar_url,
              role: author_role as Person["role"],
            }
          : null,
      };
    });

    projectMemberships = await db
      .select<{ person_id: string; project_archived: number }[]>(
        `select pm.person_id, pr.archived as project_archived
       from project_members pm
       join projects pr on pr.id = pm.project_id
       where pm.left_at is null`,
      )
      .then((rows) =>
        rows.map((r) => ({
          person_id: r.person_id,
          project_archived: Boolean(r.project_archived),
        })),
      );
  }

  return {
    projects,
    people,
    openMilestones,
    publications,
    grants,
    openActionItems,
    recentUpdates,
    recentMeetings,
    projectMemberships,
  };
}

export interface WeekSummary {
  updates: number;
  decisions: number;
  milestones: number;
}

/** The Home screen's compact "This week" line (SPEC_followup section 5) — three counts, nothing else. */
export async function getThisWeekSummary(now: Date = new Date()): Promise<WeekSummary> {
  const db = await getDb();
  const { weekStart, weekEnd } = getWeekRange(now);
  const start = `${weekStart}T00:00:00.000Z`;
  const endExclusiveDate = new Date(`${weekEnd}T00:00:00.000Z`);
  endExclusiveDate.setUTCDate(endExclusiveDate.getUTCDate() + 1);
  const endExclusive = endExclusiveDate.toISOString();

  const [updates, decisions, milestones] = await Promise.all([
    db.select<{ n: number }[]>(
      "select count(*) as n from project_updates where created_at >= ? and created_at < ?",
      [start, endExclusive],
    ),
    db.select<{ n: number }[]>(
      "select count(*) as n from decision_requests where status = 'resolved' and resolved_at >= ? and resolved_at < ?",
      [start, endExclusive],
    ),
    db.select<{ n: number }[]>(
      "select count(*) as n from milestones where completed_at >= ? and completed_at < ?",
      [start, endExclusive],
    ),
  ]);

  return {
    updates: updates[0]?.n ?? 0,
    decisions: decisions[0]?.n ?? 0,
    milestones: milestones[0]?.n ?? 0,
  };
}
