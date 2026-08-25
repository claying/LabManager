# Build a PI Research Management System

You are a senior full-stack engineer and product designer. Build a production-quality MVP of a research lab management application for Principal Investigators (PIs).

The product is a **PI Research OS** for managing:

- research projects
- students, postdocs, RAs, and collaborators
- project progress
- milestones
- weekly updates
- meetings
- publications
- grants
- research outputs
- project health and stalled projects

The system must support both:

1. a **Web application**
2. a **native Desktop application for macOS/Windows/Linux**

Both applications must share as much code, UI, types, domain logic, and backend infrastructure as reasonably possible.

Do not build two independent applications.

---

# 1. Product philosophy

This is NOT a generic Jira/Asana clone.

The primary abstraction is:

```text
People <-> Projects <-> Outputs
```

with supporting entities:

```text
Projects
├── Members
├── Milestones
├── Weekly Updates
├── Meetings
├── Publications
├── Grants
├── Links
└── Project Health
```

The primary user is a PI managing approximately:

- 5–30 researchers
- 10–50 active research projects
- many overlapping papers and collaborations

The application should answer these questions immediately:

1. Which projects need my attention?
2. Which projects have not been updated recently?
3. What is each student currently working on?
4. What is the next milestone for each project?
5. Which papers are approaching submission?
6. What happened since last week's meetings?
7. Which researchers are overloaded?
8. What deadlines are coming up?
9. What decisions were previously made on a project?
10. What is the overall research pipeline of the lab?

Optimize the UX for this workflow.

---

# 2. Technology stack

Use a monorepo.

Preferred structure:

```text
pi-research-os/

apps/
  web/
  desktop/

packages/
  ui/
  database/
  domain/
  types/
  config/

supabase/
  migrations/
  seed.sql

docs/
```

Use:

## Web

- Next.js latest stable
- App Router
- React
- TypeScript
- Tailwind CSS
- shadcn/ui

## Desktop

- Tauri 2
- Vite
- React
- TypeScript
- Tailwind CSS
- shadcn/ui

Do NOT embed the Next.js server application inside Tauri.

The desktop app should be a normal Tauri + Vite React application.

## Shared frontend

Share reusable components between Web and Desktop through:

```text
packages/ui
```

Share:

- design system
- forms
- cards
- project components
- people components
- status badges
- table components
- domain types
- validation schemas
- business logic

Do not put Next.js-specific code into shared packages.

## Backend

Use:

- Supabase
- PostgreSQL
- Supabase Auth
- Supabase Storage
- Row Level Security

Avoid building a separate backend server unless absolutely necessary.

Use Supabase directly for CRUD operations.

For Next.js authentication, follow the current recommended Supabase SSR authentication architecture.

For Tauri/Desktop, use the Supabase JavaScript client with persistent authentication appropriate for the desktop WebView.

Never expose a Supabase service-role key to either frontend.

## Data fetching

Use TanStack Query where client-side caching/mutations provide value.

Use an architecture that avoids duplicating data-access logic unnecessarily between Web and Desktop.

## Forms

Use:

- React Hook Form
- Zod

## Tables

Use:

- TanStack Table

## Drag and drop

Use:

- dnd-kit

only where needed, especially the research pipeline board.

## Icons

Use:

- Lucide

## Package manager

Use pnpm workspaces.

Use Turborepo if it simplifies the monorepo.

---

# 3. Design direction

The application should feel like a combination of:

- Linear
- Notion
- GitHub
- modern research software

but should NOT visually clone any of them.

Design principles:

- clean
- restrained
- academic
- information dense without feeling crowded
- fast navigation
- keyboard friendly
- excellent typography
- minimal visual noise

Use a left sidebar.

Suggested navigation:

```text
Overview
Projects
People
Publications
Meetings
Grants
```

Bottom sidebar:

```text
Lab Settings
Profile
```

Support:

- light mode
- dark mode
- system mode

Desktop and Web should look essentially identical.

Responsive design is required.

Desktop layouts should optimize for large screens.

---

# 4. Multi-lab architecture

Design the database from day one to support multiple independent labs.

A user may eventually belong to more than one lab.

Core hierarchy:

```text
User
  ↓
Lab Membership
  ↓
Lab
  ↓
Projects / People / Meetings / Publications / Grants
```

Every relevant row must belong to a lab.

Never rely only on frontend filtering for tenant isolation.

