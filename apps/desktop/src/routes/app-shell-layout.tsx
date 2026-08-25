import { Navigate, Outlet } from "react-router-dom";
import { Skeleton } from "@pi-os/ui/components/skeleton";
import { useActiveWorkspace } from "../lib/workspace-context";
import { QuickActionsProvider } from "../lib/quick-actions-context";
import { AppSidebar } from "../components/app-shell/sidebar";

export function AppShellLayout() {
  const { workspace, isLoading } = useActiveWorkspace();

  if (isLoading) {
    return (
      <div className="flex h-screen">
        <div className="border-border w-60 shrink-0 border-r p-4">
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="flex-1 space-y-4 p-8">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!workspace) return <Navigate to="/onboarding" replace />;

  return (
    <QuickActionsProvider>
      <div className="bg-background flex h-screen overflow-hidden">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Outlet />
        </div>
      </div>
    </QuickActionsProvider>
  );
}
