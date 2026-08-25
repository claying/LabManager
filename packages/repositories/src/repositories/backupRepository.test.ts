import { describe, expect, it, vi } from "vitest";
import { zipSync, strToU8 } from "fflate";

const files = new Map<string, Uint8Array>();

vi.mock("@tauri-apps/plugin-fs", () => ({
  readFile: vi.fn(async (path: string) => {
    const bytes = files.get(path);
    if (!bytes) throw new Error(`ENOENT: ${path}`);
    return bytes;
  }),
  writeFile: vi.fn(async (path: string, bytes: Uint8Array) => {
    files.set(path, bytes);
  }),
  readDir: vi.fn(async () => []),
  remove: vi.fn(async (path: string) => {
    files.delete(path);
  }),
  mkdir: vi.fn(async () => {}),
  exists: vi.fn(async (path: string) => files.has(path)),
}));

const { backupRepository } = await import("./backupRepository");

function writeZip(path: string, entries: Record<string, Uint8Array>) {
  files.set(path, zipSync(entries, { level: 0 }));
}

describe("backupRepository.validateBackup", () => {
  it("accepts a well-formed backup zip and returns its manifest", async () => {
    writeZip("/backups/good.zip", {
      "manifest.json": strToU8(
        JSON.stringify({
          backup_format_version: 1,
          app_version: "0.1.0",
          created_at: "2026-01-01T00:00:00.000Z",
          workspace_name: "SIM Lab",
          database_schema_version: 3,
        }),
      ),
      "database.sqlite": new Uint8Array([1, 2, 3]),
    });

    const manifest = await backupRepository.validateBackup("/backups/good.zip");
    expect(manifest.workspace_name).toBe("SIM Lab");
  });

  it("rejects a zip missing database.sqlite", async () => {
    writeZip("/backups/no-db.zip", {
      "manifest.json": strToU8(JSON.stringify({ backup_format_version: 1 })),
    });

    await expect(backupRepository.validateBackup("/backups/no-db.zip")).rejects.toThrow(
      /doesn't look like a PI Research OS backup/,
    );
  });

  it("rejects a zip missing manifest.json", async () => {
    writeZip("/backups/no-manifest.zip", {
      "database.sqlite": new Uint8Array([1]),
    });

    await expect(backupRepository.validateBackup("/backups/no-manifest.zip")).rejects.toThrow(
      /doesn't look like a PI Research OS backup/,
    );
  });

  it("rejects a corrupted (non-JSON) manifest", async () => {
    writeZip("/backups/bad-manifest.zip", {
      "manifest.json": strToU8("{not json"),
      "database.sqlite": new Uint8Array([1]),
    });

    await expect(backupRepository.validateBackup("/backups/bad-manifest.zip")).rejects.toThrow(
      /manifest\.json is corrupted/,
    );
  });

  it("rejects a backup from a newer, incompatible format version", async () => {
    writeZip("/backups/future.zip", {
      "manifest.json": strToU8(
        JSON.stringify({
          backup_format_version: 999,
          app_version: "9.0.0",
          created_at: "2026-01-01T00:00:00.000Z",
          workspace_name: "SIM Lab",
          database_schema_version: 3,
        }),
      ),
      "database.sqlite": new Uint8Array([1]),
    });

    await expect(backupRepository.validateBackup("/backups/future.zip")).rejects.toThrow(
      /newer version of the app/,
    );
  });
});
