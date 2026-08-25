/** New entity id. SQLite has no native UUID function, so IDs are generated here. */
export function newId(): string {
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}

/** SQLite has no boolean type; 0/1 integers round-trip through these at the repository boundary. */
export function toSqlBool(value: boolean): number {
  return value ? 1 : 0;
}
export function fromSqlBool(value: number | boolean): boolean {
  return value === 1 || value === true;
}

export function toJsonArray(value: string[]): string {
  return JSON.stringify(value ?? []);
}
export function fromJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Builds a `col1 = ?, col2 = ?` SET clause + matching bind values from a partial patch object, skipping undefined keys. */
export function buildSetClause(patch: Record<string, unknown>): {
  clause: string;
  values: unknown[];
} {
  const entries = Object.entries(patch).filter(([, v]) => v !== undefined);
  const clause = entries.map(([key]) => `${key} = ?`).join(", ");
  const values = entries.map(([, v]) => v);
  return { clause, values };
}
