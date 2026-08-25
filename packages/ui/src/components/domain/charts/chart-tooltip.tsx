/** Shared compact tooltip shell for Recharts' `content` prop — every chart in the app uses the same look. */
export function ChartTooltip({
  active,
  label,
  rows,
}: {
  active?: boolean;
  label?: string;
  rows?: { label: string; value: string | number; color?: string }[];
}) {
  if (!active || !rows || rows.length === 0) return null;
  return (
    <div className="border-border bg-popover text-popover-foreground rounded-md border px-2.5 py-1.5 text-xs shadow-md">
      {label && <p className="text-foreground mb-1 font-medium">{label}</p>}
      <div className="space-y-0.5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-1.5">
            {r.color && (
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: r.color }}
              />
            )}
            <span className="text-muted-foreground">{r.label}</span>
            <span className="text-foreground ml-auto font-medium tabular-nums">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
