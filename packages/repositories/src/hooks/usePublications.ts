import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PublicationUpdatePatch } from "@pi-os/types";
import type { PublicationInput } from "@pi-os/domain";
import { queryKeys } from "./queryKeys";
import { publicationRepository } from "../repositories/publicationRepository";

export function usePublications(projectId?: string) {
  return useQuery({
    queryKey: queryKeys.publications.list(projectId),
    queryFn: () => publicationRepository.list({ projectId }),
  });
}

export function usePublication(publicationId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.publications.detail(publicationId ?? ""),
    queryFn: () => publicationRepository.get(publicationId as string),
    enabled: Boolean(publicationId),
  });
}

export function useCreatePublication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PublicationInput) => publicationRepository.create(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["publications"] });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

export function useUpdatePublication(publicationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: PublicationUpdatePatch) =>
      publicationRepository.update(publicationId, patch),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.publications.detail(publicationId) });
      void qc.invalidateQueries({ queryKey: ["publications"] });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

export function useDeletePublication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (publicationId: string) => publicationRepository.remove(publicationId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["publications"] }),
  });
}
