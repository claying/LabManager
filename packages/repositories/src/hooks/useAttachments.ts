import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AttachmentEntityType, AttachmentInsert } from "@pi-os/types";
import { queryKeys } from "./queryKeys";
import { attachmentRepository } from "../repositories/attachmentRepository";

export function useAttachments(entityType: AttachmentEntityType, entityId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.attachments(entityType, entityId ?? ""),
    queryFn: () => attachmentRepository.list(entityType, entityId as string),
    enabled: Boolean(entityId),
  });
}

export function useCreateAttachment(entityType: AttachmentEntityType, entityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<AttachmentInsert, "entity_type" | "entity_id">) =>
      attachmentRepository.create({ ...input, entity_type: entityType, entity_id: entityId }),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: queryKeys.attachments(entityType, entityId) }),
  });
}

export function useDeleteAttachment(entityType: AttachmentEntityType, entityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => attachmentRepository.remove(id),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: queryKeys.attachments(entityType, entityId) }),
  });
}
