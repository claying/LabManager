import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys";
import {
  getOneOnOneRhythm,
  getProjectLoadByPerson,
  getInteractionRhythm,
} from "../repositories/supervisionRepository";

export function useOneOnOneRhythm() {
  return useQuery({ queryKey: queryKeys.supervision.rhythm, queryFn: () => getOneOnOneRhythm() });
}

export function useProjectLoadByPerson() {
  return useQuery({
    queryKey: queryKeys.supervision.projectLoad,
    queryFn: () => getProjectLoadByPerson(),
  });
}

export function useInteractionRhythm(weeks: number) {
  return useQuery({
    queryKey: queryKeys.supervision.interaction(weeks),
    queryFn: () => getInteractionRhythm(weeks),
  });
}