Implement Supabase Row Level Security correctly.

---

# 5. Roles

Initially support:

```text
owner
admin
member
guest
```

Typical mapping:

```text
owner  = PI
admin  = lab manager / senior researcher
member = PhD / Postdoc / RA
guest  = external collaborator
```

Permissions should roughly follow:

## Owner

Full lab control.

## Admin

Manage most lab resources but cannot delete the lab or transfer ownership.

## Member

Can view lab projects they are allowed to access and update projects in which they participate.

## Guest

Only sees projects explicitly shared with them.

Keep the authorization implementation clean enough to extend later.

---

# 6. Database schema

Implement proper relational PostgreSQL tables.

Use UUID primary keys.

Include:

```text
created_at
updated_at
created_by
```

where appropriate.

Create at minimum the following entities.

---

## profiles

Fields:

```text
id
full_name
avatar_url
email
headline
bio
created_at
updated_at
```

`id` should correspond to the Supabase auth user.

---

## labs

```text
id
name
slug
description
logo_url
owner_id
created_at
updated_at
```

---

## lab_members

```text
id
lab_id
user_id
role
joined_at
status
```

Unique:

```text
lab_id + user_id
```

---

## people

This represents people tracked by the PI.

A person may or may not have an application account.

Fields:

```text
id
lab_id
user_id nullable
name
email
avatar_url
role
status
start_date
end_date
expected_graduation
research_interests
skills
bio
website_url
github_url
google_scholar_url
notes
created_at
updated_at
```

Roles can include:

```text
PI
Postdoc
PhD
Master
RA
Research Assistant
Intern
Collaborator
Alumni
Other
```

Status:

```text
active
inactive
alumni
```

---

## projects

Fields:

```text
id
lab_id
title
short_name
description
lead_person_id
stage
health
priority
start_date
target_date
next_milestone
next_milestone_date
last_update_at
github_url
overleaf_url
drive_url
website_url
archived
created_at
updated_at
```

Stage:

```text
idea
prototype
baselines
main_experiments
ablation
writing
submitted
rebuttal
accepted
published
paused
```

Health:

```text
healthy
attention
at_risk
stalled
```

Priority:

```text
low
medium
high
critical
```

---

## project_members

Many-to-many relation:

```text
id
project_id
person_id
role
joined_at
left_at
```

Project role examples:

```text
lead
core_member
collaborator
advisor
```

---

## project_updates

Weekly/progress updates.

```text
id
project_id
author_person_id
summary
progress
blockers
next_steps
health
created_at
```

Allow Markdown/rich text content.

---

## milestones

```text
id
project_id
title
description
status
due_date
completed_at
owner_person_id
created_at
updated_at
```

Statuses:

```text
planned
in_progress
completed
cancelled
```

---

## meetings

```text
id
lab_id
project_id nullable
title
meeting_type
meeting_date
summary
progress
results
blockers
decisions
next_steps
created_at
updated_at
```

Meeting types:

```text
project
one_on_one
lab
collaboration
other
```

---

## meeting_attendees

```text
id
meeting_id
person_id
```

---

## action_items

```text
id
lab_id
project_id nullable
meeting_id nullable
assignee_person_id
title
description
status
priority
due_date
completed_at
created_at
updated_at
```

---

## publications

```text
id
lab_id
project_id nullable
title
status
venue
submission_deadline
submission_date
acceptance_date
publication_date
doi
arxiv_url
overleaf_url
code_url
paper_url
notes
created_at
updated_at
```

Status:

```text
idea
experiments
drafting
internal_review
submitted
rebuttal
accepted
published
withdrawn
```

---

## publication_authors

```text
id
publication_id
person_id
author_order
is_corresponding
is_equal_contribution
```

---

## grants

```text
id
lab_id
title
funder
program
status
deadline
start_date
end_date
amount
currency
pi_person_id
description
notes
created_at
updated_at
```

Status:

```text
idea
preparing
submitted
awarded
rejected
active
completed
```

---

## grant_members

```text
id
grant_id
person_id
role
```

---

# 7. RLS

Row Level Security is mandatory.

Create real RLS policies.

Rules:

- users cannot access labs they do not belong to
- owner/admin can manage lab resources
- members can read normal lab resources
- members can update projects they participate in where appropriate
- guests only access explicitly relevant projects
- unauthenticated users must not access private lab data

Do not simply disable RLS.

Document the policies.

