import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useProjects } from "@pi-os/repositories";
import { IdeaQuickCaptureDialog } from "../components/ideas/idea-quick-capture-dialog";
import { DecisionRequestPanel } from "../components/decisions/decision-request-panel";
import { VenueCycleFormDialog } from "../components/venues/venue-cycle-form-dialog";

interface QuickActionsContextValue {
  openIdeaCapture: () => void;
  openNewDecision: () => void;
  openNewVenueCycle: () => void;
}

const QuickActionsContext = createContext<QuickActionsContextValue | null>(null);

/**
 * Mounted once above the whole app shell so idea capture, decision
 * creation, and venue-cycle creation are reachable from anywhere: the
 * global ⌘⇧I shortcut, the command palette, and any page-level button.
 */
export function QuickActionsProvider({ children }: { children: ReactNode }) {
  const { data: projects = [] } = useProjects();
  const [ideaOpen, setIdeaOpen] = useState(false);
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [venueCycleOpen, setVenueCycleOpen] = useState(false);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "i") {
        e.preventDefault();
        setIdeaOpen(true);
      }
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <QuickActionsContext.Provider
      value={{
        openIdeaCapture: () => setIdeaOpen(true),
        openNewDecision: () => setDecisionOpen(true),
        openNewVenueCycle: () => setVenueCycleOpen(true),
      }}
    >
      {children}
      <IdeaQuickCaptureDialog open={ideaOpen} onOpenChange={setIdeaOpen} projects={projects} />
      <DecisionRequestPanel
        open={decisionOpen}
        onOpenChange={setDecisionOpen}
        projects={projects}
      />
      <VenueCycleFormDialog open={venueCycleOpen} onOpenChange={setVenueCycleOpen} />
    </QuickActionsContext.Provider>
  );
}

export function useQuickActions() {
  const ctx = useContext(QuickActionsContext);
  if (!ctx) throw new Error("useQuickActions must be used within a <QuickActionsProvider>");
  return ctx;
}
