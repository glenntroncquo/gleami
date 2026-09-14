import { describe, expect, it } from "vitest";
import {
  formatInSalonZone,
  zonedWallTimeToUtc,
} from "../../supabase/functions/_shared/time/salon-timezone.ts";
import {
  calculateAvailableSlots,
  type PhaseRecipeStep,
} from "../../supabase/functions/_shared/appointment/queries/availability/calculate-slots.ts";

const anapaula = "c9599318-ee8d-4349-a121-9bdd0f07c950";

describe("zonedWallTimeToUtc (Europe/Brussels, explicit CET/CEST)", () => {
  it("maps September 09:00 Brussels to 07:00Z (CEST +2)", () => {
    expect(zonedWallTimeToUtc("2026-09-05", "09:00:00").toISOString()).toBe(
      "2026-09-05T07:00:00.000Z",
    );
  });

  it("maps January 09:00 Brussels to 08:00Z (CET +1)", () => {
    expect(zonedWallTimeToUtc("2026-01-10", "09:00:00").toISOString()).toBe(
      "2026-01-10T08:00:00.000Z",
    );
  });
});

describe("formatInSalonZone (Europe/Brussels, explicit CET/CEST)", () => {
  it("renders 07:00Z on 5 Sep as 09:00 Saturday", () => {
    const instant = new Date("2026-09-05T07:00:00.000Z");
    expect(formatInSalonZone(instant, "yyyy-MM-dd")).toBe("2026-09-05");
    expect(formatInSalonZone(instant, "HH:mm")).toBe("09:00");
    expect(formatInSalonZone(instant, "EEEE")).toBe("Saturday");
  });
});

describe("availability slot instants vs Brussels working hours", () => {
  it("offers 07:00Z and not 09:00Z for a 30/30/30 recipe on Saturday 09:00–12:00 Brussels", () => {
    const working = [
      {
        staffId: anapaula,
        start: zonedWallTimeToUtc("2026-09-05", "09:00:00"),
        end: zonedWallTimeToUtc("2026-09-05", "12:00:00"),
      },
    ];
    const recipe: PhaseRecipeStep[] = [
      { staffId: anapaula, phaseType: "busy", durationMinutes: 30 },
      { staffId: anapaula, phaseType: "free", durationMinutes: 30 },
      { staffId: anapaula, phaseType: "busy", durationMinutes: 30 },
    ];
    const slots = calculateAvailableSlots(
      working,
      [],
      recipe,
      60,
      new Date("2026-09-05T00:00:00.000Z"),
      new Date("2026-09-05T23:59:59.000Z"),
      new Date("2026-09-01T00:00:00.000Z"),
    );
    const starts = slots.map((slot) => slot.availableStart);
    expect(starts).toContain("2026-09-05T07:00:00.000Z");
    expect(starts).not.toContain("2026-09-05T09:00:00.000Z");
  });
});
