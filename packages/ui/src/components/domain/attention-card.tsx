import type { ComponentType, ReactNode } from "react";
import type { AttentionSignal } from "@pi-os/domain";
import type { ProjectHealth } from "@pi-os/types";
import { AlertTriangle } from "lucide-react";
import { cn } from "../../lib/utils";
import { Card } from "../card";
import { HealthBadge } from "./status-badge";

export interface AttentionCardProps {
  projectId: string;
  title: string;
  health: ProjectHealth;
  leadName?: string | null;
  signals: AttentionSignal[];
  href: (id: string) => string;
  /**
   * Framework router Link component (Next's `Link` on Web, react-router's
   * `Link` on Desktop). Defaults to a plain `<a>` so this package stays
   * framework-agnostic — pass your app's Link for client-side navigation.
   */
  LinkComponent?: ComponentType<{ href: string; children: ReactNode; className?: string }>;
}

const DefaultAnchor: AttentionCardProps["LinkComponent"] = ({ href, children, className }) => (
  <a href={href} className={className}>
    {children}
  </a>
);

export function AttentionCard({
  projectId,
  title,
  health,
  leadName,
  signals,
  href,
  LinkComponent,
}: AttentionCardProps) {
  const Anchor = LinkComponent ?? DefaultAnchor!;
  const hasCritical = signals.some((s) => s.severity === "critical");

  return (
    <Anchor href={href(projectId)}>
      <Card
        className={cn(
          "hover:border-foreground/20 flex flex-col gap-3 p-4 transition-colors",
          hasCritical
            ? "border-destructive/30 bg-destructive/[0.03]"
            : "border-warning/30 bg-warning/[0.03]",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-foreground font-medium leading-snug">{title}</p>
            {leadName && <p className="text-muted-foreground text-xs">Lead: {leadName}</p>}
          </div>
          <HealthBadge health={health} />
        </div>
        <ul className="space-y-1.5">
          {signals.map((signal) => (
            <li
              key={signal.type}
              className="text-muted-foreground flex items-start gap-1.5 text-xs"
            >
              <AlertTriangle
                className={cn(
                  "mt-0.5 h-3.5 w-3.5 shrink-0",
                  signal.severity === "critical" ? "text-destructive" : "text-warning",
                )}
              />
              <span>{signal.message}</span>
            </li>
          ))}
          {signals.length === 0 && (
            <li className="text-muted-foreground text-xs">
              Marked {health.replace("_", " ")} by lab.
            </li>
          )}
        </ul>
      </Card>
    </Anchor>
  );
}
