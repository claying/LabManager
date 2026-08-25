import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ActionItemUpdatePatch } from "@pi-os/types";
import type { ActionItemInput } from "@pi-os/domain";
import { queryKeys } from "./queryKeys";
import { actionItemRepository } from "../repositories/actionItemRepository";

export function useActionItems(
  filters: { projectId?: string; assigneePersonId?: string; openOnly?: boolean } = {},
) {
  return useQuery({
    queryKey: queryKeys.actionItems.list(filters),
    queryFn: () => actionItemRepository.list(filters),
  });
}

export function useCreateActionItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ input, meetingId }: { input: ActionItemInput; meetingId?: string }) =>
      actionItemRepository.create(input, meetingId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["action-items"] });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard });
      void qc.invalidateQueries({ queryKey: queryKeys.inbox });
    },
  });
}

export function useUpdateActionItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ actionItemId, patch }: { actionItemId: string; patch: ActionItemUpdatePatch }) =>
      actionItemRepository.update(actionItemId, patch),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["action-items"] });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard });
      void qc.invalidateQueries({ queryKey: queryKeys.inbox });
    },
  });
}

export function useDeleteActionItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (actionItemId: string) => actionItemRepository.remove(actionItemId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["action-items"] }),
  });
}
