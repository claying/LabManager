import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys";
import { getGitInfo } from "../repositories/gitRepository";

export function useGitInfo(path: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.git(path ?? ""),
    queryFn: () => getGitInfo(path as string),
    enabled: Boolean(path),
    staleTime: 30_000,
    retry: false,
  });
}
