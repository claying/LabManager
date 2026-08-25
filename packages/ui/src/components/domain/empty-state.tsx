import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-border flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-14 text-center",
        className,
      )}
    >
      {Icon && (
        <div className="bg-muted flex h-11 w-11 items-center justify-center rounded-full">
          <Icon className="text-muted-foreground h-5 w-5" />
        </div>
      )}
      <div className="space-y-1">
        <p className="text-foreground text-sm font-medium">{title}</p>
        {description && <p className="text-muted-foreground max-w-sm text-sm">{description}</p>}
      </div>
      {action}
    </div>
  );
}
