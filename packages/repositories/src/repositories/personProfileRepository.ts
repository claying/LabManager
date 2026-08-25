import type {
  ActionItemWithRelations,
  MeetingWithRelations,
  MilestoneWithOwner,
  Person,
  PersonRole,
  ProjectListItem,
  ProjectUpdateWithAuthor,
  PublicationWithRelations,
} from "@pi-os/types";
import { getDb } from "../db/client";

export interface PersonProfileData {
  activeProjects: (ProjectListItem & { role: string })[];
  ledProjects: ProjectListItem[];
  publications: PublicationWithRelations[];
  upcomingMilestones: MilestoneWithOwner[];
  recentMeetings: MeetingWithRelations[];
  recentUpdates: (ProjectUpdateWithAuthor & { project_title: string })[];
  actionItems: ActionItemWithRelations[];
}

export async function getPersonProfileData(person: Person): Promise<PersonProfileData> {
  const db = await getDb();

  const activeProjectRows = await db.select<
    (ProjectListItem & {
      role: string;
      lead_id: string | null;
      lead_name: string | null;
      lead_avatar_url: string | null;
      lead_role: string | null;
      member_count: number;
    })[]
  >(
    `select p.*, pm.role as role,
       lp.id as lead_id, lp.name as lead_name, lp.avatar_url as lead_avatar_url, lp.role as lead_role,
       (select count(*) from project_members x where x.project_id = p.id and x.left_at is null) as member_count
     from project_members pm
     join projects p on p.id = pm.project_id
     left join people lp on lp.id = p.lead_person_id
     where pm.person_id = ? and pm.left_at is null and p.archived = 0`,
    [person.id],
  );
  const activeProjects = activeProjectRows.map((row) => {
    const { lead_id, lead_name, lead_avatar_url, lead_role, role, archived, ...rest } = row;
    return {
      ...rest,
      archived: Boolean(archived),
      role,
      lead: lead_id
        ? {
            id: lead_id,
            name: lead_name!,
            avatar_url: lead_avatar_url,
            role: lead_role as PersonRole,
          }
        : null,
    };
  });
  const ledProjects = activeProjects.filter((p) => p.lead?.id === person.id);

  const pubRows = await db.select<{ id: string }[]>(
    `select distinct pub.id from publications pub join publication_authors pa on pa.publication_id = pub.id where pa.person_id = ?`,
    [person.id],
  );
  const publications: PublicationWithRelations[] = [];
  for (const { id } of pubRows) {
    const rows = await db.select<{ project_title: string | null } & Record<string, unknown>>(
      `select pub.*, pr.title as project_title from publications pub left join projects pr on pr.id = pub.project_id where pub.id = ?`,
      [id],
    );
    const row = (
      rows as unknown as {
        project_title: string | null;
        project_id: string | null;
        [k: string]: unknown;
      }[]
    )[0];
    if (!row) continue;
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
       from publication_authors pa join people p on p.id = pa.person_id where pa.publication_id = ? order by pa.author_order asc`,
      [id],
    );
    publications.push({
      ...(pub as unknown as PublicationWithRelations),
      project:
        pub.project_id && project_title
          ? { id: pub.project_id as string, title: project_title }
          : null,
      authors: authorRows.map((a) => ({
        id: a.id,
        name: a.name,
        avatar_url: a.avatar_url,
        role: a.role as PersonRole,
        author_order: a.author_order,
        is_corresponding: a.is_corresponding === 1,
        is_equal_contribution: a.is_equal_contribution === 1,
      })),
      targetVenueCycle: null,
    });
  }

  const milestoneRows = await db.select<
    (MilestoneWithOwner & {
      owner_name: string | null;
      owner_avatar_url: string | null;
      owner_role: string | null;
    })[]
  >(
    `select m.*, p.name as owner_name, p.avatar_url as owner_avatar_url, p.role as owner_role
     from milestones m
     join people p on p.id = m.owner_person_id
     where m.owner_person_id = ? and m.status in ('planned', 'in_progress')
     order by m.due_date is null, m.due_date asc
     limit 10`,
    [person.id],
  );
  const upcomingMilestones = milestoneRows.map((row) => {
    const { owner_name, owner_avatar_url, owner_role, ...m } = row;
    return {
      ...m,
      owner: {
        id: person.id,
        name: owner_name!,
        avatar_url: owner_avatar_url,
        role: owner_role as PersonRole,
      },
    };
  });

  const meetingIdRows = await db.select<{ meeting_id: string }[]>(
    `select meeting_id from meeting_attendees where person_id = ? limit 20`,
    [person.id],
  );
  const recentMeetings: MeetingWithRelations[] = [];
  for (const { meeting_id } of meetingIdRows) {
    const rows = await db.select<Record<string, unknown>[]>(
      `select m.*, pr.title as project_title from meetings m left join projects pr on pr.id = m.project_id where m.id = ?`,
      [meeting_id],
    );
    const row = rows[0];
    if (!row) continue;
    const { project_title, ...meeting } = row as {
      project_title: string | null;
      project_id: string | null;
      id: string;
      [k: string]: unknown;
    };
    const attendeeRows = await db.select<
      { id: string; name: string; avatar_url: string | null; role: string }[]
    >(
      `select p.id, p.name, p.avatar_url, p.role from meeting_attendees ma join people p on p.id = ma.person_id where ma.meeting_id = ?`,
      [meeting_id],
    );
    recentMeetings.push({
      ...(meeting as unknown as MeetingWithRelations),
      project:
        meeting.project_id && project_title
          ? { id: meeting.project_id as string, title: project_title }
          : null,
      attendees: attendeeRows.map((a) => ({ ...a, role: a.role as PersonRole })),
    });
  }
  recentMeetings.sort((a, b) => (a.meeting_date < b.meeting_date ? 1 : -1));

  const updateRows = await db.select<(ProjectUpdateWithAuthor & { project_title: string })[]>(
    `select u.*, p.title as project_title
     from project_updates u
     join projects p on p.id = u.project_id
     where u.author_person_id = ?
     order by u.created_at desc
     limit 10`,
    [person.id],
  );
  const recentUpdates = updateRows.map((u) => ({
    ...u,
    author: { id: person.id, name: person.name, avatar_url: person.avatar_url, role: person.role },
  }));

  const actionItemRows = await db.select<
    (ActionItemWithRelations & { project_title: string | null })[]
  >(
    `select a.*, pr.title as project_title
     from action_items a
     left join projects pr on pr.id = a.project_id
     where a.assignee_person_id = ?
     order by a.due_date is null, a.due_date asc`,
    [person.id],
  );
  const actionItems = actionItemRows.map((row) => {
    const { project_title, ...item } = row;
    return {
      ...item,
      assignee: {
        id: person.id,
        name: person.name,
        avatar_url: person.avatar_url,
        role: person.role,
      },
      project:
        item.project_id && project_title ? { id: item.project_id, title: project_title } : null,
    };
  });

  return {
    activeProjects,
    ledProjects,
    publications,
    upcomingMilestones,
    recentMeetings,
    recentUpdates,
    actionItems,
  };
}
