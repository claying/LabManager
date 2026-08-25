import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import { settingsRepository } from "@pi-os/repositories";

async function ensurePermission(): Promise<boolean> {
  let granted = await isPermissionGranted();
  if (!granted) {
    const result = await requestPermission();
    granted = result === "granted";
  }
  return granted;
}

export interface DeadlineDigestInput {
  overdueMilestoneCount: number;
  dueSoonMilestoneCount: number;
}

/**
 * Sends at most one digest notification per day summarizing overdue and
 * soon-due milestones — never a notification per item, and never more than
 * once daily, so this stays useful instead of noisy by default. Entirely
 * local: no server, tracked via the `settings` table in SQLite.
 */
export async function maybeSendDeadlineDigest(input: DeadlineDigestInput): Promise<void> {
  if (input.overdueMilestoneCount === 0 && input.dueSoonMilestoneCount === 0) return;

  const today = new Date().toISOString().slice(0, 10);
  const lastNotified = await settingsRepository.getLastNotificationDigestDate();
  if (lastNotified === today) return;

  const granted = await ensurePermission();
  if (!granted) return;

  const parts: string[] = [];
  if (input.overdueMilestoneCount > 0) {
    parts.push(
      `${input.overdueMilestoneCount} overdue milestone${input.overdueMilestoneCount === 1 ? "" : "s"}`,
    );
  }
  if (input.dueSoonMilestoneCount > 0) {
    parts.push(`${input.dueSoonMilestoneCount} due soon`);
  }

  sendNotification({ title: "Research OS", body: parts.join(" · ") });
  await settingsRepository.setLastNotificationDigestDate(today);
}
