import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ProjectInsert,
  ProjectMemberRole,
  ProjectStage,
  ProjectUpdatePatch,
} from "@pi-os/types";
import { queryKeys } from "./queryKeys";
import { projectRepository } from "../repositories/projectRepository";

export function useProjects(includeArchived = false) {
  return useQuery({
    queryKey: queryKeys.projects.list(includeArchived),
    queryFn: () => projectRepository.list({ includeArchived }),
  });
}

export function useProject(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.projects.detail(projectId ?? ""),
    queryFn: () => projectRepository.get(projectId as string),
    enabled: Boolean(projectId),
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ProjectInsert) => projectRepository.create(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["projects"] });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, patch }: { projectId: string; patch: ProjectUpdatePatch }) =>
      projectRepository.update(projectId, patch),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: queryKeys.projects.detail(data.id) });
      void qc.invalidateQueries({ queryKey: ["projects"] });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

/** Optimistic stage update for the pipeline board's drag-and-drop. */
export function useUpdateProjectStage(includeArchived = false) {
  const qc = useQueryClient();
  const listKey = queryKeys.projects.list(includeArchived);

  return useMutation({
    mutationFn: ({ projectId, stage }: { projectId: string; stage: ProjectStage }) =>
      projectRepository.updateStage(projectId, stage),
    onMutate: async ({ projectId, stage }) => {
      await qc.cancelQueries({ queryKey: listKey });
      const previous = qc.getQueryData(listKey);
      qc.setQueryData(
        listKey,
        (old: Awaited<ReturnType<typeof projectRepository.list>> | undefined) =>
          old?.map((p) => (p.id === projectId ? { ...p, stage } : p)),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(listKey, context.previous);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: listKey });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

export function useArchiveProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) => projectRepository.archive(projectId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["projects"] });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

export function useAddProjectMember(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ personId, role }: { personId: string; role: ProjectMemberRole }) =>
      projectRepository.addMember(projectId, personId, role),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) }),
  });
}

export function useRemoveProjectMember(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (projectMemberId: string) => projectRepository.removeMember(projectMemberId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) }),
  });
}
