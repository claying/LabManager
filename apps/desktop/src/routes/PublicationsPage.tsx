import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FileText, Plus } from "lucide-react";
import { PUBLICATION_PIPELINE_STATUSES, PUBLICATION_STATUS_LABELS } from "@pi-os/types";
import { usePeople, usePublications, useProjects } from "@pi-os/repositories";
import { Button } from "@pi-os/ui/components/button";
import { Card } from "@pi-os/ui/components/card";
import { Badge } from "@pi-os/ui/components/badge";
import { Skeleton } from "@pi-os/ui/components/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@pi-os/ui/components/tabs";
import { EmptyState } from "@pi-os/ui/components/domain/empty-state";
import { DataTable } from "@pi-os/ui/components/domain/data-table";
import { PageHeader } from "@pi-os/ui/components/domain/page-header";
import { TopBar } from "../components/app-shell/topbar";
import { publicationColumns } from "../components/publications/columns";
import { PublicationFormDialog } from "../components/publications/publication-form-dialog";

export default function PublicationsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { data: publications, isLoading } = usePublications();
  const { data: people = [] } = usePeople();
  const { data: projects = [] } = useProjects();

  const [tab, setTab] = useState("pipeline");
  const [createOpen, setCreateOpen] = useState(searchParams.get("new") === "publication");
  const highlighted = searchParams.get("open");

  const byStatus = useMemo(() => {
    const map = new Map(
      PUBLICATION_PIPELINE_STATUSES.map((s) => [
        s,
        (publications ?? []).filter((p) => p.status === s),
      ]),
    );
    return map;
  }, [publications]);

  return (
    <>
      <TopBar>
        <PageHeader title="Publications" className="py-0" />
      </TopBar>
      <main className="flex-1 space-y-4 overflow-y-auto p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
              <TabsTrigger value="table">Table</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New Publication
          </Button>
        </div>

        {isLoading ? (
          <Skeleton className="h-96 w-full" />
        ) : (publications ?? []).length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No publications yet"
            description="Track papers from idea through submission, review, and publication."
            action={<Button onClick={() => setCreateOpen(true)}>New Publication</Button>}
          />
        ) : tab === "pipeline" ? (
          <div className="flex gap-3 overflow-x-auto pb-3">
            {PUBLICATION_PIPELINE_STATUSES.map((status) => (
              <div
                key={status}
                className="border-border bg-muted/30 flex w-64 shrink-0 flex-col gap-2 rounded-lg border p-2"
              >
                <div className="flex items-center justify-between px-1 py-1">
                  <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                    {PUBLICATION_STATUS_LABELS[status]}
                  </span>
                  <Badge variant="muted">{byStatus.get(status)?.length ?? 0}</Badge>
                </div>
                {byStatus.get(status)?.map((p) => (
                  <Card
                    key={p.id}
                    onClick={() => navigate(`/publications/${p.id}`)}
                    className={`hover:border-foreground/20 cursor-pointer space-y-1.5 p-3 transition-colors ${p.id === highlighted ? "border-primary/50" : ""}`}
                  >
                    <p className="text-foreground text-sm font-medium leading-snug">{p.title}</p>
                    <p className="text-muted-foreground text-xs">{p.venue ?? "No venue set"}</p>
                    {p.submission_deadline && (
                      <p className="text-muted-foreground text-xs">
                        Due {new Date(p.submission_deadline).toLocaleDateString()}
                      </p>
                    )}
                  </Card>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <DataTable
            columns={publicationColumns}
            data={publications ?? []}
            initialSorting={[{ id: "submission_deadline", desc: false }]}
            onRowClick={(row) => navigate(`/publications/${row.id}`)}
          />
        )}
      </main>

      <PublicationFormDialog
        projects={projects}
        people={people}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </>
  );
}
