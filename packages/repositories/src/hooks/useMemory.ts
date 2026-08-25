import { useQuery } from "@tanstack/react-query";
import type { MemoryEventType } from "@pi-os/types";
import { queryKeys } from "./queryKeys";
import { memoryRepository, type MemoryFilters } from "../repositories/memoryRepository";

export function useMemory(filters: MemoryFilters) {
  return useQuery({
    queryKey: queryKeys.memory.list(filters as Record<string, unknown>),
    queryFn: () => memoryRepository.list(filters),
  });
}

export function useMemoryContext(type: MemoryEventType | undefined, id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.memory.context(type ?? "", id ?? ""),
    queryFn: () => memoryRepository.getContext(type!, id!),
    enabled: Boolean(type && id),
  });
}
