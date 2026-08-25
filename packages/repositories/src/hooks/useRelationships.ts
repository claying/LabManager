import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys";
import { relationshipRepository } from "../repositories/relationshipRepository";

export function useProjectRelated(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.related.project(projectId ?? ""),
    queryFn: () => relationshipRepository.getProjectRelated(projectId as string),
    enabled: Boolean(projectId),
  });
}

export function usePersonRelated(personId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.related.person(personId ?? ""),
    queryFn: () => relationshipRepository.getPersonRelated(personId as string),
    enabled: Boolean(personId),
  });
}
