import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ProjectRelationInsert } from "@pi-os/types";
import { queryKeys } from "./queryKeys";
import { projectRelationRepository } from "../repositories/projectRelationRepository";

export function useProjectRelations(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.projectRelations(projectId ?? ""),
    queryFn: () => projectRelationRepository.listForProject(projectId as string),
    enabled: Boolean(projectId),
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>, projectId: string, otherId: string) {
  void qc.invalidateQueries({ queryKey: queryKeys.projectRelations(projectId) });
  void qc.invalidateQueries({ queryKey: queryKeys.projectRelations(otherId) });
  void qc.invalidateQueries({ queryKey: queryKeys.related.project(projectId) });
  void qc.invalidateQueries({ queryKey: queryKeys.related.project(otherId) });
}

export function useCreateProjectRelation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ProjectRelationInsert) => projectRelationRepository.create(input),
    onSuccess: (data) => invalidate(qc, data.project_id, data.related_project_id),
  });
}

export function useDeleteProjectRelation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; projectId: string; otherId: string }) =>
      projectRelationRepository.remove(id),
    onSuccess: (_data, vars) => invalidate(qc, vars.projectId, vars.otherId),
  });
}
