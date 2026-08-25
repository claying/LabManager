export const queryKeys = {
  workspace: ["workspace"] as const,
  people: {
    list: ["people"] as const,
    stats: ["people", "stats"] as const,
    detail: (personId: string) => ["people", "detail", personId] as const,
    profile: (personId: string) => ["people", "detail", personId, "profile"] as const,
  },
  projects: {
    list: (includeArchived: boolean) => ["projects", { includeArchived }] as const,
    detail: (projectId: string) => ["projects", "detail", projectId] as const,
    updates: (projectId: string) => ["projects", "detail", projectId, "updates"] as const,
    milestones: (projectId: string) => ["projects", "detail", projectId, "milestones"] as const,
  },
  meetings: {
    list: (projectId?: string) => ["meetings", { projectId: projectId ?? null }] as const,
    detail: (meetingId: string) => ["meetings", "detail", meetingId] as const,
  },
  publications: {
    list: (projectId?: string) => ["publications", { projectId: projectId ?? null }] as const,
    detail: (publicationId: string) => ["publications", "detail", publicationId] as const,
  },
  grants: {
    list: ["grants"] as const,
    detail: (grantId: string) => ["grants", "detail", grantId] as const,
  },
  actionItems: {
    list: (filters?: Record<string, unknown>) => ["action-items", filters ?? {}] as const,
  },
  attachments: (entityType: string, entityId: string) =>
    ["attachments", entityType, entityId] as const,
  dashboard: ["dashboard"] as const,
  search: (term: string) => ["search", term] as const,
  git: (path: string) => ["git", path] as const,
  decisions: {
    list: (filters?: Record<string, unknown>) => ["decisions", filters ?? {}] as const,
    detail: (id: string) => ["decisions", "detail", id] as const,
  },
  ideas: {
    list: (state?: string) => ["ideas", state ?? "all"] as const,
    detail: (id: string) => ["ideas", "detail", id] as const,
  },
  timeline: (projectId: string) => ["timeline", projectId] as const,
  inbox: ["inbox"] as const,
  weeklyReview: {
    preview: ["weekly-review", "preview"] as const,
    list: ["weekly-review", "list"] as const,
    detail: (weekStart: string) => ["weekly-review", "detail", weekStart] as const,
  },
  settings: {
    backupDirectory: ["settings", "backup-directory"] as const,
    backupRetention: ["settings", "backup-retention"] as const,
    lastBackupAt: ["settings", "last-backup-at"] as const,
    backups: (directory: string) => ["settings", "backups", directory] as const,
    databaseInfo: ["settings", "database-info"] as const,
  },
  researchQuestions: {
    list: (projectId: string) => ["research-questions", projectId] as const,
    detail: (id: string) => ["research-questions", "detail", id] as const,
  },
  hypotheses: {
    list: (projectId: string) => ["hypotheses", projectId] as const,
    forQuestion: (questionId: string) => ["hypotheses", "for-question", questionId] as const,
    detail: (id: string) => ["hypotheses", "detail", id] as const,
  },
  venues: {
    list: ["venues"] as const,
  },
  venueCycles: {
    list: (upcomingOnly?: boolean) =>
      ["venue-cycles", { upcomingOnly: upcomingOnly ?? false }] as const,
    detail: (id: string) => ["venue-cycles", "detail", id] as const,
  },
  submissionPlan: (publicationId: string) => ["submission-plan", publicationId] as const,
  submissionHealth: (publicationId: string) => ["submission-health", publicationId] as const,
  paperReadiness: (publicationId: string) => ["paper-readiness", publicationId] as const,
  portfolio: {
    stageDistribution: ["portfolio", "stage-distribution"] as const,
    stageAging: ["portfolio", "stage-aging"] as const,
    movement: (weeks: number) => ["portfolio", "movement", weeks] as const,
    healthTrend: (weeks: number) => ["portfolio", "health-trend", weeks] as const,
    deadlineLoad: (weeks: number) => ["portfolio", "deadline-load", weeks] as const,
    submissionLoad: (months: number) => ["portfolio", "submission-load", months] as const,
    activity: (weeks: number) => ["portfolio", "activity", weeks] as const,
  },
  supervision: {
    rhythm: ["supervision", "rhythm"] as const,
    projectLoad: ["supervision", "project-load"] as const,
    interaction: (weeks: number) => ["supervision", "interaction", weeks] as const,
  },
} as const;
