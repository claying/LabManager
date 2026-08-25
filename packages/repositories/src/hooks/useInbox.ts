import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys";
import { inboxRepository } from "../repositories/inboxRepository";

export function useInbox() {
  return useQuery({ queryKey: queryKeys.inbox, queryFn: () => inboxRepository.list() });
}

const SNOOZE_DAYS = 3;

export function useSnoozeInboxItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (key: string) => {
      const until = new Date();
      until.setDate(until.getDate() + SNOOZE_DAYS);
      return inboxRepository.snooze(key, until.toISOString());
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.inbox }),
  });
}

export function useDismissInboxItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (key: string) => inboxRepository.dismiss(key),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.inbox }),
  });
}

/** Undo for a snooze/dismiss (SPEC_followup section 31). */
export function useRestoreInboxItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (key: string) => inboxRepository.clearState(key),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.inbox }),
  });
}
