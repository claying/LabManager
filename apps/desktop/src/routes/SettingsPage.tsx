import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { confirm } from "@tauri-apps/plugin-dialog";
import { Monitor, Moon, Sun } from "lucide-react";
import { useActiveWorkspace as useActiveWorkspaceCtx } from "../lib/workspace-context";
import {
  useUpdateWorkspace,
  useBackupDirectory,
  useBackupRetentionDays,
  useLastBackupAt,
  useDatabaseInfo,
  useChooseBackupDirectory,
  useSetBackupRetentionDays,
  useCreateBackup,
  useRestoreBackup,
  useResetWorkspace,
  useExportEntity,
  DEFAULT_BACKUP_RETENTION_DAYS,
} from "@pi-os/repositories";
import { Button } from "@pi-os/ui/components/button";
import { Input } from "@pi-os/ui/components/input";
import { Label } from "@pi-os/ui/components/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@pi-os/ui/components/card";
import { Separator } from "@pi-os/ui/components/separator";
import { toast } from "@pi-os/ui/components/sonner";
import { PageHeader } from "@pi-os/ui/components/domain/page-header";
import { TopBar } from "../components/app-shell/topbar";
import { checkForUpdate, installUpdate } from "../lib/native/updater";
import type { Update } from "@tauri-apps/plugin-updater";

const APP_VERSION = "0.1.0";

type UpdateState = "idle" | "checking" | "up_to_date" | "available" | "installing" | "error";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString();
}

