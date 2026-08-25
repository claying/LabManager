import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { HypothesisUpdatePatch } from "@pi-os/types";
import type { HypothesisInput, EvidenceInput } from "@pi-os/domain";
import { queryKeys } from "./queryKeys";
import { hypothesisRepository } from "../repositories/hypothesisRepository";
import { evidenceRepository } from "../repositories/evidenceRepository";

export function useHypotheses(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.hypotheses.list(projectId ?? ""),
    queryFn: () => hypothesisRepository.list(projectId as string),
    enabled: Boolean(projectId),
  });
}

export function useHypothesesForQuestion(questionId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.hypotheses.forQuestion(questionId ?? ""),
    queryFn: () => hypothesisRepository.listForQuestion(questionId as string),
    enabled: Boolean(questionId),
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>, projectId: string) {
  void qc.invalidateQueries({ queryKey: queryKeys.hypotheses.list(projectId) });
  void qc.invalidateQueries({ queryKey: ["hypotheses", "for-question"] });
  void qc.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
}

export function useCreateHypothesis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: HypothesisInput & { project_id: string }) =>
      hypothesisRepository.create(input),
    onSuccess: (data) => invalidate(qc, data.project_id),
  });
}

export function useUpdateHypothesis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: HypothesisUpdatePatch }) =>
      hypothesisRepository.update(id, patch),
    onSuccess: (data) => invalidate(qc, data.project_id),
  });
}

export function useDeleteHypothesis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; projectId: string }) => hypothesisRepository.remove(id),
    onSuccess: (_data, vars) => invalidate(qc, vars.projectId),
  });
}

export function useCreateEvidence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: EvidenceInput & { hypothesis_id: string; project_id: string }) =>
      evidenceRepository.create(input),
    onSuccess: (data) => invalidate(qc, data.project_id),
  });
}
