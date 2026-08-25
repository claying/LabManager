import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PaperReadinessStatus } from "@pi-os/types";
import { queryKeys } from "./queryKeys";
import { paperReadinessRepository } from "../repositories/paperReadinessRepository";

export function usePaperReadiness(publicationId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.paperReadiness(publicationId ?? ""),
    queryFn: () => paperReadinessRepository.ensureDefaults(publicationId as string),
    enabled: Boolean(publicationId),
  });
}

export function useSetReadinessStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      itemId,
      status,
    }: {
      itemId: string;
      status: PaperReadinessStatus;
      publicationId: string;
    }) => paperReadinessRepository.setStatus(itemId, status),
    onSuccess: (_data, vars) =>
      void qc.invalidateQueries({ queryKey: queryKeys.paperReadiness(vars.publicationId) }),
  });
}
