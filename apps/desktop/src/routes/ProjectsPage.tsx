import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FlaskConical, Plus } from "lucide-react";
import { calculateProjectAttention } from "@pi-os/domain";
import type { ProjectStage } from "@pi-os/types";
import { PIPELINE_STAGES, PROJECT_STAGE_LABELS } from "@pi-os/types";
import { usePeople, useProjects, useUpdateProjectStage } from "@pi-os/repositories";
import { Button } from "@pi-os/ui/components/button";
import { Input } from "@pi-os/ui/components/input";
import { Tabs, TabsList, TabsTrigger } from "@pi-os/ui/components/tabs";
import { Skeleton } from "@pi-os/ui/components/skeleton";
import { EmptyState } from "@pi-os/ui/components/domain/empty-state";
import { DataTable } from "@pi-os/ui/components/domain/data-table";
import { PipelineBoard } from "@pi-os/ui/components/domain/pipeline-board";
import { AttentionCard } from "@pi-os/ui/components/domain/attention-card";
import { PageHeader } from "@pi-os/ui/components/domain/page-header";
import { HealthBadge } from "@pi-os/ui/components/domain/status-badge";
import { PersonAvatar } from "@pi-os/ui/components/domain/person-avatar";
import { Card } from "@pi-os/ui/components/card";
import { toast } from "@pi-os/ui/components/sonner";
import type { SavedViewFilters } from "@pi-os/domain";
import { RouterLinkAdapter } from "../components/router-link-adapter";
import { TopBar } from "../components/app-shell/topbar";
import { projectColumns } from "../components/projects/columns";
import { ProjectFormDialog } from "../components/projects/project-form-dialog";
import { SavedViewsBar } from "../components/shared/saved-views-bar";

export default function ProjectsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: projects, isLoading } = useProjects();
  const { data: people = [] } = usePeople();
  const updateStage = useUpdateProjectStage();

  const [search, setSearch] = useState("");
  const [tab, setTab] = useState(searchParams.get("stage") ? "pipeline" : "table");
  const [createOpen, setCreateOpen] = useState(searchParams.get("new") === "project");
  const now = useMemo(() => new Date(), []);
  const stageFilter = searchParams.get("stage") as ProjectStage | null;

  const filtered = useMemo(() => {
    if (!projects) return [];
    const term = search.trim().toLowerCase();
    return projects.filter((p) => {
      if (stageFilter && tab === "table" && p.stage !== stageFilter) return false;
      if (!term) return true;
      return (
        p.title.toLowerCase().includes(term) || (p.short_name ?? "").toLowerCase().includes(term)
      );
    });
  }, [projects, search, stageFilter, tab]);

  const attentionProjects = useMemo(
    () =>
      (projects ?? [])
        .filter((p) => !p.archived)
        .map((p) => ({ project: p, attention: calculateProjectAttention(p, now) }))
        .filter((x) => x.attention.needsAttention),
    [projects, now],
  );

  function closeCreate(open: boolean) {
    setCreateOpen(open);
    if (!open && searchParams.get("new")) {
      const params = new URLSearchParams(searchParams);
      params.delete("new");
      setSearchParams(params);
    }
  }

  function applySavedView(filters: SavedViewFilters) {
    const params = new URLSearchParams(searchParams);
    if (filters.stage?.[0]) {
      params.set("stage", filters.stage[0]);
      setTab("table");
    } else {
      params.delete("stage");
    }
    setSearchParams(params);
  }

  return (
    <>
      <TopBar>
        <PageHeader title="Projects" className="py-0" />
      </TopBar>
      <main className="flex-1 space-y-4 overflow-y-auto p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="table">Table</TabsTrigger>
              <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
              <TabsTrigger value="attention">
                Attention {attentionProjects.length > 0 && `(${attentionProjects.length})`}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search projects…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-56"
            />
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> New Project
            </Button>
          </div>
        </div>

        <SavedViewsBar
          entityType="projects"
          currentFilters={{ stage: stageFilter ? [stageFilter] : undefined }}
          onApply={applySavedView}
        />

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (projects ?? []).length === 0 ? (
          <EmptyState
            icon={FlaskConical}
            title="No projects yet"
            description="Create your first research project to start tracking progress, members, milestones, meetings, and publications."
            action={<Button onClick={() => setCreateOpen(true)}>Create Project</Button>}
          />
        ) : (
          <>
            {tab === "table" && (
              <DataTable
                columns={projectColumns}
                data={filtered}
                onRowClick={(row) => navigate(`/projects/${row.id}`)}
                initialSorting={[{ id: "title", desc: false }]}
              />
            )}

            {tab === "pipeline" && (
              <PipelineBoard
                columns={PIPELINE_STAGES.map((stage) => ({
                  stage,
                  label: PROJECT_STAGE_LABELS[stage],
                }))}
                items={filtered.filter((p) => p.stage !== "paused")}
                getItemId={(p) => p.id}
                getItemStage={(p) => p.stage}
                onMove={(id, stage) => {
                  updateStage.mutate({ projectId: id, stage });
                  toast.success(`Moved to ${PROJECT_STAGE_LABELS[stage]}`);
                }}
                renderItem={(p) => (
                  <Card
                    className="hover:border-foreground/20 cursor-pointer space-y-2 p-3 transition-colors"
                    onClick={() => navigate(`/projects/${p.id}`)}
                  >
                    <p className="text-foreground text-sm font-medium leading-snug">{p.title}</p>
                    <div className="flex items-center justify-between">
                      <HealthBadge health={p.health} />
                      {p.lead && <PersonAvatar name={p.lead.name} size="sm" />}
                    </div>
                  </Card>
                )}
              />
            )}

            {tab === "attention" &&
              (attentionProjects.length === 0 ? (
                <EmptyState
                  title="Nothing needs attention"
                  description="Every active project is on track."
                />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {attentionProjects.map(({ project, attention }) => (
                    <AttentionCard
                      key={project.id}
                      projectId={project.id}
                      title={project.title}
                      health={project.health}
                      leadName={project.lead?.name}
                      signals={attention.signals}
                      href={(id) => `/projects/${id}`}
                      LinkComponent={RouterLinkAdapter}
                    />
                  ))}
                </div>
              ))}
          </>
        )}
      </main>

      <ProjectFormDialog people={people} open={createOpen} onOpenChange={closeCreate} />
    </>
  );
}
