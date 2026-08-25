import { createContext, useContext, type ReactNode } from "react";
import { useWorkspace, usePerson } from "@pi-os/repositories";
import type { Person, Workspace } from "@pi-os/types";

interface WorkspaceContextValue {
  workspace: Workspace | null | undefined;
  isLoading: boolean;
  /** The PI's own `people` row — every person is a real person, single-user just means there's exactly one who matters as "you". */
  currentPerson: Person | null | undefined;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { data: workspace, isLoading } = useWorkspace();
  const { data: currentPerson } = usePerson(workspace?.pi_person_id ?? undefined);

  return (
    <WorkspaceContext.Provider value={{ workspace, isLoading, currentPerson }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useActiveWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useActiveWorkspace must be used within a <WorkspaceProvider>");
  return ctx;
}