Add SQL migrations.

---

# 8. Authentication

Implement:

- sign up
- sign in
- sign out
- forgot password
- session persistence

Initially support:

```text
email + password
```

Structure code so Google authentication can easily be added later.

After first login:

If the user has no lab, show onboarding:

```text
Create your lab
```

Fields:

```text
Lab name
Your name
Your role
```

Automatically create:

```text
lab
lab_members(owner)
people(PI)
```

---

# 9. Main PI Dashboard

Route:

```text
/dashboard
```

This is the most important page.

Create the following sections.

---

## Header

Example:

```text
Good afternoon, Alex
Here is what is happening across your lab.
```

Include:

- current date
- quick create button
- search / command palette

---

## KPI cards

Show:

```text
Active Projects
Active Researchers
Upcoming Deadlines
Projects Needing Attention
```

---

## Need Attention

Show projects matching signals such as:

- health = at_risk
- health = stalled
- next milestone overdue
- no project update for > 14 days

Each card should explain WHY it needs attention.

Example:

```text
GraphFM
No update for 18 days
Next milestone overdue by 4 days
Lead: Alice
```

---

## Research Pipeline

Visual board or compact visualization:

```text
Idea
Prototype
Baselines
Experiments
Ablation
Writing
Submitted
Rebuttal
```

Show number of projects in each stage.

Clicking a stage filters Projects.

---

## Upcoming

Timeline/list of the next 30–60 days:

- milestones
- paper deadlines
- grant deadlines
- action items

Sorted chronologically.

---

## Recent Updates

Show recent:

- project updates
- meeting decisions
- milestone completions

---

## People Load

Display active members and number of active projects per person.

Highlight potentially overloaded members.

Do NOT create a scientifically meaningless productivity score.

---

# 10. Projects page

Route:

```text
/projects
```

Support views:

### Table

Columns:

```text
Project
Lead
Members
Stage
Health
Priority
Next Milestone
Deadline
Last Update
```

Support:

- sorting
- filtering
- search
- hiding columns

### Pipeline Board

Columns grouped by stage.

Support drag/drop project stage changes.

### Attention view

Show:

```text
At risk
Stalled
Overdue milestone
No recent update
```

---

# 11. Project Detail

Route:

```text
/projects/[id]
```

The top section should show:

```text
Project title
Health
Stage
Priority

Lead
Members
Next milestone
Deadline
Last updated
```

Quick links:

```text
GitHub
Overleaf
Drive
Website
```

Tabs or sections:

```text
Overview
Updates
Milestones
Meetings
Publications
People
```

Overview should include:

### Project description

### Current milestone

### Recent progress

### Blockers

### Next steps

### Latest decisions

### Upcoming deadlines

### Members

Make adding a weekly update extremely easy.

---

# 12. Weekly Update UX

This workflow is critical.

From a project page, user clicks:

```text
Add Update
```

Form:

```text
What changed since the previous update?

Progress

Key results / findings

Blockers

Next steps

Project health
```

On submit:

- create project_update
- update project's last_update_at
- optionally update health
- optionally update next milestone

Display updates as a chronological journal.

---

# 13. People page

Route:

```text
/people
```

Provide:

### Card view

Avatar, role, active projects.

### Table view

Columns:

```text
Name
Role
Status
Projects
Project Lead Count
Start Date
Expected Graduation
Research Interests
```

Support filtering by:

```text
PhD
Postdoc
RA
Collaborator
Alumni
```

---

# 14. Person Profile

Route:

```text
/people/[id]
```

Show:

```text
Name
Role
Bio
Research interests
Skills
Start date
Expected graduation
Links
```

Then automatically aggregate:

```text
Active Projects
Led Projects
Publications
Upcoming Milestones
Recent Meetings
Recent Updates
Action Items
```

This page should function as a research profile rather than an HR employee page.

---

# 15. Meetings

Route:

```text
/meetings
```

Allow:

```text
New Meeting
```

Meeting template:

```text
Progress since last meeting

Results / Findings

Problems / Blockers

Decisions

Next actions
```

Meeting should link to:

```text
Project
Participants
```

Important:

Make the `Decisions` section visually distinct.

Research decisions should remain easy to retrieve months later.

---

# 16. Publications

Route:

```text
/publications
```

Views:

### Pipeline

```text
Idea
Experiments
Drafting
Internal Review
Submitted
Rebuttal
Accepted
Published
```

