import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys";
import {
  settingsRepository,
  DEFAULT_BACKUP_RETENTION_DAYS,
} from "../repositories/settingsRepository";
import { backupRepository } from "../repositories/backupRepository";
import { pickFolder, pickBackupFile, saveTextFile } from "../fs/pickers";
import { exportRepository, type ExportFormat } from "../repositories/exportRepository";
import { getDbFilePath } from "../db/client";
import { stat } from "@tauri-apps/plugin-fs";

export { DEFAULT_BACKUP_RETENTION_DAYS };

export function useBackupDirectory() {
  return useQuery({
    queryKey: queryKeys.settings.backupDirectory,
    queryFn: () => settingsRepository.getBackupDirectory(),
  });
}

export function useBackupRetentionDays() {
  return useQuery({
    queryKey: queryKeys.settings.backupRetention,
    queryFn: () => settingsRepository.getBackupRetentionDays(),
  });
}

export function useLastBackupAt() {
  return useQuery({
    queryKey: queryKeys.settings.lastBackupAt,
    queryFn: () => settingsRepository.getLastBackupAt(),
  });
}

export function useDatabaseInfo() {
  return useQuery({
    queryKey: queryKeys.settings.databaseInfo,
    queryFn: async () => {
      const path = await getDbFilePath();
      const info = await stat(path);
      return { path, sizeBytes: info.size };
    },
  });
}

export function useBackupsList(directory: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.settings.backups(directory ?? ""),
    queryFn: () => backupRepository.listBackups(directory as string),
    enabled: Boolean(directory),
  });
}

export function useChooseBackupDirectory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const dir = await pickFolder("Choose a backup directory");
      if (dir) await settingsRepository.setBackupDirectory(dir);
      return dir;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.settings.backupDirectory }),
  });
}

export function useSetBackupRetentionDays() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (days: number) => settingsRepository.setBackupRetentionDays(days),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.settings.backupRetention }),
  });
}

export function useCreateBackup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (directory: string) => {
      const result = await backupRepository.createBackup(directory);
      const retention = await settingsRepository.getBackupRetentionDays();
      await backupRepository.pruneOldBackups(directory, retention);
      return result;
    },
    onSuccess: (_result, directory) => {
      void qc.invalidateQueries({ queryKey: queryKeys.settings.lastBackupAt });
      void qc.invalidateQueries({ queryKey: queryKeys.settings.backups(directory) });
    },
  });
}

export function useRestoreBackup() {
  return useMutation({
    mutationFn: async () => {
      const path = await pickBackupFile();
      if (!path) return null;
      return backupRepository.restoreBackup(path);
    },
  });
}

export function useExportEntity() {
  return useMutation({
    mutationFn: async ({
      entity,
      format,
    }: {
      entity: "projects" | "people" | "publications" | "grants" | "meetings" | "workspace";
      format: ExportFormat;
    }) => {
      let content: string;
      let extension: string;
      switch (entity) {
        case "projects":
          content = await exportRepository.exportProjects(format as "json" | "csv");
          extension = format;
          break;
        case "people":
          content = await exportRepository.exportPeople(format as "json" | "csv");
          extension = format;
          break;
        case "publications":
          content = await exportRepository.exportPublications(format as "json" | "csv");
          extension = format;
          break;
        case "grants":
          content = await exportRepository.exportGrants(format as "json" | "csv");
          extension = format;
          break;
        case "meetings":
          content = await exportRepository.exportMeetings(format as "json" | "markdown");
          extension = format === "markdown" ? "md" : "json";
          break;
        case "workspace":
        default:
          content = await exportRepository.exportWorkspace();
          extension = "json";
          break;
      }
      const defaultName = `${entity}-export-${new Date().toISOString().slice(0, 10)}.${extension}`;
      return saveTextFile(content, { defaultName, extension });
    },
  });
}
