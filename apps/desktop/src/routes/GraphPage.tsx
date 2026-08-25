import { useCallback, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  useGraphNeighborhood,
  useProjects,
  usePeople,
  usePublications,
  useGrants,
} from "@pi-os/repositories";
import type { GraphNodeKind } from "@pi-os/repositories";
import { Button } from "@pi-os/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@pi-os/ui/components/select";
import { Checkbox } from "@pi-os/ui/components/checkbox";
import { Card, CardContent } from "@pi-os/ui/components/card";
import { EmptyState } from "@pi-os/ui/components/domain/empty-state";
import { PageHeader } from "@pi-os/ui/components/domain/page-header";
import { Network } from "lucide-react";
import { TopBar } from "../components/app-shell/topbar";
import { useNavigate } from "react-router-dom";

const KIND_COLOR: Record<GraphNodeKind, string> = {
  project: "hsl(var(--primary))",
  person: "hsl(var(--success))",
  publication: "hsl(var(--warning))",
  grant: "hsl(217 91% 60%)",
  idea: "hsl(280 65% 60%)",
};

const KIND_LABEL: Record<GraphNodeKind, string> = {
  project: "Project",
  person: "Person",
  publication: "Paper",
  grant: "Grant",
  idea: "Idea",
};

const ALL_KINDS: GraphNodeKind[] = ["project", "person", "publication", "grant", "idea"];

const ENTITY_ROUTE: Record<GraphNodeKind, (id: string) => string> = {
  project: (id) => `/projects/${id}`,
  person: (id) => `/people/${id}`,
  publication: (id) => `/publications/${id}`,
  grant: () => `/grants`,
  idea: () => `/ideas`,
};

