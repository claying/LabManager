import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys";
import {
  getStageDistribution,
  getStageAging,
  getProjectMovement,
  getHealthTrend,
  getDeadlineLoad,
  getSubmissionLoad,
  getActivityByWeek,
} from "../repositories/portfolioRepository";

export function useStageDistribution() {
  return useQuery({
    queryKey: queryKeys.portfolio.stageDistribution,
    queryFn: getStageDistribution,
  });
}

export function useStageAging() {
  return useQuery({ queryKey: queryKeys.portfolio.stageAging, queryFn: () => getStageAging() });
}

export function useProjectMovement(weeks: number) {
  return useQuery({
    queryKey: queryKeys.portfolio.movement(weeks),
    queryFn: () => getProjectMovement(weeks),
  });
}

export function useHealthTrend(weeks: number) {
  return useQuery({
    queryKey: queryKeys.portfolio.healthTrend(weeks),
    queryFn: () => getHealthTrend(weeks),
  });
}

export function useDeadlineLoad(weeks: number) {
  return useQuery({
    queryKey: queryKeys.portfolio.deadlineLoad(weeks),
    queryFn: () => getDeadlineLoad(weeks),
  });
}

export function useSubmissionLoad(months: number) {
  return useQuery({
    queryKey: queryKeys.portfolio.submissionLoad(months),
    queryFn: () => getSubmissionLoad(months),
  });
}

export function useActivityByWeek(weeks: number) {
  return useQuery({
    queryKey: queryKeys.portfolio.activity(weeks),
    queryFn: () => getActivityByWeek(weeks),
  });
}
