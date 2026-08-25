import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { DecisionRequest, DecisionRequestUpdatePatch } from "@pi-os/types";
import type { DecisionRequestInput } from "@pi-os/domain";
import { queryKeys } from "./queryKeys";
import { decisionRequestRepository } from "../repositories/decisionRequestRepository";

export function useDecisionRequests(
  filters: { status?: DecisionRequest["status"]; projectId?: string; personId?: string } = {},
) {
  return useQuery({
    queryKey: queryKeys.decisions.list(filters),
    queryFn: () => decisionRequestRepository.list(filters),
  });
}

export function useDecisionRequest(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.decisions.detail(id ?? ""),
    queryFn: () => decisionRequestRepository.get(id as string),
    enabled: Boolean(id),
  });
}

function invalidateDecisions(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ["decisions"] });
  void qc.invalidateQueries({ queryKey: queryKeys.dashboard });
  void qc.invalidateQueries({ queryKey: queryKeys.inbox });
}

export function useCreateDecisionRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: DecisionRequestInput) => decisionRequestRepository.create(input),
    onSuccess: () => invalidateDecisions(qc),
  });
}

export function useUpdateDecisionRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: DecisionRequestUpdatePatch }) =>
      decisionRequestRepository.update(id, patch),
    onSuccess: () => invalidateDecisions(qc),
  });
}

export function useResolveDecisionRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      decision,
      rationale,
    }: {
      id: string;
      decision: string;
      rationale: string | null;
    }) => decisionRequestRepository.resolve(id, decision, rationale),
    onSuccess: (data) => {
      invalidateDecisions(qc);
      if (data.project_id)
        void qc.invalidateQueries({ queryKey: queryKeys.timeline(data.project_id) });
      void qc.invalidateQueries({ queryKey: ["search"] });
    },
  });
}

export function useDeferDecisionRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => decisionRequestRepository.defer(id),
    onSuccess: () => invalidateDecisions(qc),
  });
}

export function useDeleteDecisionRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => decisionRequestRepository.remove(id),
    onSuccess: () => invalidateDecisions(qc),
  });
}
