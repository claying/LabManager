import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SavedViewEntityType, SavedViewInsert } from "@pi-os/types";
import { queryKeys } from "./queryKeys";
import { savedViewRepository } from "../repositories/savedViewRepository";

export function useSavedViews(entityType?: SavedViewEntityType) {
  return useQuery({
    queryKey: queryKeys.savedViews(entityType),
    queryFn: () => savedViewRepository.list(entityType),
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ["saved-views"] });
}

export function useCreateSavedView() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SavedViewInsert) => savedViewRepository.create(input),
    onSuccess: () => invalidate(qc),
  });
}

export function useRenameSavedView() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      savedViewRepository.rename(id, name),
    onSuccess: () => invalidate(qc),
  });
}

export function useSetSavedViewPinned() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, pinned }: { id: string; pinned: boolean }) =>
      savedViewRepository.setPinned(id, pinned),
    onSuccess: () => invalidate(qc),
  });
}

export function useDeleteSavedView() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => savedViewRepository.remove(id),
    onSuccess: () => invalidate(qc),
  });
}
