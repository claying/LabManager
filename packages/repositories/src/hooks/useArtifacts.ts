import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ArtifactInsert, ArtifactUpdatePatch } from "@pi-os/types";
import { queryKeys } from "./queryKeys";
import { artifactRepository } from "../repositories/artifactRepository";

export function useArtifacts(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.artifacts(projectId ?? ""),
    queryFn: () => artifactRepository.listForProject(projectId as string),
    enabled: Boolean(projectId),
  });
}

export function useCreateArtifact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ArtifactInsert) => artifactRepository.create(input),
    onSuccess: (data) =>
      void qc.invalidateQueries({ queryKey: queryKeys.artifacts(data.project_id) }),
  });
}

export function useUpdateArtifact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: ArtifactUpdatePatch; projectId: string }) =>
      artifactRepository.update(id, patch),
    onSuccess: (_data, vars) =>
      void qc.invalidateQueries({ queryKey: queryKeys.artifacts(vars.projectId) }),
  });
}

export function useDeleteArtifact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; projectId: string }) => artifactRepository.remove(id),
    onSuccess: (_data, vars) =>
      void qc.invalidateQueries({ queryKey: queryKeys.artifacts(vars.projectId) }),
  });
}
