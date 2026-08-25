import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys";
import { advancedSearch, globalSearch } from "../repositories/searchRepository";

export function useGlobalSearch(term: string) {
  return useQuery({
    queryKey: queryKeys.search(term),
    queryFn: () => globalSearch(term),
    enabled: term.trim().length >= 2,
    staleTime: 5_000,
  });
}

/** Structured search (`project:X person:Y type:decision ...` plus free text). Unlike useGlobalSearch, this also runs on filter-only queries with no free text. */
export function useAdvancedSearch(query: string) {
  return useQuery({
    queryKey: queryKeys.advancedSearch(query),
    queryFn: () => advancedSearch(query),
    enabled: query.trim().length >= 2,
    staleTime: 5_000,
  });
}
