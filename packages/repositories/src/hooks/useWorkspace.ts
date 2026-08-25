import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { WorkspaceInsert, WorkspaceUpdatePatch } from "@pi-os/types";
import { queryKeys } from "./queryKeys";
import { workspaceRepository } from "../repositories/workspaceRepository";

export function useWorkspace() {
  return useQuery({
    queryKey: queryKeys.workspace,
    queryFn: () => workspaceRepository.get(),
  });
}

export function useCreateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: WorkspaceInsert) => workspaceRepository.create(input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.workspace }),
  });
}

export function useUpdateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: WorkspaceUpdatePatch) => workspaceRepository.update(patch),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.workspace }),
  });
}
