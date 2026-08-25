import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * A practical, automatable stand-in for "launch this app with no network and
 * confirm it still works" (SPEC_followup.md section 31): every source file
 * in the app and its persistence layer is scanned for network primitives.
 * If this test passes, nothing in the code path the PI actually uses (data
 * layer, UI) can be making a network call, regardless of whether a real
 * offline E2E run was exercised for this change.
 */
const FORBIDDEN_PATTERNS: RegExp[] = [
  /\bfetch\s*\(/,
  /\bXMLHttpRequest\b/,
  /\bnew\s+WebSocket\s*\(/,
  /\baxios\b/i,
  /\bsupabase\b/i,
  /createClient\s*\(/,
];

const SCAN_ROOTS = [
  join(__dirname, "../../../packages/repositories/src"),
  join(__dirname), // apps/desktop/src
];

function collectSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      out.push(...collectSourceFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.(ts|tsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

describe("offline network isolation", () => {
  it("the desktop app and its persistence layer contain no network primitives", () => {
    const offenders: { file: string; pattern: string }[] = [];

    for (const root of SCAN_ROOTS) {
      for (const file of collectSourceFiles(root)) {
        const content = readFileSync(file, "utf-8");
        for (const pattern of FORBIDDEN_PATTERNS) {
          if (pattern.test(content)) {
            offenders.push({ file, pattern: pattern.source });
          }
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
