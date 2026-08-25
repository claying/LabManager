import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ResearchQuestionUpdatePatch } from "@pi-os/types";
import type { ResearchQuestionInput } from "@pi-os/domain";
import { queryKeys } from "./queryKeys";
import { researchQuestionRepository } from "../repositories/researchQuestionRepository";

export function useResearchQuestions(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.researchQuestions.list(projectId ?? ""),
    queryFn: () => researchQuestionRepository.list(projectId as string),
    enabled: Boolean(projectId),
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>, projectId: string) {
  void qc.invalidateQueries({ queryKey: queryKeys.researchQuestions.list(projectId) });
  void qc.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
}

export function useCreateResearchQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ResearchQuestionInput & { project_id: string }) =>
      researchQuestionRepository.create(input),
    onSuccess: (data) => invalidate(qc, data.project_id),
  });
}

export function useUpdateResearchQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: ResearchQuestionUpdatePatch }) =>
      researchQuestionRepository.update(id, patch),
    onSuccess: (data) => invalidate(qc, data.project_id),
  });
}

export function useDeleteResearchQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; projectId: string }) =>
      researchQuestionRepository.remove(id),
    onSuccess: (_data, vars) => invalidate(qc, vars.projectId),
  });
}
