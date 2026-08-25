import { useState } from "react";
import { useActionItems, useArtifacts, useCompleteProject } from "@pi-os/repositories";
import { Button } from "@pi-os/ui/components/button";
import { Input } from "@pi-os/ui/components/input";
import { Textarea } from "@pi-os/ui/components/textarea";
import { Label } from "@pi-os/ui/components/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@pi-os/ui/components/dialog";
import { Badge } from "@pi-os/ui/components/badge";
import { toast } from "@pi-os/ui/components/sonner";

/** The Tier 3 closeout flow: outcome + final note, with a look at outputs and any still-open action items before marking a project complete (and archived). */
export function ProjectCloseoutDialog({
  projectId,
  open,
  onOpenChange,
}: {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: artifacts = [] } = useArtifacts(projectId);
  const { data: openActions = [] } = useActionItems({ projectId, openOnly: true });
  const completeProject = useCompleteProject();
  const [outcome, setOutcome] = useState("");
  const [note, setNote] = useState("");

  async function onComplete() {
    if (!outcome.trim()) return;
    try {
      await completeProject.mutateAsync({
        id: projectId,
        outcome: outcome.trim(),
        closeout_note: note.trim() || null,
      });
      toast.success("Project completed and archived");
      onOpenChange(false);
      setOutcome("");
      setNote("");
    } catch (error) {
      toast.error("Couldn't complete project", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Complete project</DialogTitle>
          <DialogDescription>
            Records a durable summary and archives the project. It stays fully searchable and linked
            afterward.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Outcome</Label>
            <Input
              placeholder="e.g. ICLR paper accepted"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Final note (optional)</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs uppercase tracking-wide">
              Key outputs
            </Label>
            {artifacts.length === 0 ? (
              <p className="text-muted-foreground text-sm">None recorded.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {artifacts.map((a) => (
                  <Badge key={a.id} variant="secondary">
                    {a.title}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          {openActions.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-warning text-xs uppercase tracking-wide">
                {openActions.length} open action{openActions.length === 1 ? "" : "s"}
              </Label>
              <ul className="text-muted-foreground space-y-0.5 text-xs">
                {openActions.map((a) => (
                  <li key={a.id}>• {a.title}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={onComplete} disabled={!outcome.trim() || completeProject.isPending}>
            Complete & Archive
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