export default function SettingsPage() {
  const { workspace } = useActiveWorkspaceCtx();
  const updateWorkspace = useUpdateWorkspace();

  const [name, setName] = useState("");
  const [piName, setPiName] = useState("");
  const [institution, setInstitution] = useState("");

  useEffect(() => {
    if (workspace) {
      setName(workspace.name);
      setPiName(workspace.pi_name);
      setInstitution(workspace.institution ?? "");
    }
  }, [workspace]);

  async function saveWorkspaceDetails() {
    try {
      await updateWorkspace.mutateAsync({
        name,
        pi_name: piName,
        institution: institution || null,
      });
      toast.success("Workspace updated");
    } catch (error) {
      toast.error("Couldn't update workspace", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  const { data: dbInfo } = useDatabaseInfo();
  const { data: backupDirectory } = useBackupDirectory();
  const { data: retentionDays } = useBackupRetentionDays();
  const { data: lastBackupAt } = useLastBackupAt();
  const chooseBackupDirectory = useChooseBackupDirectory();
  const setRetentionDays = useSetBackupRetentionDays();
  const createBackup = useCreateBackup();
  const restoreBackup = useRestoreBackup();
  const resetWorkspace = useResetWorkspace();
  const exportEntity = useExportEntity();

  async function onBackupNow() {
    if (!backupDirectory) {
      toast.error("Choose a backup directory first");
      return;
    }
    try {
      await createBackup.mutateAsync(backupDirectory);
      toast.success("Backup created");
    } catch (error) {
      toast.error("Backup failed", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  async function onRestoreBackup() {
    const proceed = await confirm(
      "Restoring will replace all current data in this workspace with the contents of the selected backup. Your current workspace will be backed up first, so this can be undone. Continue?",
      { title: "Restore backup", kind: "warning" },
    );
    if (!proceed) return;
    try {
      const result = await restoreBackup.mutateAsync();
      if (!result) return;
      toast.success("Backup restored — reloading…");
      setTimeout(() => window.location.reload(), 800);
    } catch (error) {
      toast.error("Restore failed", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  async function onResetWorkspace() {
    const warning = backupDirectory
      ? "This permanently deletes every project, person, meeting, publication, and grant in this workspace. A backup will be created first in your configured backup directory, so it can be recovered from there if needed. The app will then return to first-time setup. Continue?"
      : "This permanently deletes every project, person, meeting, publication, and grant in this workspace. No backup directory is configured, so this CANNOT be undone. The app will then return to first-time setup. Continue?";
    const proceed = await confirm(warning, { title: "Reset workspace", kind: "warning" });
    if (!proceed) return;

    const confirmAgain = await confirm("Are you absolutely sure? All data will be gone.", {
      title: "Reset workspace",
      kind: "warning",
    });
    if (!confirmAgain) return;

    try {
      const result = await resetWorkspace.mutateAsync();
      toast.success(
        result.preResetBackupPath ? "Workspace reset — backup saved" : "Workspace reset",
        { description: result.preResetBackupPath ?? undefined },
      );
      setTimeout(() => window.location.reload(), 800);
    } catch (error) {
      toast.error("Reset failed", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  async function onExportWorkspace() {
    try {
      const path = await exportEntity.mutateAsync({ entity: "workspace", format: "json" });
      if (path) toast.success("Workspace exported", { description: path });
    } catch (error) {
      toast.error("Export failed", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  const { theme, setTheme } = useTheme();

  const [updateState, setUpdateState] = useState<UpdateState>("idle");
  const [pendingUpdate, setPendingUpdate] = useState<Update | null>(null);

  async function onCheckForUpdates() {
    setUpdateState("checking");
    try {
      const update = await checkForUpdate();
      if (update) {
        setPendingUpdate(update);
        setUpdateState("available");
      } else {
        setUpdateState("up_to_date");
      }
    } catch (error) {
      setUpdateState("error");
      toast.error("Couldn't check for updates", {
        description: error instanceof Error ? error.message : "No internet connection?",
      });
    }
  }

  async function onInstallUpdate() {
    if (!pendingUpdate) return;
    setUpdateState("installing");
    try {
      await installUpdate(pendingUpdate);
      // installUpdate relaunches the app on success — nothing left to do here.
    } catch (error) {
      setUpdateState("available");
      toast.error("Couldn't install update", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  return (
    <>
      <TopBar>
        <PageHeader title="Settings" className="py-0" />
      </TopBar>
      <main className="max-w-3xl flex-1 space-y-6 overflow-y-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Workspace</CardTitle>
            <CardDescription>Your lab's name and identity.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Workspace name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>PI name</Label>
              <Input value={piName} onChange={(e) => setPiName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Institution</Label>
              <Input value={institution} onChange={(e) => setInstitution(e.target.value)} />
            </div>
            <Button onClick={saveWorkspaceDetails} disabled={updateWorkspace.isPending}>
              Save changes
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data</CardTitle>
            <CardDescription>
              Everything is stored locally in a single SQLite database on this computer.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <span className="text-muted-foreground">Database location</span>
              <span className="truncate text-right font-mono text-xs">{dbInfo?.path ?? "…"}</span>
              <span className="text-muted-foreground">Database size</span>
              <span className="text-right">{dbInfo ? formatBytes(dbInfo.sizeBytes) : "…"}</span>
              <span className="text-muted-foreground">Last backup</span>
              <span className="text-right">{formatDateTime(lastBackupAt)}</span>
            </div>

            <Separator />

            <div className="space-y-1.5">
              <Label>Backup directory</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={backupDirectory ?? ""}
                  placeholder="No directory chosen"
                  readOnly
                  className="flex-1"
                />
                <Button variant="outline" onClick={() => chooseBackupDirectory.mutate()}>
                  Choose…
                </Button>
              </div>
              <p className="text-muted-foreground text-xs">
                Can be a local folder, or a folder synced by iCloud Drive, OneDrive, Dropbox, or a
                network drive.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Keep how many daily backups</Label>
              <Input
                type="number"
                min={1}
                max={365}
                value={retentionDays ?? DEFAULT_BACKUP_RETENTION_DAYS}
                onChange={(e) =>
                  setRetentionDays.mutate(Number(e.target.value) || DEFAULT_BACKUP_RETENTION_DAYS)
                }
                className="w-24"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={onBackupNow} disabled={createBackup.isPending || !backupDirectory}>
                {createBackup.isPending ? "Backing up…" : "Backup Now"}
              </Button>
              <Button
                variant="outline"
                onClick={onRestoreBackup}
                disabled={restoreBackup.isPending}
              >
                {restoreBackup.isPending ? "Restoring…" : "Restore Backup…"}
              </Button>
              <Button
                variant="outline"
                onClick={onExportWorkspace}
                disabled={exportEntity.isPending}
              >
                Export Workspace (JSON)
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button
                variant={theme === "light" ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme("light")}
              >
                <Sun className="h-3.5 w-3.5" /> Light
              </Button>
              <Button
                variant={theme === "dark" ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme("dark")}
              >
                <Moon className="h-3.5 w-3.5" /> Dark
              </Button>
              <Button
                variant={theme === "system" ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme("system")}
              >
                <Monitor className="h-3.5 w-3.5" /> System
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Application</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-muted-foreground text-sm">PI Research OS — version {APP_VERSION}</p>
            <div className="flex items-center gap-2">
              {updateState === "available" && pendingUpdate ? (
                <Button size="sm" onClick={onInstallUpdate} disabled={updateState !== "available"}>
                  Install {pendingUpdate.version} & Restart
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onCheckForUpdates}
                  disabled={updateState === "checking" || updateState === "installing"}
                >
                  {updateState === "checking"
                    ? "Checking…"
                    : updateState === "installing"
                      ? "Installing…"
                      : "Check for Updates"}
                </Button>
              )}
              {updateState === "up_to_date" && (
                <span className="text-muted-foreground text-xs">You're up to date.</span>
              )}
              {updateState === "error" && (
                <span className="text-muted-foreground text-xs">
                  Couldn't reach the update server.
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle>Danger Zone</CardTitle>
            <CardDescription>
              Permanently erase this workspace and start over from setup.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              onClick={onResetWorkspace}
              disabled={resetWorkspace.isPending}
            >
              {resetWorkspace.isPending ? "Resetting…" : "Reset Workspace…"}
            </Button>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
