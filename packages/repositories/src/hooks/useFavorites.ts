import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { FavoriteEntityType } from "@pi-os/types";
import { queryKeys } from "./queryKeys";
import { favoriteRepository } from "../repositories/favoriteRepository";

export function useFavorites(entityType?: FavoriteEntityType) {
  return useQuery({
    queryKey: queryKeys.favorites(entityType),
    queryFn: () => favoriteRepository.list(entityType),
  });
}

export function useFavoritesWithTitles(entityType?: FavoriteEntityType) {
  return useQuery({
    queryKey: [...queryKeys.favorites(entityType), "titled"],
    queryFn: () => favoriteRepository.listWithTitles(entityType),
  });
}

export function useIsFavorite(entityType: FavoriteEntityType, entityId: string | undefined) {
  const { data } = useFavorites(entityType);
  return Boolean(data?.some((f) => f.entity_id === entityId));
}

export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ entityType, entityId }: { entityType: FavoriteEntityType; entityId: string }) =>
      favoriteRepository.toggle(entityType, entityId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["favorites"] }),
  });
}
