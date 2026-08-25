import { useState, type ReactNode } from "react";
import { Search } from "lucide-react";
import { Button } from "@pi-os/ui/components/button";
import { CommandPalette } from "./command-palette";
import { ThemeToggle } from "./theme-toggle";

export function TopBar({ children }: { children?: ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false);

  return (
    <header
      className="border-border flex h-14 shrink-0 items-center justify-between gap-4 border-b px-6"
      data-tauri-drag-region
    >
      <div className="min-w-0 flex-1">{children}</div>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="text-muted-foreground hidden sm:inline-flex"
          onClick={() => setPaletteOpen(true)}
        >
          <Search className="h-3.5 w-3.5" />
          Search
          <kbd className="border-border bg-muted ml-2 rounded border px-1.5 py-0.5 text-[10px] font-medium">
            ⌘K
          </kbd>
        </Button>
        <ThemeToggle />
      </div>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </header>
  );
}