### Table

Columns:

```text
Title
Authors
Project
Target Venue
Status
Deadline
```

Highlight deadlines within:

```text
7 days
30 days
60 days
```

---

# 17. Grants

Route:

```text
/grants
```

Display:

```text
Preparing
Submitted
Awarded
Active
Completed
Rejected
```

Include upcoming grant deadlines on the Dashboard.

---

# 18. Global search / command palette

Implement:

```text
Cmd+K / Ctrl+K
```

Search across:

- projects
- people
- publications
- meetings

Provide quick actions:

```text
Create Project
Create Person
Add Weekly Update
Create Meeting
Create Publication
```

---

# 19. Project health automation

Implement a deterministic helper that calculates recommended attention signals.

Do NOT automatically overwrite manually selected project health without user consent.

Calculate signals such as:

```text
NO_UPDATE_14_DAYS
NO_UPDATE_30_DAYS
MILESTONE_DUE_SOON
MILESTONE_OVERDUE
PUBLICATION_DEADLINE_SOON
```

Example:

```text
GraphFM

Attention reasons:
- No update for 18 days
- Milestone overdue by 3 days
```

This should power the Dashboard's Need Attention section.

Keep this logic in:

```text
packages/domain
```

so both Desktop and Web use exactly the same logic.

---

# 20. Desktop-specific features

The first desktop release should mostly mirror the Web functionality.

However, create a clean Tauri-native capability layer for future local integrations.

Implement at least:

### Native notifications

Support desktop notifications for:

- upcoming deadlines
- overdue milestones

Do not enable excessive notifications by default.

### External link handling

GitHub/Overleaf/etc. should open in the user's default browser.

### Desktop window behavior

Remember reasonable window state where practical.

Do NOT implement large amounts of Rust business logic.

Rust should only handle native OS functionality.

Business logic belongs in shared TypeScript packages.

---

# 21. Prepare architecture for future local research integration

Do NOT implement all of these now.

But structure the Desktop app so future capabilities can include:

```text
local Git repository detection
Git commit activity
local project folders
VS Code integration
terminal integration
local experiment folders
local LLM
offline caching
```

Create appropriate interfaces/adapters if useful, but avoid premature implementation.

---

# 22. Seed/demo data

Create a realistic demo lab.

Example:

```text
Structural Intelligence Lab
```

People:

```text
PI
3 PhD students
1 postdoc
2 RAs
2 collaborators
```

Create at least 8 projects across different stages.

Examples:

```text
Geometric Flow Matching
Protein Functional Region Detection
Scalable Protein Representation Learning
Controllable Protein Generation
Graph Foundation Models
Molecular Optimization
Protein Interaction Prediction
Efficient Biological Foundation Models
```

Add:

- meetings
- updates
- milestones
- papers
- grants
- overdue examples
- stalled examples

The dashboard should look useful immediately after loading demo data.

---

# 23. Empty states

Every major page must have thoughtfully designed empty states.

For example:

```text
No projects yet

Create your first research project to start tracking progress,
members, milestones, meetings, and publications.

[Create Project]
```

Do not leave blank tables.

---

# 24. Loading and error states

Implement:

- skeleton loading states
- user-readable errors
- retry where sensible
- optimistic updates where safe
- toast notifications

Do not use `alert()`.

---

# 25. Accessibility

Use semantic HTML.

Ensure:

- keyboard navigation
- visible focus states
- dialog accessibility
- reasonable ARIA labels
- sufficient contrast

---

# 26. Testing

Implement useful tests rather than maximizing test count.

At minimum:

## Unit tests

For:

- project attention/health logic
- date/deadline calculations
- permission helpers
- validation schemas

## Integration tests

For key CRUD flows where practical.

## E2E

Use Playwright for at least:

1. user login
2. create lab/project
3. add person to project
4. add weekly update
5. project appears in dashboard
6. create publication
7. change project stage

---

# 27. Database migrations

All schema changes must be represented as migrations under:

```text
supabase/migrations
```

Do not depend on manually creating tables through the Supabase dashboard.

Include:

```text
seed.sql
```

for local/demo development.

---

# 28. Developer experience

Provide:

```text
.env.example
README.md
```

README must explain:

## Prerequisites

- Node
- pnpm
- Rust
- Tauri prerequisites
- Supabase

## Setup

```text
pnpm install
```

Supabase setup.

Environment variables.

