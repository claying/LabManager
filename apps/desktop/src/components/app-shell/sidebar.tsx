import { Link, useLocation } from "react-router-dom";
import { FlaskConical, Settings, UserRound } from "lucide-react";
import { useInbox } from "@pi-os/repositories";
import { cn } from "@pi-os/ui/lib/utils";
import { MAIN_NAV } from "./nav-items";
import { useActiveWorkspace } from "../../lib/workspace-context";

export function AppSidebar() {
  const { pathname } = useLocation();
  const { workspace, currentPerson } = useActiveWorkspace();
  const { data: inboxItems } = useInbox();

  return (
    <aside className="border-sidebar-border bg-sidebar flex h-screen w-60 shrink-0 flex-col border-r">
      <div className="flex h-14 items-center gap-2 px-4" data-tauri-drag-region>
        <FlaskConical className="text-sidebar-foreground h-5 w-5 shrink-0" />
        <span className="text-sidebar-foreground truncate text-sm font-semibold tracking-tight">
          {workspace?.name ?? "PI Research OS"}
        </span>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 pt-2">
        {MAIN_NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
              {item.href === "/inbox" && inboxItems && inboxItems.length > 0 && (
                <span className="text-sidebar-foreground/60 ml-auto text-xs tabular-nums">
                  {inboxItems.length}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-sidebar-border space-y-0.5 border-t px-3 py-3">
        <Link
          to="/settings"
          className={cn(
            "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
            pathname.startsWith("/settings")
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
          )}
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
        {currentPerson && (
          <Link
            to={`/people/${currentPerson.id}`}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
              pathname === `/people/${currentPerson.id}`
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            <UserRound className="h-4 w-4" />
            My Profile
          </Link>
        )}
      </div>
    </aside>
  );
}
