import { useState } from "react";
import { File, Folder, FolderOpen, Plus, Trash2 } from "lucide-react";
import type { AttachmentEntityType, AttachmentKind } from "@pi-os/types";
import {
  useAttachments,
  useCreateAttachment,
  useDeleteAttachment,
  pickFile,
  pickFolder,
  openFileOrFolder,
  revealInFileManager,
} from "@pi-os/repositories";
import { Button } from "@pi-os/ui/components/button";
import { Card, CardContent } from "@pi-os/ui/components/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@pi-os/ui/components/dropdown-menu";
import { toast } from "@pi-os/ui/components/sonner";

/**
 * Local file/folder references for a project, meeting, publication, or grant
 * (SPEC_followup.md section 15) — never scans the filesystem; every path
 * comes from a native OS picker the user explicitly drove.
 */
export function LinkedFiles({
  entityType,
  entityId,
}: {
  entityType: AttachmentEntityType;
  entityId: string;
}) {
  const { data: attachments = [] } = useAttachments(entityType, entityId);
  const createAttachment = useCreateAttachment(entityType, entityId);
  const deleteAttachment = useDeleteAttachment(entityType, entityId);
  const [busy, setBusy] = useState(false);

  async function addFile() {
    setBusy(true);
    try {
      const path = await pickFile("Choose a file to link");
      if (path) await link(path, "file");
    } finally {
      setBusy(false);
    }
  }

  async function addFolder() {
    setBusy(true);
    try {
      const path = await pickFolder("Choose a folder to link");
      if (path) await link(path, "folder");
    } finally {
      setBusy(false);
    }
  }

  async function link(path: string, kind: AttachmentKind) {
    const label = path.split(/[/\\]/).pop() ?? path;
    try {
      await createAttachment.mutateAsync({ kind, path, label });
    } catch (error) {
      toast.error("Couldn't link file", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  async function remove(id: string) {
    try {
      await deleteAttachment.mutateAsync(id);
    } catch (error) {
      toast.error("Couldn't remove link", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="flex items-center justify-between">
          <h3 className="text-foreground text-sm font-semibold">Linked Files</h3>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" disabled={busy}>
                <Plus className="h-3.5 w-3.5" /> Link
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={addFile}>
                <File className="h-3.5 w-3.5" /> Link file…
              </DropdownMenuItem>
              <DropdownMenuItem onClick={addFolder}>
                <Folder className="h-3.5 w-3.5" /> Link folder…
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {attachments.length === 0 ? (
          <p className="text-muted-foreground text-sm">No files linked yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {attachments.map((a) => {
              const Icon = a.kind === "folder" ? Folder : File;
              return (
                <li
                  key={a.id}
                  className="border-border flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5"
                >
                  <button
                    onClick={() => openFileOrFolder(a.path)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    title={a.path}
                  >
                    <Icon className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                    <span className="text-foreground truncate text-sm">{a.label ?? a.path}</span>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    title="Reveal in file manager"
                    onClick={() => revealInFileManager(a.path)}
                  >
                    <FolderOpen className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    title="Remove link"
                    onClick={() => remove(a.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