Database migrations.

Seed database.

Start Web:

```text
pnpm dev:web
```

Start Desktop:

```text
pnpm dev:desktop
```

Run both:

```text
pnpm dev
```

Tests:

```text
pnpm test
pnpm test:e2e
```

Build:

```text
pnpm build
```

---

# 29. Code quality requirements

Use:

```text
TypeScript strict mode
ESLint
Prettier
```

Avoid:

- giant components
- duplicated business logic
- `any`
- deeply nested prop drilling
- unnecessary global state
- premature abstractions

Prefer:

```text
small domain modules
reusable UI components
clear feature boundaries
typed database queries
Zod validation
```

Use database-generated TypeScript types from Supabase if appropriate.

---

# 30. Security requirements

Do not:

- commit secrets
- expose service-role keys
- trust frontend authorization
- disable RLS
- interpolate unsafe SQL
- leak one lab's data into another lab

Validate all input.

Treat rich text/Markdown safely.

---

# 31. Deliberately out of scope for MVP

Do NOT build yet:

- full Notion-style block editor
- Slack clone
- chat
- video conferencing
- complex experiment tracking
- inventory/LIMS
- lab equipment management
- accounting
- payroll
- complex HR evaluation
- GitHub integration
- Overleaf API integration
- Google Calendar integration
- AI assistant
- recommendation engine
- mobile native app
- offline-first synchronization
- real-time collaborative document editing

However, avoid architectural choices that make these unnecessarily difficult later.

---

# 32. UX priority

The most polished flows should be:

```text
Dashboard
→ Project
→ Weekly Update

People
→ Person Profile
→ Their Projects

Projects
→ Pipeline
→ Drag Project Stage

Project
→ Meeting
→ Decisions
→ Next Actions

Publication
→ Deadline
→ Dashboard Upcoming
```

These matter more than implementing many marginal features.

---

# 33. First-run demo experience

Provide a developer/demo mode that lets me populate a sample lab easily.

The first useful screen I should see is a polished PI Dashboard with realistic data.

I should be able to understand the application's purpose within 10 seconds.

---

# 34. Implementation process

Do NOT respond only with architecture recommendations.

Actually build the application.

Work iteratively, but make reasonable engineering decisions yourself instead of repeatedly asking me questions.

Before coding:

1. inspect the repository
2. identify any existing code
3. preserve useful existing configuration
4. create a concise implementation plan

Then execute it.

When a decision is ambiguous, optimize for:

```text
maintainability
simplicity
good UX
shared Web/Desktop code
strong relational modeling
security
fast MVP development
```

Do not overengineer.

---

# 35. Suggested implementation order

Use approximately this order:

```text
1. Monorepo scaffolding
2. Shared design system
3. Supabase database schema
4. RLS
5. Authentication
6. Lab onboarding
7. App shell/navigation
8. Projects
9. People
10. Weekly updates
11. Dashboard
12. Meetings
13. Publications
14. Grants
15. Desktop shell
16. Desktop notifications
17. Search/command palette
18. Demo data
19. Tests
20. Documentation
```

After each major phase, run:

```text
typecheck
lint
tests
build
```

Fix errors before continuing.

---

# 36. Definition of Done

The task is complete when I can:

1. clone the repository
2. configure Supabase credentials
3. run database migrations
4. run the Web app
5. run the Tauri desktop app
6. sign in
7. create a lab
8. add researchers
9. create projects
10. assign researchers to projects
11. move projects through research stages
12. add weekly updates
13. see stale/stalled projects on the PI Dashboard
14. record meetings and decisions
15. track publications and deadlines
16. track grants
17. use the same lab data from Web and Desktop
18. verify one lab cannot access another lab's private data
19. successfully run the test suite
20. successfully build both Web and Desktop

Both applications must feel like two clients of the same product, not two separate products.

---

# 37. Final deliverable

At completion, provide:

```text
1. Architecture summary
2. Repository tree
3. Database schema summary
4. Explanation of RLS/security
5. Commands to run Web
6. Commands to run Desktop
7. Commands to test/build
8. Environment variables required
9. Known limitations
10. Recommended next development priorities
```

If external credentials prevent completing a live integration, implement everything possible locally, provide `.env.example`, mocks/demo data where appropriate, and clearly document the remaining credential-dependent step.

Do not leave the project as pseudocode or isolated examples.

Produce a coherent, runnable application.
