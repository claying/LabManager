"use client";

import type { ReactNode } from "react";
import {
  DndContext,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { cn } from "../../lib/utils";
import { Badge } from "../badge";

export interface PipelineColumn<TStage extends string> {
  stage: TStage;
  label: string;
}

export interface PipelineBoardProps<TItem, TStage extends string> {
  columns: PipelineColumn<TStage>[];
  items: TItem[];
  getItemStage: (item: TItem) => TStage;
  getItemId: (item: TItem) => string;
  renderItem: (item: TItem) => ReactNode;
  onMove: (itemId: string, newStage: TStage) => void;
  className?: string;
}

export function PipelineBoard<TItem, TStage extends string>({
  columns,
  items,
  getItemStage,
  getItemId,
  renderItem,
  onMove,
  className,
}: PipelineBoardProps<TItem, TStage>) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const newStage = over.id as TStage;
    const currentItem = items.find((i) => getItemId(i) === active.id);
    if (currentItem && getItemStage(currentItem) !== newStage) {
      onMove(String(active.id), newStage);
    }
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className={cn("flex gap-3 overflow-x-auto pb-3", className)}>
        {columns.map((col) => {
          const colItems = items.filter((i) => getItemStage(i) === col.stage);
          return (
            <PipelineColumnDroppable
              key={col.stage}
              stage={col.stage}
              label={col.label}
              count={colItems.length}
            >
              {colItems.map((item) => (
                <PipelineCardDraggable key={getItemId(item)} id={getItemId(item)}>
                  {renderItem(item)}
                </PipelineCardDraggable>
              ))}
            </PipelineColumnDroppable>
          );
        })}
      </div>
    </DndContext>
  );
}

function PipelineColumnDroppable({
  stage,
  label,
  count,
  children,
}: {
  stage: string;
  label: string;
  count: number;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "border-border bg-muted/30 flex w-64 shrink-0 flex-col rounded-lg border transition-colors",
        isOver && "border-primary/50 bg-primary/5",
      )}
    >
      <div className="flex items-center justify-between px-3 py-2.5">
        <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
          {label}
        </span>
        <Badge variant="muted">{count}</Badge>
      </div>
      <div className="flex min-h-[4rem] flex-1 flex-col gap-2 px-2 pb-2">{children}</div>
    </div>
  );
}

function PipelineCardDraggable({ id, children }: { id: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 10 }
    : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn("cursor-grab touch-none active:cursor-grabbing", isDragging && "opacity-60")}
    >
      {children}
    </div>
  );
}
