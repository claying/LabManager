import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { MilestoneUpdatePatch } from "@pi-os/types";
import type { MilestoneInput } from "@pi-os/domain";
import { queryKeys } from "./queryKeys";
import { milestoneRepository } from "../repositories/milestoneRepository";

export function useMilestones(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.projects.milestones(projectId ?? ""),
    queryFn: () => milestoneRepository.list(projectId as string),
    enabled: Boolean(projectId),
  });
}

export function useCreateMilestone(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: MilestoneInput) =>
      milestoneRepository.create({ ...input, project_id: projectId }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.projects.milestones(projectId) });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

export function useUpdateMilestone(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ milestoneId, patch }: { milestoneId: string; patch: MilestoneUpdatePatch }) =>
      milestoneRepository.update(milestoneId, patch),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.projects.milestones(projectId) });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

export function useDeleteMilestone(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (milestoneId: string) => milestoneRepository.remove(milestoneId),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: queryKeys.projects.milestones(projectId) }),
  });
}
