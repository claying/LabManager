import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys";
import { graphRepository, type GraphNodeKind } from "../repositories/graphRepository";

export function useGraphNeighborhood(kind: GraphNodeKind | undefined, id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.graph(kind ?? "", id ?? ""),
    queryFn: () => graphRepository.getNeighborhood(kind as GraphNodeKind, id as string),
    enabled: Boolean(kind && id),
  });
}
