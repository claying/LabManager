import { useState } from "react";
import { FolderPlus, RefreshCw, Trash2 } from "lucide-react";
import {
  useFileIndexRoots,
  useFileIndexFiles,
  useAddAndIndexFolder,
  useReindexFolder,
  useRemoveIndexedFolder,
} from "@pi-os/repositories";
import { FILE_INDEX_CATEGORIES, FILE_INDEX_CATEGORY_LABELS } from "@pi-os/types";
import type { FileIndexCategory } from "@pi-os/types";
import { Button } from "@pi-os/ui/components/button";
import { Card, CardContent } from "@pi-os/ui/components/card";
import { Badge } from "@pi-os/ui/components/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@pi-os/ui/components/dropdown-menu";
import { toast } from "@pi-os/ui/components/sonner";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Explicitly-selected local folders indexed for browsing/search (Tier 3 sections 6/7) — never a filesystem scan beyond what the PI picked. */
export function FileIndexCard({ projectId }: { projectId: string }) {
  const { data: roots = [] } = useFileIndexRoots(projectId);
  const { data: files = [] } = useFileIndexFiles(projectId);
  const addFolder = useAddAndIndexFolder();
  const reindex = useReindexFolder();
  const removeFolder = useRemoveIndexedFolder();
  const [expandedRoot, setExpandedRoot] = useState<string | null>(null);

  async function onAdd(category: FileIndexCategory) {
    try {
      const result = await addFolder.mutateAsync({ projectId, category });
      if (!result) return;
      toast.success(`Indexed ${result.result.added} file${result.result.added === 1 ? "" : "s"}`);
    } catch (error) {
      toast.error("Couldn't index folder", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="flex items-center justify-between">
          <h3 className="text-foreground text-sm font-semibold">Indexed files</h3>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" disabled={addFolder.isPending}>
                <FolderPlus className="h-3.5 w-3.5" />
                {addFolder.isPending ? "Indexing…" : "Index a folder"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {FILE_INDEX_CATEGORIES.map((c) => (
                <DropdownMenuItem key={c} onClick={() => onAdd(c)}>
                  {FILE_INDEX_CATEGORY_LABELS[c]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {roots.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No folders indexed yet. Indexed files show up in global search too.
          </p>
        ) : (
          <div className="space-y-2">
            {roots.map((root) => {
              const rootFiles = files.filter((f) => f.root_id === root.id);
              const isExpanded = expandedRoot === root.id;
              return (
                <div key={root.id} className="border-border rounded-md border p-2">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      className="min-w-0 flex-1 text-left"
                      onClick={() => setExpandedRoot(isExpanded ? null : root.id)}
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          {FILE_INDEX_CATEGORY_LABELS[root.category]}
                        </Badge>
                        <span className="text-foreground truncate text-sm">{root.root_path}</span>
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {rootFiles.length} file{rootFiles.length === 1 ? "" : "s"}
                        {root.last_indexed_at &&
                          ` · indexed ${new Date(root.last_indexed_at).toLocaleDateString()}`}
                      </p>
                    </button>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => reindex.mutate({ rootId: root.id, projectId })}
                        className="text-muted-foreground hover:text-foreground p-1"
                        aria-label="Re-index"
                        disabled={reindex.isPending}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => removeFolder.mutate({ rootId: root.id, projectId })}
                        className="text-muted-foreground hover:text-destructive p-1"
                        aria-label="Remove"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  {isExpanded && rootFiles.length > 0 && (
                    <ul className="mt-2 max-h-48 space-y-0.5 overflow-y-auto border-t pt-2">
                      {rootFiles.map((f) => (
                        <li
                          key={f.id}
                          className="flex items-center justify-between gap-2 text-xs"
                          title={f.relative_path}
                        >
                          <span className="text-foreground truncate font-mono">
                            {f.relative_path}
                          </span>
                          <span className="text-muted-foreground shrink-0">
                            {formatBytes(f.size_bytes)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
