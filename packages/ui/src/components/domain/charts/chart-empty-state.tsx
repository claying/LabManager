/** No axes, no "0 0 0 0" charts (SPEC_followup_2 section 4/64) — just says there's nothing yet. */
export function ChartEmptyState({ message, height = 120 }: { message: string; height?: number }) {
  return (
    <div
      className="text-muted-foreground flex items-center justify-center text-sm"
      style={{ height }}
    >
      {message}
    </div>
  );
}
