import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { LayoutGrid, Plus, Table2, Users } from "lucide-react";
import type { PersonRole } from "@pi-os/types";
import { usePeople, usePeopleProjectStats, usePeopleSupervisionSignals } from "@pi-os/repositories";
import { Button } from "@pi-os/ui/components/button";
import { Input } from "@pi-os/ui/components/input";
import { Tabs, TabsList, TabsTrigger } from "@pi-os/ui/components/tabs";
import { Skeleton } from "@pi-os/ui/components/skeleton";
import { EmptyState } from "@pi-os/ui/components/domain/empty-state";
import { DataTable } from "@pi-os/ui/components/domain/data-table";
import { PersonCard } from "@pi-os/ui/components/domain/person-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@pi-os/ui/components/select";
import { PageHeader } from "@pi-os/ui/components/domain/page-header";
import { RouterLinkAdapter } from "../components/router-link-adapter";
import { TopBar } from "../components/app-shell/topbar";
import { personColumns, type PersonRow } from "../components/people/columns";
import { PersonFormDialog } from "../components/people/person-form-dialog";

const ROLE_FILTERS: { label: string; roles: PersonRole[] }[] = [
  { label: "All", roles: [] },
  { label: "PhD", roles: ["PhD"] },
  { label: "Postdoc", roles: ["Postdoc"] },
  { label: "RA", roles: ["RA", "Research Assistant"] },
  { label: "Collaborator", roles: ["Collaborator"] },
  { label: "Alumni", roles: ["Alumni"] },
];

export default function PeoplePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: people, isLoading } = usePeople();
  const { data: stats } = usePeopleProjectStats();
  const { data: signals } = usePeopleSupervisionSignals();

  const [view, setView] = useState<"card" | "table">("card");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState(0);
  const [createOpen, setCreateOpen] = useState(searchParams.get("new") === "person");

  const rows: PersonRow[] = useMemo(
    () =>
      (people ?? []).map((p) => ({
        ...p,
        activeProjectCount: stats?.[p.id]?.activeProjectCount ?? 0,
        ledProjectCount: stats?.[p.id]?.ledProjectCount ?? 0,
      })),
    [people, stats],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const roles = ROLE_FILTERS[roleFilter]!.roles;
    return rows.filter((p) => {
      if (roles.length > 0 && !roles.includes(p.role)) return false;
      if (roleFilter === 5 && p.status !== "alumni") return false;
      if (!term) return true;
      return p.name.toLowerCase().includes(term);
    });
  }, [rows, search, roleFilter]);

  function closeCreate(open: boolean) {
    setCreateOpen(open);
    if (!open && searchParams.get("new")) setSearchParams({});
  }

  return (
    <>
      <TopBar>
        <PageHeader title="People" className="py-0" />
      </TopBar>
      <main className="flex-1 space-y-4 overflow-y-auto p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Tabs value={view} onValueChange={(v) => setView(v as "card" | "table")}>
              <TabsList>
                <TabsTrigger value="card">
                  <LayoutGrid className="h-3.5 w-3.5" />
                </TabsTrigger>
                <TabsTrigger value="table">
                  <Table2 className="h-3.5 w-3.5" />
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Select value={String(roleFilter)} onValueChange={(v) => setRoleFilter(Number(v))}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_FILTERS.map((f, i) => (
                  <SelectItem key={f.label} value={String(i)}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search people…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-56"
            />
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Add Person
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-44 rounded-lg" />
            ))}
          </div>
        ) : (people ?? []).length === 0 ? (
          <EmptyState
            icon={Users}
            title="No one added yet"
            description="Add the researchers in your lab to start assigning them to projects."
            action={<Button onClick={() => setCreateOpen(true)}>Add Person</Button>}
          />
        ) : view === "card" ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map((p) => {
              const signal = signals?.[p.id];
              return (
                <PersonCard
                  key={p.id}
                  personId={p.id}
                  name={p.name}
                  role={p.role}
                  status={p.status}
                  avatarUrl={p.avatar_url}
                  activeProjectCount={p.activeProjectCount}
                  signal={
                    p.status !== "active"
                      ? undefined
                      : signal?.blocked
                        ? { label: "Blocked", tone: "blocked" }
                        : signal?.noOneOnOneDays !== null && signal?.noOneOnOneDays !== undefined
                          ? { label: `${signal.noOneOnOneDays}d since 1:1`, tone: "attention" }
                          : { label: "Healthy", tone: "healthy" }
                  }
                  href={(id) => `/people/${id}`}
                  LinkComponent={RouterLinkAdapter}
                />
              );
            })}
          </div>
        ) : (
          <DataTable
            columns={personColumns}
            data={filtered}
            onRowClick={(row) => navigate(`/people/${row.id}`)}
          />
        )}
      </main>

      <PersonFormDialog open={createOpen} onOpenChange={closeCreate} />
    </>
  );
}
