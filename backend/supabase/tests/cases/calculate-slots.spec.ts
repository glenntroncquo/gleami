// Slot math (busy / free / buffer). Buffer locks staff; client duration is busy+free.
import { describe, expect, it } from "vitest";
import {
  calculateAvailableSlots,
  clientDurationMinutes,
  recipeFitsAt,
  subtractIntervals,
  type PhaseRecipeStep,
  type TimeWindow,
} from "../../supabase/functions/_shared/appointment/queries/availability/calculate-slots.ts";
import { staffOccupancyMinutes } from "../../supabase/functions/_shared/appointment/phases.ts";

function window(staffId: string, startHour: number, endHour: number): TimeWindow {
  return {
    staffId,
    start: new Date(`2026-08-29T${String(startHour).padStart(2, "0")}:00:00.000Z`),
    end: new Date(`2026-08-29T${String(endHour).padStart(2, "0")}:00:00.000Z`),
  };
}

const staff = "staff-1";
const now = new Date("2026-08-28T00:00:00.000Z");
const rangeStart = new Date("2026-08-29T00:00:00.000Z");
const rangeEnd = new Date("2026-08-29T23:59:59.000Z");

describe("calculateAvailableSlots", () => {
  it("offers hourly slots when the recipe is a single busy phase", () => {
    const recipe: PhaseRecipeStep[] = [{ staffId: staff, phaseType: "busy", durationMinutes: 60 }];
    const slots = calculateAvailableSlots(
      [window(staff, 8, 12)],
      [],
      recipe,
      60,
      rangeStart,
      rangeEnd,
      now,
    );

    expect(slots.map((slot) => slot.availableStart)).toEqual([
      "2026-08-29T08:00:00.000Z",
      "2026-08-29T09:00:00.000Z",
      "2026-08-29T10:00:00.000Z",
      "2026-08-29T11:00:00.000Z",
    ]);
    expect(slots[0]?.availableEnd).toBe("2026-08-29T09:00:00.000Z");
  });

  it("lets a later start occupy another booking's free phase", () => {
    const recipe: PhaseRecipeStep[] = [
      { staffId: staff, phaseType: "busy", durationMinutes: 60 },
      { staffId: staff, phaseType: "free", durationMinutes: 60 },
    ];
    const existingBusy = [window(staff, 8, 9)];
    const slots = calculateAvailableSlots(
      [window(staff, 8, 12)],
      existingBusy,
      recipe,
      60,
      rangeStart,
      rangeEnd,
      now,
    );

    expect(slots.map((slot) => slot.availableStart)).toEqual([
      "2026-08-29T09:00:00.000Z",
      "2026-08-29T10:00:00.000Z",
      "2026-08-29T11:00:00.000Z",
    ]);
    expect(slots[0]?.availableEnd).toBe("2026-08-29T11:00:00.000Z");
  });

  it("blocks a start whose busy phase overlaps an existing busy phase", () => {
    const recipe: PhaseRecipeStep[] = [{ staffId: staff, phaseType: "busy", durationMinutes: 60 }];
    const fits = recipeFitsAt(
      new Date("2026-08-29T08:30:00.000Z"),
      recipe,
      [window(staff, 8, 12)],
      [window(staff, 8, 9)],
    );
    expect(fits).toBe(false);
  });

  it("does not require free phases to sit inside a working window", () => {
    const recipe: PhaseRecipeStep[] = [
      { staffId: staff, phaseType: "busy", durationMinutes: 60 },
      { staffId: staff, phaseType: "free", durationMinutes: 60 },
    ];
    const fits = recipeFitsAt(
      new Date("2026-08-29T11:00:00.000Z"),
      recipe,
      [window(staff, 8, 12)],
      [],
    );
    expect(fits).toBe(true);
  });

  it("lets each recipe step use a different staff member", () => {
    const staffA = "staff-a";
    const staffB = "staff-b";
    const recipe: PhaseRecipeStep[] = [
      { staffId: staffA, phaseType: "busy", durationMinutes: 30 },
      { staffId: staffB, phaseType: "busy", durationMinutes: 30 },
    ];
    const working = [window(staffA, 8, 12), window(staffB, 8, 12)];
    const busyB = [window(staffB, 8, 9)];

    expect(recipeFitsAt(new Date("2026-08-29T08:00:00.000Z"), recipe, working, busyB)).toBe(false);
    expect(recipeFitsAt(new Date("2026-08-29T08:30:00.000Z"), recipe, working, busyB)).toBe(true);
  });

  it("excludes trailing buffer from client-facing slot end and still locks staff", () => {
    const recipe: PhaseRecipeStep[] = [
      { staffId: staff, phaseType: "busy", durationMinutes: 60 },
      { staffId: staff, phaseType: "buffer", durationMinutes: 60 },
    ];
    const slots = calculateAvailableSlots(
      [window(staff, 8, 12)],
      [],
      recipe,
      60,
      rangeStart,
      rangeEnd,
      now,
    );

    expect(slots.map((slot) => slot.availableStart)).toEqual([
      "2026-08-29T08:00:00.000Z",
      "2026-08-29T09:00:00.000Z",
      "2026-08-29T10:00:00.000Z",
    ]);
    expect(slots[0]?.availableEnd).toBe("2026-08-29T09:00:00.000Z");
    expect(
      recipeFitsAt(
        new Date("2026-08-29T11:00:00.000Z"),
        recipe,
        [window(staff, 8, 12)],
        [],
      ),
    ).toBe(false);
  });

  it("blocks a start whose busy phase overlaps an existing buffer", () => {
    const recipe: PhaseRecipeStep[] = [{ staffId: staff, phaseType: "busy", durationMinutes: 60 }];
    const fits = recipeFitsAt(
      new Date("2026-08-29T08:30:00.000Z"),
      recipe,
      [window(staff, 8, 12)],
      [window(staff, 8, 9)],
    );
    expect(fits).toBe(false);
  });
});

describe("phase duration helpers", () => {
  it("counts only busy+free as client-facing and busy+buffer as staff occupancy", () => {
    const recipe: PhaseRecipeStep[] = [
      { staffId: staff, phaseType: "busy", durationMinutes: 60 },
      { staffId: staff, phaseType: "free", durationMinutes: 30 },
      { staffId: staff, phaseType: "buffer", durationMinutes: 15 },
    ];
    expect(clientDurationMinutes(recipe)).toBe(90);
    expect(staffOccupancyMinutes(recipe)).toBe(75);
  });
});

describe("subtractIntervals", () => {
  it("cuts unavailability out of a working window", () => {
    const remaining = subtractIntervals(
      [{ start: new Date("2026-08-29T08:00:00.000Z"), end: new Date("2026-08-29T17:00:00.000Z") }],
      [{ start: new Date("2026-08-29T12:00:00.000Z"), end: new Date("2026-08-29T13:00:00.000Z") }],
    );
    expect(remaining).toHaveLength(2);
    expect(remaining[0]?.end.toISOString()).toBe("2026-08-29T12:00:00.000Z");
    expect(remaining[1]?.start.toISOString()).toBe("2026-08-29T13:00:00.000Z");
  });
});
