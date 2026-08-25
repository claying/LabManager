import { describe, expect, it } from "vitest";
import {
  daysBetween,
  daysSince,
  daysUntil,
  formatRelativeDays,
  getWeekRange,
  isOverdue,
  isWithinNextDays,
} from "./date";

describe("daysBetween", () => {
  it("counts whole calendar days between two dates", () => {
    expect(daysBetween(new Date("2026-01-01T08:00:00Z"), new Date("2026-01-11T23:00:00Z"))).toBe(
      10,
    );
  });

  it("is negative when `to` precedes `from`", () => {
    expect(daysBetween(new Date("2026-01-11T00:00:00Z"), new Date("2026-01-01T00:00:00Z"))).toBe(
      -10,
    );
  });

  it("ignores time-of-day, only counting calendar days", () => {
    expect(daysBetween(new Date("2026-01-01T23:59:00Z"), new Date("2026-01-02T00:01:00Z"))).toBe(1);
  });
});

describe("daysSince / daysUntil", () => {
  const now = new Date("2026-06-15T12:00:00Z");

  it("daysSince returns elapsed days for a past date", () => {
    expect(daysSince(new Date("2026-06-01T12:00:00Z"), now)).toBe(14);
  });

  it("daysUntil returns positive for a future date", () => {
    expect(daysUntil(new Date("2026-06-20T12:00:00Z"), now)).toBe(5);
  });

  it("daysUntil returns negative for a past date", () => {
    expect(daysUntil(new Date("2026-06-10T12:00:00Z"), now)).toBe(-5);
  });
});

describe("isWithinNextDays / isOverdue", () => {
  const now = new Date("2026-06-15T00:00:00Z");

  it("treats a past date as overdue, not within the window", () => {
    expect(isOverdue(new Date("2026-06-14T00:00:00Z"), now)).toBe(true);
    expect(isWithinNextDays(new Date("2026-06-14T00:00:00Z"), 7, now)).toBe(false);
  });

  it("treats today as within the window and not overdue", () => {
    expect(isOverdue(now, now)).toBe(false);
    expect(isWithinNextDays(now, 7, now)).toBe(true);
  });

  it("excludes dates beyond the window", () => {
    expect(isWithinNextDays(new Date("2026-06-25T00:00:00Z"), 7, now)).toBe(false);
  });
});

describe("getWeekRange", () => {
  it("returns the Monday-Sunday week for a mid-week date", () => {
    // 2026-08-25 is a Tuesday.
    expect(getWeekRange(new Date("2026-08-25T12:00:00Z"))).toEqual({
      weekStart: "2026-08-24",
      weekEnd: "2026-08-30",
    });
  });

  it("treats Sunday as the last day of its own week, not the start of the next", () => {
    expect(getWeekRange(new Date("2026-08-30T12:00:00Z"))).toEqual({
      weekStart: "2026-08-24",
      weekEnd: "2026-08-30",
    });
  });

  it("treats Monday as the first day of its own week", () => {
    expect(getWeekRange(new Date("2026-08-24T00:00:00Z"))).toEqual({
      weekStart: "2026-08-24",
      weekEnd: "2026-08-30",
    });
  });
});

describe("formatRelativeDays", () => {
  it("labels 0/1/-1 specially and falls back to counts otherwise", () => {
    expect(formatRelativeDays(0)).toBe("today");
    expect(formatRelativeDays(1)).toBe("tomorrow");
    expect(formatRelativeDays(-1)).toBe("yesterday");
    expect(formatRelativeDays(5)).toBe("in 5 days");
    expect(formatRelativeDays(-5)).toBe("5 days ago");
  });
});
