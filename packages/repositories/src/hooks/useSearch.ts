import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys";
import { globalSearch } from "../repositories/searchRepository";

export function useGlobalSearch(term: string) {
  return useQuery({
    queryKey: queryKeys.search(term),
    queryFn: () => globalSearch(term),
    enabled: term.trim().length >= 2,
    staleTime: 5_000,
  });
}
