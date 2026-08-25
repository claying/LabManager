import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import { Card } from "../card";

export function KpiCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = "default",
  className,
}: {
  label: string;
  value: ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  hint?: string;
  tone?: "default" | "warning";
  className?: string;
}) {
  return (
    <Card className={cn("p-5", className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            {label}
          </p>
          <p
            className={cn(
              "text-2xl font-semibold tabular-nums",
              tone === "warning" && value !== 0 && "text-warning",
            )}
          >
            {value}
          </p>
          {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
        </div>
        {Icon && (
          <div className="bg-muted flex h-9 w-9 shrink-0 items-center justify-center rounded-md">
            <Icon className="text-muted-foreground h-4 w-4" />
          </div>
        )}
      </div>
    </Card>
  );
}
