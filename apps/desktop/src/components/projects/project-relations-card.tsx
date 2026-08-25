import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import {
  useProjectRelations,
  useCreateProjectRelation,
  useDeleteProjectRelation,
  useProjects,
} from "@pi-os/repositories";
import { PROJECT_RELATION_TYPES, PROJECT_RELATION_TYPE_LABELS } from "@pi-os/types";
import type { ProjectRelationType } from "@pi-os/types";
import { Button } from "@pi-os/ui/components/button";
import { Card, CardContent } from "@pi-os/ui/components/card";
import { Badge } from "@pi-os/ui/components/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@pi-os/ui/components/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@pi-os/ui/components/select";
import { ProjectSelect } from "../shared/project-select";
import { toast } from "@pi-os/ui/components/sonner";

/** Manually-declared research relationships between projects (Tier 3 section 4) — depends_on, extends, etc. Shown compactly; never inferred. */
export function ProjectRelationsCard({ projectId }: { projectId: string }) {
  const { data: relations = [] } = useProjectRelations(projectId);
  const { data: allProjects = [] } = useProjects();
  const createRelation = useCreateProjectRelation();
  const deleteRelation = useDeleteProjectRelation();
  const [open, setOpen] = useState(false);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [relationType, setRelationType] = useState<ProjectRelationType>("related");

  const otherProjects = allProjects.filter((p) => p.id !== projectId);

  async function onAdd() {
    if (!targetId) return;
    try {
      await createRelation.mutateAsync({
        project_id: projectId,
        related_project_id: targetId,
        relation_type: relationType,
      });
      toast.success("Relation added");
      setOpen(false);
      setTargetId(null);
    } catch (error) {
      toast.error("Couldn't add relation", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="flex items-center justify-between">
          <h3 className="text-foreground text-sm font-semibold">Related projects</h3>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm">
                <Plus className="h-3.5 w-3.5" /> Link
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Link a related project</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <ProjectSelect
                  projects={otherProjects}
                  value={targetId}
                  onChange={setTargetId}
                  placeholder="Choose a project"
                />
                <Select
                  value={relationType}
                  onValueChange={(v) => setRelationType(v as ProjectRelationType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_RELATION_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {PROJECT_RELATION_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button onClick={onAdd} disabled={!targetId || createRelation.isPending}>
                  Add
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        {relations.length === 0 ? (
          <p className="text-muted-foreground text-sm">No related projects yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {relations.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 text-sm">
                <div className="flex min-w-0 items-center gap-2">
                  <Badge variant="outline" className="shrink-0">
                    {r.direction === "outgoing"
                      ? PROJECT_RELATION_TYPE_LABELS[r.relation_type]
                      : `${PROJECT_RELATION_TYPE_LABELS[r.relation_type]} (of this)`}
                  </Badge>
                  <Link
                    to={`/projects/${r.other_project.id}`}
                    className="text-foreground truncate hover:underline"
                  >
                    {r.other_project.title}
                  </Link>
                </div>
                <button
                  onClick={() =>
                    deleteRelation.mutate({
                      id: r.id,
                      projectId: r.project_id,
                      otherId: r.related_project_id,
                    })
                  }
                  className="text-muted-foreground hover:text-destructive shrink-0"
                  aria-label="Remove relation"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
