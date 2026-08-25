import { useMemo, useState } from "react";
import { PiggyBank, Plus } from "lucide-react";
import { GRANT_STATUSES, GRANT_STATUS_LABELS } from "@pi-os/types";
import { useGrants, usePeople } from "@pi-os/repositories";
import { Button } from "@pi-os/ui/components/button";
import { Card, CardContent } from "@pi-os/ui/components/card";
import { Badge } from "@pi-os/ui/components/badge";
import { Skeleton } from "@pi-os/ui/components/skeleton";
import { EmptyState } from "@pi-os/ui/components/domain/empty-state";
import { PageHeader } from "@pi-os/ui/components/domain/page-header";
import { GrantStatusBadge } from "@pi-os/ui/components/domain/status-badge";
import { TopBar } from "../components/app-shell/topbar";
import { GrantFormDialog } from "../components/grants/grant-form-dialog";

function formatAmount(amount: number | null, currency: string) {
  if (amount === null) return null;
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function GrantsPage() {
  const { data: grants, isLoading } = useGrants();
  const { data: people = [] } = usePeople();
  const [createOpen, setCreateOpen] = useState(false);

  const byStatus = useMemo(() => {
    const map = new Map(
      GRANT_STATUSES.map((s) => [s, (grants ?? []).filter((g) => g.status === s)]),
    );
    return map;
  }, [grants]);

  return (
    <>
      <TopBar>
        <PageHeader title="Grants" className="py-0" />
      </TopBar>
      <main className="flex-1 space-y-4 overflow-y-auto p-6">
        <div className="flex justify-end">
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New Grant
          </Button>
        </div>

        {isLoading ? (
          <Skeleton className="h-96 w-full" />
        ) : (grants ?? []).length === 0 ? (
          <EmptyState
            icon={PiggyBank}
            title="No grants yet"
            description="Track funding from idea through award and completion."
            action={<Button onClick={() => setCreateOpen(true)}>New Grant</Button>}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {GRANT_STATUSES.filter(
              (s) =>
                (byStatus.get(s)?.length ?? 0) > 0 ||
                ["preparing", "submitted", "awarded", "active"].includes(s),
            ).map((status) => (
              <div key={status} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                    {GRANT_STATUS_LABELS[status]}
                  </h3>
                  <Badge variant="muted">{byStatus.get(status)?.length ?? 0}</Badge>
                </div>
                <div className="space-y-2">
                  {byStatus.get(status)?.map((g) => (
                    <Card key={g.id}>
                      <CardContent className="space-y-1.5 p-4">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-foreground text-sm font-medium leading-snug">
                            {g.title}
                          </p>
                          <GrantStatusBadge status={g.status} />
                        </div>
                        <p className="text-muted-foreground text-xs">
                          {g.funder}
                          {g.program ? ` · ${g.program}` : ""}
                        </p>
                        <div className="text-muted-foreground flex items-center justify-between text-xs">
                          <span>{formatAmount(g.amount, g.currency) ?? "Amount TBD"}</span>
                          {g.deadline && (
                            <span>Due {new Date(g.deadline).toLocaleDateString()}</span>
                          )}
                        </div>
                        {g.pi && <p className="text-muted-foreground text-xs">PI: {g.pi.name}</p>}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <GrantFormDialog people={people} open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
