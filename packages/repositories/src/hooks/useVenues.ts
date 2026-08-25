import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { VenueCycleUpdatePatch, VenueUpdatePatch } from "@pi-os/types";
import type { VenueInput, VenueCycleInput } from "@pi-os/domain";
import { queryKeys } from "./queryKeys";
import { venueRepository, venueCycleRepository } from "../repositories/venueRepository";

export function useVenues() {
  return useQuery({ queryKey: queryKeys.venues.list, queryFn: () => venueRepository.list() });
}

export function useCreateVenue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: VenueInput) => venueRepository.create(input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.venues.list }),
  });
}

export function useUpdateVenue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: VenueUpdatePatch }) =>
      venueRepository.update(id, patch),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.venues.list }),
  });
}

export function useVenueCycles(opts: { upcomingOnly?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.venueCycles.list(opts.upcomingOnly),
    queryFn: () => venueCycleRepository.list(opts),
  });
}

export function useVenueCycle(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.venueCycles.detail(id ?? ""),
    queryFn: () => venueCycleRepository.get(id as string),
    enabled: Boolean(id),
  });
}

function invalidateCycles(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ["venue-cycles"] });
  void qc.invalidateQueries({ queryKey: queryKeys.portfolio.deadlineLoad(12) });
}

export function useCreateVenueCycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: VenueCycleInput & { venue_id: string }) =>
      venueCycleRepository.create(input),
    onSuccess: () => invalidateCycles(qc),
  });
}

export function useUpdateVenueCycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: VenueCycleUpdatePatch }) =>
      venueCycleRepository.update(id, patch),
    onSuccess: () => invalidateCycles(qc),
  });
}
