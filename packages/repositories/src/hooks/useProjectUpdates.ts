import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ProjectUpdateInput } from "@pi-os/domain";
import { queryKeys } from "./queryKeys";
import { projectUpdatesRepository } from "../repositories/projectUpdatesRepository";

export function useProjectUpdates(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.projects.updates(projectId ?? ""),
    queryFn: () => projectUpdatesRepository.list(projectId as string),
    enabled: Boolean(projectId),
  });
}

export function useSubmitProjectUpdate(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      authorPersonId,
      input,
    }: {
      authorPersonId: string | null;
      input: ProjectUpdateInput;
    }) => projectUpdatesRepository.submit({ projectId, authorPersonId, input }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.projects.updates(projectId) });
      void qc.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
      void qc.invalidateQueries({ queryKey: ["projects"] });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}
