import { getDb } from "../db/client";

const KEYS = {
  backupDirectory: "backup_directory",
  backupRetentionDays: "backup_retention_days",
  lastBackupAt: "last_backup_at",
  lastNotificationDigestDate: "last_notification_digest_date",
} as const;

export const DEFAULT_BACKUP_RETENTION_DAYS = 14;

export interface SettingsRepository {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
  getBackupDirectory(): Promise<string | null>;
  setBackupDirectory(path: string): Promise<void>;
  getBackupRetentionDays(): Promise<number>;
  setBackupRetentionDays(days: number): Promise<void>;
  getLastBackupAt(): Promise<string | null>;
  setLastBackupAt(iso: string): Promise<void>;
  getLastNotificationDigestDate(): Promise<string | null>;
  setLastNotificationDigestDate(dateOnly: string): Promise<void>;
}

export const settingsRepository: SettingsRepository = {
  async get(key) {
    const db = await getDb();
    const rows = await db.select<{ value: string }[]>("select value from settings where key = ?", [
      key,
    ]);
    return rows[0]?.value ?? null;
  },

  async set(key, value) {
    const db = await getDb();
    await db.execute(
      "insert into settings (key, value) values (?, ?) on conflict(key) do update set value = excluded.value",
      [key, value],
    );
  },

  async remove(key) {
    const db = await getDb();
    await db.execute("delete from settings where key = ?", [key]);
  },

  async getBackupDirectory() {
    return settingsRepository.get(KEYS.backupDirectory);
  },
  async setBackupDirectory(path) {
    await settingsRepository.set(KEYS.backupDirectory, path);
  },

  async getBackupRetentionDays() {
    const raw = await settingsRepository.get(KEYS.backupRetentionDays);
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_BACKUP_RETENTION_DAYS;
  },
  async setBackupRetentionDays(days) {
    await settingsRepository.set(KEYS.backupRetentionDays, String(days));
  },

  async getLastBackupAt() {
    return settingsRepository.get(KEYS.lastBackupAt);
  },
  async setLastBackupAt(iso) {
    await settingsRepository.set(KEYS.lastBackupAt, iso);
  },

  async getLastNotificationDigestDate() {
    return settingsRepository.get(KEYS.lastNotificationDigestDate);
  },
  async setLastNotificationDigestDate(dateOnly) {
    await settingsRepository.set(KEYS.lastNotificationDigestDate, dateOnly);
  },
};
