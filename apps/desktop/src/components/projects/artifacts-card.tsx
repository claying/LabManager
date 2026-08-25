import { useState } from "react";
import { ExternalLink, Plus, Trash2 } from "lucide-react";
import { useArtifacts, useCreateArtifact, useDeleteArtifact, pickFile } from "@pi-os/repositories";
import { ARTIFACT_TYPES, ARTIFACT_TYPE_LABELS } from "@pi-os/types";
import type { ArtifactType } from "@pi-os/types";
import { Button } from "@pi-os/ui/components/button";
import { Input } from "@pi-os/ui/components/input";
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
import { openExternalLink } from "../../lib/native/links";
import { toast } from "@pi-os/ui/components/sonner";

/** A project's generic outputs — paper, code, dataset, slides, results, notes, website (Tier 3 section 12). */
export function ArtifactsCard({ projectId }: { projectId: string }) {
  const { data: artifacts = [] } = useArtifacts(projectId);
  const createArtifact = useCreateArtifact();
  const deleteArtifact = useDeleteArtifact();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<ArtifactType>("paper");
  const [title, setTitle] = useState("");
  const [localPath, setLocalPath] = useState("");
  const [url, setUrl] = useState("");

  function reset() {
    setType("paper");
    setTitle("");
    setLocalPath("");
    setUrl("");
  }

  async function onChooseFile() {
    const path = await pickFile("Choose the output file");
    if (path) setLocalPath(path);
  }

  async function onAdd() {
    if (!title.trim()) return;
    try {
      await createArtifact.mutateAsync({
        project_id: projectId,
        type,
        title: title.trim(),
        local_path: localPath || null,
        url: url || null,
      });
      toast.success("Output added");
      setOpen(false);
      reset();
    } catch (error) {
      toast.error("Couldn't add output", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="flex items-center justify-between">
          <h3 className="text-foreground text-sm font-semibold">Outputs</h3>
          <Dialog
            open={open}
            onOpenChange={(v) => {
              setOpen(v);
              if (!v) reset();
            }}
          >
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm">
                <Plus className="h-3.5 w-3.5" /> Add
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add output</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Select value={type} onValueChange={(v) => setType(v as ArtifactType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ARTIFACT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {ARTIFACT_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Title (e.g. main.pdf)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <div className="flex gap-2">
                  <Input
                    placeholder="Local path (optional)"
                    value={localPath}
                    onChange={(e) => setLocalPath(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" onClick={onChooseFile}>
                    Choose…
                  </Button>
                </div>
                <Input
                  placeholder="URL (optional)"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button onClick={onAdd} disabled={!title.trim() || createArtifact.isPending}>
                  Add
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        {artifacts.length === 0 ? (
          <p className="text-muted-foreground text-sm">No outputs recorded yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {artifacts.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-2 text-sm">
                <div className="flex min-w-0 items-center gap-2">
                  <Badge variant="secondary" className="shrink-0">
                    {ARTIFACT_TYPE_LABELS[a.type]}
                  </Badge>
                  <span className="text-foreground truncate">{a.title}</span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {a.url && (
                    <button
                      onClick={() => openExternalLink(a.url!)}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Open URL"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteArtifact.mutate({ id: a.id, projectId })}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Remove output"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
