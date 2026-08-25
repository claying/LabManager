import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { GrantUpdatePatch } from "@pi-os/types";
import type { GrantInput } from "@pi-os/domain";
import { queryKeys } from "./queryKeys";
import { grantRepository } from "../repositories/grantRepository";

export function useGrants() {
  return useQuery({ queryKey: queryKeys.grants.list, queryFn: () => grantRepository.list() });
}

export function useGrant(grantId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.grants.detail(grantId ?? ""),
    queryFn: () => grantRepository.get(grantId as string),
    enabled: Boolean(grantId),
  });
}

export function useCreateGrant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: GrantInput) => grantRepository.create(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.grants.list });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

export function useUpdateGrant(grantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: GrantUpdatePatch) => grantRepository.update(grantId, patch),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.grants.detail(grantId) });
      void qc.invalidateQueries({ queryKey: queryKeys.grants.list });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

export function useDeleteGrant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (grantId: string) => grantRepository.remove(grantId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.grants.list }),
  });
}
