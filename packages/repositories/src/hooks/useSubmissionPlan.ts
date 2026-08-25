import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys";
import { submissionPlanRepository } from "../repositories/submissionPlanRepository";

export function useSubmissionPlan(publicationId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.submissionPlan(publicationId ?? ""),
    queryFn: () => submissionPlanRepository.getForPublication(publicationId as string),
    enabled: Boolean(publicationId),
  });
}

export function useSubmissionHealth(publicationId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.submissionHealth(publicationId ?? ""),
    queryFn: () => submissionPlanRepository.calculateHealth(publicationId as string),
    enabled: Boolean(publicationId),
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>, publicationId: string) {
  void qc.invalidateQueries({ queryKey: queryKeys.submissionPlan(publicationId) });
  void qc.invalidateQueries({ queryKey: queryKeys.submissionHealth(publicationId) });
}

export function useCreateSubmissionPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      publicationId,
      venueCycleId,
    }: {
      publicationId: string;
      venueCycleId: string | null;
    }) => submissionPlanRepository.create(publicationId, venueCycleId),
    onSuccess: (data) => invalidate(qc, data.publication_id),
  });
}

export function useSetSubmissionPlanItemStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      itemId,
      status,
    }: {
      itemId: string;
      status: "pending" | "done";
      publicationId: string;
    }) => submissionPlanRepository.setItemStatus(itemId, status),
    onSuccess: (_data, vars) => invalidate(qc, vars.publicationId),
  });
}
