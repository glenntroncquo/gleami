import { describe, expect, it } from "vitest";
import { pickLocationId } from "../../supabase/functions/_shared/location/id.ts";
import { resolvedLocationFrom } from "../../supabase/functions/_shared/location/resolved.ts";
import {
  formatInSalonZone,
  SALON_TIMEZONE,
  zonedWallTimeToUtc,
} from "../../supabase/functions/_shared/time/salon-timezone.ts";

const companyId = "b66720ac-dcb8-4051-b287-f8f8b6291cc0";
const locationId = "8e4ce818-b8ea-4918-b6ba-836ed4074d20";

describe("pickLocationId", () => {
  it("prefers location_id over locationId", () => {
    expect(pickLocationId({ location_id: locationId, locationId: companyId })).toBe(locationId);
  });

  it("accepts locationId camelCase", () => {
    expect(pickLocationId({ locationId })).toBe(locationId);
  });

  it("treats null as omitted", () => {
    expect(pickLocationId({ location_id: null, locationId: null })).toBeUndefined();
  });

  it("treats blank location_id as omitted", () => {
    expect(pickLocationId({ location_id: "  ", locationId: "" })).toBeUndefined();
  });
});

describe("location timezone (non-Brussels via Intl)", () => {
  it("maps 09:00 America/New_York in September to 13:00Z (EDT -4)", () => {
    expect(zonedWallTimeToUtc("2026-09-05", "09:00:00", "America/New_York").toISOString()).toBe(
      "2026-09-05T13:00:00.000Z",
    );
  });

  it("renders 13:00Z as 09:00 in America/New_York", () => {
    const instant = new Date("2026-09-05T13:00:00.000Z");
    expect(formatInSalonZone(instant, "HH:mm", "America/New_York")).toBe("09:00");
    expect(formatInSalonZone(instant, "yyyy-MM-dd", "America/New_York")).toBe("2026-09-05");
  });
});

describe("resolvedLocationFrom (omitted location_id after drop_multi_location_enabled)", () => {
  const primaryId = "8e4ce818-b8ea-4918-b6ba-836ed4074d20";

  it("uses the primary location instead of company.multi_location_enabled", () => {
    expect(
      resolvedLocationFrom({
        id: primaryId,
        timezone: "America/New_York",
        isActive: true,
      }),
    ).toEqual({ locationId: primaryId, timezone: "America/New_York" });
  });

  it("falls back to the salon timezone when the primary has none", () => {
    expect(
      resolvedLocationFrom({
        id: primaryId,
        timezone: null,
        isActive: true,
      }),
    ).toEqual({ locationId: primaryId, timezone: SALON_TIMEZONE });
  });

  it("does not filter by location when no primary exists", () => {
    expect(resolvedLocationFrom(null)).toEqual({
      locationId: null,
      timezone: SALON_TIMEZONE,
    });
  });

  it("does not use an inactive primary for catalog filtering", () => {
    expect(
      resolvedLocationFrom({
        id: primaryId,
        timezone: "Europe/Brussels",
        isActive: false,
      }),
    ).toEqual({ locationId: null, timezone: "Europe/Brussels" });
  });
});
