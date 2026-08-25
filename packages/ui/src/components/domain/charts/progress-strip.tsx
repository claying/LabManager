import { cn } from "../../../lib/utils";

/** A single filled progress bar — paper readiness, submission plan completion. No circular gauges. */
export function ProgressStrip({
  percent,
  tone = "default",
  showLabel = true,
  className,
}: {
  percent: number;
  tone?: "default" | "warning" | "critical" | "success";
  showLabel?: boolean;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  const fillClass = {
    default: "bg-primary",
    warning: "bg-warning",
    critical: "bg-destructive",
    success: "bg-success",
  }[tone];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
        <div
          className={cn("h-full rounded-full transition-all", fillClass)}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-muted-foreground w-9 shrink-0 text-right text-xs tabular-nums">
          {clamped}%
        </span>
      )}
    </div>
  );
}
