import { useState } from "react";
import { Bookmark, MoreHorizontal, Pin, PinOff, Plus } from "lucide-react";
import type { SavedViewFilters, SavedViewFormInput } from "@pi-os/domain";
import type { SavedViewEntityType } from "@pi-os/types";
import {
  useSavedViews,
  useCreateSavedView,
  useRenameSavedView,
  useSetSavedViewPinned,
  useDeleteSavedView,
} from "@pi-os/repositories";
import { Button } from "@pi-os/ui/components/button";
import { Input } from "@pi-os/ui/components/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@pi-os/ui/components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@pi-os/ui/components/dropdown-menu";
import { toast } from "@pi-os/ui/components/sonner";

/**
 * Save/apply/rename/pin/delete named filter presets for a list page (Tier 3
 * section 7). `filters` is the current controlled filter state the caller
 * wants to save; `onApply` receives a saved view's filters back to restore.
 */
export function SavedViewsBar({
  entityType,
  currentFilters,
  onApply,
}: {
  entityType: SavedViewEntityType;
  currentFilters: SavedViewFilters;
  onApply: (filters: SavedViewFilters) => void;
}) {
  const { data: views = [] } = useSavedViews(entityType);
  const createView = useCreateSavedView();
  const renameView = useRenameSavedView();
  const setPinned = useSetSavedViewPinned();
  const deleteView = useDeleteSavedView();
  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState("");

  const pinned = views.filter((v) => v.pinned);
  const unpinned = views.filter((v) => !v.pinned);

  async function onSave() {
    if (!name.trim()) return;
    const input: SavedViewFormInput = {
      name: name.trim(),
      entity_type: entityType,
      filters: currentFilters,
      pinned: true,
    };
    try {
      await createView.mutateAsync({ ...input, filters: JSON.stringify(input.filters) });
      toast.success("View saved");
      setSaveOpen(false);
      setName("");
    } catch (error) {
      toast.error("Couldn't save view", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {pinned.map((v) => (
        <div key={v.id} className="group relative">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onApply(JSON.parse(v.filters) as SavedViewFilters)}
            className="pr-7"
          >
            <Bookmark className="h-3 w-3" />
            {v.name}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="text-muted-foreground hover:text-foreground absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100">
                <MoreHorizontal className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setPinned.mutate({ id: v.id, pinned: false })}>
                <PinOff className="h-3.5 w-3.5" /> Unpin
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  const next = window.prompt("Rename view", v.name);
                  if (next && next.trim()) renameView.mutate({ id: v.id, name: next.trim() });
                }}
              >
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => deleteView.mutate(v.id)}
                className="text-destructive"
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ))}

      {unpinned.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              More views…
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {unpinned.map((v) => (
              <DropdownMenuItem
                key={v.id}
                onClick={() => onApply(JSON.parse(v.filters) as SavedViewFilters)}
              >
                <span className="flex-1">{v.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPinned.mutate({ id: v.id, pinned: true });
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Pin className="h-3 w-3" />
                </button>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save current view</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="e.g. Stalled projects"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <DialogFooter>
            <Button onClick={onSave} disabled={!name.trim() || createView.isPending}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Button variant="ghost" size="sm" onClick={() => setSaveOpen(true)}>
        <Plus className="h-3.5 w-3.5" /> Save view
      </Button>
    </div>
  );
}