export default function GraphPage() {
  const navigate = useNavigate();
  const [center, setCenter] = useState<{ kind: GraphNodeKind; id: string } | null>(null);
  const [visibleKinds, setVisibleKinds] = useState<Set<GraphNodeKind>>(new Set(ALL_KINDS));
  const [selectedNode, setSelectedNode] = useState<{
    kind: GraphNodeKind;
    id: string;
    label: string;
  } | null>(null);

  const { data: projects } = useProjects();
  const { data: people } = usePeople();
  const { data: publications } = usePublications();
  const { data: grants } = useGrants();
  const { data: neighborhood, isLoading } = useGraphNeighborhood(center?.kind, center?.id);

  const { nodes, edges } = useMemo(() => {
    if (!neighborhood) return { nodes: [] as Node[], edges: [] as Edge[] };
    const visible = neighborhood.nodes.filter((n) => visibleKinds.has(n.kind));
    const visibleIds = new Set([neighborhood.center.id, ...visible.map((n) => n.id)]);

    const radius = 220;
    const angleStep = (2 * Math.PI) / Math.max(visible.length, 1);
    const rfNodes: Node[] = [
      {
        id: neighborhood.center.id,
        position: { x: 0, y: 0 },
        data: { label: neighborhood.center.label },
        style: {
          background: KIND_COLOR[neighborhood.center.kind],
          color: "white",
          border: "2px solid hsl(var(--foreground))",
          borderRadius: 8,
          padding: 8,
          fontWeight: 600,
          fontSize: 12,
        },
      },
      ...visible.map((n, i) => ({
        id: n.id,
        position: {
          x: radius * Math.cos(i * angleStep),
          y: radius * Math.sin(i * angleStep),
        },
        data: { label: n.label },
        style: {
          background: KIND_COLOR[n.kind],
          color: "white",
          opacity: 0.85,
          borderRadius: 8,
          padding: 6,
          fontSize: 11,
        },
      })),
    ];
    const rfEdges: Edge[] = neighborhood.edges
      .filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target))
      .map((e, i) => ({
        id: `e${i}`,
        source: e.source,
        target: e.target,
        label: e.label,
        style: { stroke: "hsl(var(--muted-foreground))" },
        labelStyle: { fontSize: 10, fill: "hsl(var(--muted-foreground))" },
      }));
    return { nodes: rfNodes, edges: rfEdges };
  }, [neighborhood, visibleKinds]);

  const nodeKindById = useMemo(() => {
    const map = new Map<string, { kind: GraphNodeKind; label: string }>();
    if (neighborhood) {
      map.set(neighborhood.center.id, {
        kind: neighborhood.center.kind,
        label: neighborhood.center.label,
      });
      for (const n of neighborhood.nodes) map.set(n.id, { kind: n.kind, label: n.label });
    }
    return map;
  }, [neighborhood]);

  const onNodeClick: NodeMouseHandler = useCallback(
    (_, node) => {
      const info = nodeKindById.get(node.id);
      if (info) setSelectedNode({ kind: info.kind, id: node.id, label: info.label });
    },
    [nodeKindById],
  );

  const onNodeDoubleClick: NodeMouseHandler = useCallback(
    (_, node) => {
      const info = nodeKindById.get(node.id);
      if (info) {
        setCenter({ kind: info.kind, id: node.id });
        setSelectedNode(null);
      }
    },
    [nodeKindById],
  );

  function toggleKind(kind: GraphNodeKind) {
    setVisibleKinds((prev) => {
      const next = new Set(prev);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });
  }

  return (
    <>
      <TopBar>
        <PageHeader
          title="Relationship Graph"
          description="The selected entity and its direct connections — never the whole lab."
        />
      </TopBar>
      <main className="flex flex-1 flex-col gap-4 overflow-hidden p-6">
        <div className="flex flex-wrap items-center gap-3">
          <Select
            onValueChange={(v) => {
              const [kind, id] = v.split(":") as [GraphNodeKind, string];
              setCenter({ kind, id });
              setSelectedNode(null);
            }}
          >
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Choose a starting project, person, paper, or grant…" />
            </SelectTrigger>
            <SelectContent>
              {projects && projects.length > 0 && (
                <>
                  {projects.map((p) => (
                    <SelectItem key={`project:${p.id}`} value={`project:${p.id}`}>
                      {p.title}
                    </SelectItem>
                  ))}
                </>
              )}
              {people?.map((p) => (
                <SelectItem key={`person:${p.id}`} value={`person:${p.id}`}>
                  {p.name}
                </SelectItem>
              ))}
              {publications?.map((p) => (
                <SelectItem key={`publication:${p.id}`} value={`publication:${p.id}`}>
                  {p.title}
                </SelectItem>
              ))}
              {grants?.map((g) => (
                <SelectItem key={`grant:${g.id}`} value={`grant:${g.id}`}>
                  {g.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex flex-wrap items-center gap-3">
            {ALL_KINDS.map((kind) => (
              <label key={kind} className="flex items-center gap-1.5 text-sm">
                <Checkbox
                  checked={visibleKinds.has(kind)}
                  onCheckedChange={() => toggleKind(kind)}
                />
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: KIND_COLOR[kind] }}
                />
                {KIND_LABEL[kind]}
              </label>
            ))}
          </div>
        </div>

        {!center ? (
          <EmptyState
            icon={Network}
            title="Pick a starting point"
            description="Choose a project, person, paper, or grant above to see what's directly connected to it."
          />
        ) : isLoading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : nodes.length <= 1 ? (
          <EmptyState
            icon={Network}
            title="No connections yet"
            description="This entity isn't linked to anything else yet, or every connected kind is hidden by the filters above."
          />
        ) : (
          <div className="relative flex-1 rounded-lg border">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodeClick={onNodeClick}
              onNodeDoubleClick={onNodeDoubleClick}
              fitView
              nodesDraggable
              nodesConnectable={false}
              elementsSelectable
            >
              <Background />
              <Controls showInteractive={false} />
            </ReactFlow>
            {selectedNode && (
              <Card className="absolute right-4 top-4 w-64 shadow-lg">
                <CardContent className="space-y-2 py-4">
                  <p className="text-muted-foreground text-xs font-medium uppercase">
                    {KIND_LABEL[selectedNode.kind]}
                  </p>
                  <p className="text-foreground text-sm font-medium">{selectedNode.label}</p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setCenter({ kind: selectedNode.kind, id: selectedNode.id });
                        setSelectedNode(null);
                      }}
                    >
                      Focus
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigate(ENTITY_ROUTE[selectedNode.kind](selectedNode.id))}
                    >
                      Open
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>
    </>
  );
}
