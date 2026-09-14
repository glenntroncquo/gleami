import { describe, expect, it } from "vitest";
import {
  isInReminderWindow,
  localReminderWindowUtc,
  reminderCandidateFetchWindow,
} from "../../supabase/functions/_shared/appointment/notifications/reminder-window.ts";

describe("reminderCandidateFetchWindow", () => {
  it("covers 20–30 hours ahead in UTC so location TZ filters cannot miss", () => {
    const now = new Date("2026-09-06T10:00:00.000Z");
    const window = reminderCandidateFetchWindow(now);
    expect(window.start.toISOString()).toBe("2026-09-07T06:00:00.000Z");
    expect(window.end.toISOString()).toBe("2026-09-07T16:00:00.000Z");
  });
});

describe("localReminderWindowUtc", () => {
  it("uses 24–25 hours of Europe/Brussels wall time (CEST +2)", () => {
    const now = new Date("2026-09-06T10:00:00.000Z");
    const window = localReminderWindowUtc(now, "Europe/Brussels");
    expect(window.start.toISOString()).toBe("2026-09-07T10:00:00.000Z");
    expect(window.end.toISOString()).toBe("2026-09-07T11:00:00.000Z");
  });

  it("includes the window start and excludes instants before it", () => {
    const now = new Date("2026-09-06T10:00:00.000Z");
    const window = localReminderWindowUtc(now, "Europe/Amsterdam");
    expect(isInReminderWindow(window.start, window.start, window.end)).toBe(true);
    expect(isInReminderWindow(new Date(window.start.getTime() - 1), window.start, window.end)).toBe(
      false,
    );
  });

  it("shifts the UTC window across EU DST spring-forward (location TZ, not raw +24h UTC)", () => {
    // Saturday 12:00 CET; Sunday is EU DST start. Wall +24h = 12:00 CEST = 10:00Z.
    const now = new Date("2026-03-28T11:00:00.000Z");
    const window = localReminderWindowUtc(now, "Europe/Brussels");
    expect(window.start.toISOString()).toBe("2026-03-29T10:00:00.000Z");
    expect(window.end.toISOString()).toBe("2026-03-29T11:00:00.000Z");
  });
});
