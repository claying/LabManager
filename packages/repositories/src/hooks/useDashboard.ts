import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys";
import { getDashboardData, getThisWeekSummary } from "../repositories/dashboardRepository";

export function useDashboardData() {
  return useQuery({ queryKey: queryKeys.dashboard, queryFn: getDashboardData });
}

export function useThisWeekSummary() {
  return useQuery({
    queryKey: [...queryKeys.dashboard, "week-summary"],
    queryFn: () => getThisWeekSummary(),
  });
}
