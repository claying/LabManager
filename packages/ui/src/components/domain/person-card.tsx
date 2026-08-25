import type { ComponentType, ReactNode } from "react";
import { Card } from "../card";
import { PersonAvatar } from "./person-avatar";
import { cn } from "../../lib/utils";

export interface PersonCardProps {
  personId: string;
  name: string;
  role: string;
  status: "active" | "inactive" | "alumni";
  avatarUrl?: string | null;
  activeProjectCount: number;
  /** Concise supervision signal (SPEC_followup section 22) — "1 blocker", "12d since 1:1", or "Healthy". No scores, no ranking. */
  signal?: { label: string; tone: "blocked" | "attention" | "healthy" };
  href: (id: string) => string;
  LinkComponent?: ComponentType<{ href: string; children: ReactNode; className?: string }>;
}

const DefaultAnchor: PersonCardProps["LinkComponent"] = ({ href, children, className }) => (
  <a href={href} className={className}>
    {children}
  </a>
);

const SIGNAL_TONE_CLASS: Record<NonNullable<PersonCardProps["signal"]>["tone"], string> = {
  blocked: "text-destructive",
  attention: "text-warning",
  healthy: "text-muted-foreground",
};

export function PersonCard({
  personId,
  name,
  role,
  status,
  avatarUrl,
  activeProjectCount,
  signal,
  href,
  LinkComponent,
}: PersonCardProps) {
  const Anchor = LinkComponent ?? DefaultAnchor!;
  return (
    <Anchor href={href(personId)} className="block">
      <Card
        className={cn(
          "hover:border-foreground/20 flex flex-col items-center gap-2 p-6 text-center transition-colors",
          status === "alumni" && "opacity-70",
        )}
      >
        <PersonAvatar name={name} avatarUrl={avatarUrl} size="lg" />
        <div className="space-y-0.5">
          <p className="text-foreground font-medium leading-snug">{name}</p>
          <p className="text-muted-foreground text-xs">
            {role} · {activeProjectCount} project{activeProjectCount === 1 ? "" : "s"}
          </p>
        </div>
        {signal && (
          <p className={cn("text-xs font-medium", SIGNAL_TONE_CLASS[signal.tone])}>
            {signal.label}
          </p>
        )}
      </Card>
    </Anchor>
  );
}
