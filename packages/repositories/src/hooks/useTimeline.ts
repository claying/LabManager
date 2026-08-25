import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys";
import { getProjectTimeline } from "../repositories/timelineRepository";

export function useProjectTimeline(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.timeline(projectId ?? ""),
    queryFn: () => getProjectTimeline(projectId as string),
    enabled: Boolean(projectId),
  });
}
