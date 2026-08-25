import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { FileIndexCategory } from "@pi-os/types";
import { queryKeys } from "./queryKeys";
import { fileIndexRepository } from "../repositories/fileIndexRepository";
import { pickFolder } from "../fs/pickers";

export function useFileIndexRoots(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.fileIndex.roots(projectId ?? ""),
    queryFn: () => fileIndexRepository.listRoots(projectId as string),
    enabled: Boolean(projectId),
  });
}

export function useFileIndexFiles(
  projectId: string | undefined,
  opts?: { category?: FileIndexCategory; rootId?: string },
) {
  return useQuery({
    queryKey: queryKeys.fileIndex.files(projectId ?? "", opts as Record<string, unknown>),
    queryFn: () => fileIndexRepository.listFiles(projectId as string, opts),
    enabled: Boolean(projectId),
  });
}

export function useFileIndexEntry(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.fileIndex.file(id ?? ""),
    queryFn: () => fileIndexRepository.getFile(id as string),
    enabled: Boolean(id),
  });
}

/** Opens the native folder picker, adds it as an indexed root, and immediately indexes it once. Returns null if the picker was cancelled. */
export function useAddAndIndexFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
      category,
      label,
    }: {
      projectId: string;
      category: FileIndexCategory;
      label?: string;
    }) => {
      const path = await pickFolder("Choose a folder to index");
      if (!path) return null;
      const root = await fileIndexRepository.addRoot(projectId, category, path, label ?? null);
      const result = await fileIndexRepository.reindexRoot(root.id);
      return { root, result };
    },
    onSuccess: (data, vars) => {
      if (!data) return;
      void qc.invalidateQueries({ queryKey: queryKeys.fileIndex.roots(vars.projectId) });
      void qc.invalidateQueries({ queryKey: queryKeys.fileIndex.files(vars.projectId) });
    },
  });
}

export function useReindexFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ rootId }: { rootId: string; projectId: string }) =>
      fileIndexRepository.reindexRoot(rootId),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: queryKeys.fileIndex.roots(vars.projectId) });
      void qc.invalidateQueries({ queryKey: queryKeys.fileIndex.files(vars.projectId) });
    },
  });
}

export function useRemoveIndexedFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ rootId }: { rootId: string; projectId: string }) =>
      fileIndexRepository.removeRoot(rootId),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: queryKeys.fileIndex.roots(vars.projectId) });
      void qc.invalidateQueries({ queryKey: queryKeys.fileIndex.files(vars.projectId) });
    },
  });
}
