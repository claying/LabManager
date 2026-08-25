import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PersonUpdatePatch } from "@pi-os/types";
import type { PersonInput } from "@pi-os/domain";
import { queryKeys } from "./queryKeys";
import { peopleRepository } from "../repositories/peopleRepository";
import {
  getPeopleProjectStats,
  getPeopleSupervisionSignals,
} from "../repositories/peopleStatsRepository";
import { getPersonProfileData } from "../repositories/personProfileRepository";

export function usePeople() {
  return useQuery({ queryKey: queryKeys.people.list, queryFn: () => peopleRepository.list() });
}

export function usePerson(personId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.people.detail(personId ?? ""),
    queryFn: () => peopleRepository.get(personId as string),
    enabled: Boolean(personId),
  });
}

export function usePeopleProjectStats() {
  return useQuery({ queryKey: queryKeys.people.stats, queryFn: getPeopleProjectStats });
}

export function usePeopleSupervisionSignals() {
  return useQuery({
    queryKey: [...queryKeys.people.stats, "supervision"],
    queryFn: getPeopleSupervisionSignals,
  });
}

export function usePersonProfile(personId: string | undefined) {
  const { data: person } = usePerson(personId);
  return useQuery({
    queryKey: queryKeys.people.profile(personId ?? ""),
    queryFn: () => getPersonProfileData(person!),
    enabled: Boolean(person),
  });
}

export function useCreatePerson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PersonInput) => peopleRepository.create(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.people.list });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

export function useUpdatePerson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ personId, patch }: { personId: string; patch: PersonUpdatePatch }) =>
      peopleRepository.update(personId, patch),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: queryKeys.people.detail(data.id) });
      void qc.invalidateQueries({ queryKey: queryKeys.people.list });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

export function useDeletePerson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (personId: string) => peopleRepository.remove(personId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.people.list });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}
