import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Idea, IdeaUpdatePatch, ProjectInsert } from "@pi-os/types";
import type { IdeaInput } from "@pi-os/domain";
import { queryKeys } from "./queryKeys";
import { ideaRepository } from "../repositories/ideaRepository";
import { projectRepository } from "../repositories/projectRepository";

export function useIdeas(state?: Idea["state"]) {
  return useQuery({
    queryKey: queryKeys.ideas.list(state),
    queryFn: () => ideaRepository.list(state ? { state } : {}),
  });
}

export function useIdea(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.ideas.detail(id ?? ""),
    queryFn: () => ideaRepository.get(id as string),
    enabled: Boolean(id),
  });
}

function invalidateIdeas(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ["ideas"] });
}

export function useCreateIdea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: IdeaInput) => ideaRepository.create(input),
    onSuccess: () => invalidateIdeas(qc),
  });
}

export function useUpdateIdea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: IdeaUpdatePatch }) =>
      ideaRepository.update(id, patch),
    onSuccess: () => invalidateIdeas(qc),
  });
}

export function useArchiveIdea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ideaRepository.update(id, { state: "archived" }),
    onSuccess: () => invalidateIdeas(qc),
  });
}

/** Converts an idea into a real project (SPEC_followup section 14) — a minimal project seeded from the idea's title/tags/link. */
export function useConvertIdeaToProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      idea,
      projectInput,
    }: {
      idea: Pick<Idea, "id" | "title">;
      projectInput?: Partial<ProjectInsert>;
    }) => {
      const project = await projectRepository.create({ title: idea.title, ...projectInput });
      await ideaRepository.markConverted(idea.id, project.id);
      return project;
    },
    onSuccess: () => {
      invalidateIdeas(qc);
      void qc.invalidateQueries({ queryKey: ["projects"] });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}
