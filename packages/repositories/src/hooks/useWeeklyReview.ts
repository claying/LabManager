import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { WeeklyReviewSnapshot } from "@pi-os/types";
import { queryKeys } from "./queryKeys";
import { weeklyReviewRepository } from "../repositories/weeklyReviewRepository";

/** Live preview of the current week's review — recomputed every time, never persisted until Save. */
export function useWeeklyReviewPreview() {
  return useQuery({
    queryKey: queryKeys.weeklyReview.preview,
    queryFn: () => weeklyReviewRepository.preview(),
  });
}

export function useWeeklyReviewList() {
  return useQuery({
    queryKey: queryKeys.weeklyReview.list,
    queryFn: () => weeklyReviewRepository.list(),
  });
}

export function useWeeklyReview(weekStart: string | undefined) {
  return useQuery({
    queryKey: queryKeys.weeklyReview.detail(weekStart ?? ""),
    queryFn: () => weeklyReviewRepository.get(weekStart as string),
    enabled: Boolean(weekStart),
  });
}

export function useSaveWeeklyReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      weekStart,
      weekEnd,
      snapshot,
    }: {
      weekStart: string;
      weekEnd: string;
      snapshot: WeeklyReviewSnapshot;
    }) => weeklyReviewRepository.save(weekStart, weekEnd, snapshot),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: queryKeys.weeklyReview.list });
      void qc.invalidateQueries({ queryKey: queryKeys.weeklyReview.detail(data.week_start) });
    },
  });
}
