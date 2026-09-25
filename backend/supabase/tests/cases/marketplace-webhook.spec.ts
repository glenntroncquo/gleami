import { describe, expect, it } from "vitest";
import { targetsFromWebhook } from "../../supabase/functions/_shared/marketplace/webhook.ts";
import { webhookSecretMatches, WEBHOOK_SECRET_PLACEHOLDER } from "../../supabase/functions/_shared/marketplace/secret.ts";
import { addCalendarDays, bucketForDates, soonerBucket } from "../../supabase/functions/_shared/marketplace/buckets.ts";

const locationId = "11111111-1111-4111-8111-111111111111";
const serviceId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("webhook targets", () => {
  it("reads location ids and ignores the rest of the payload", () => {
    expect(targetsFromWebhook({
      table: "location",
      record: { id: locationId, is_listed: false, name: "forged" },
    })).toEqual({ kind: "locations", locationIds: [locationId] });

    expect(targetsFromWebhook({
      table: "location",
      type: "DELETE",
      record: null,
      old_record: { id: locationId.toUpperCase() },
    })).toEqual({ kind: "locations", locationIds: [locationId] });

    expect(targetsFromWebhook({
      table: "location_service",
      old_record: { location_id: locationId, service_id: serviceId },
    })).toEqual({ kind: "locations", locationIds: [locationId] });
  });

  it("maps service and category changes to a service id", () => {
    expect(targetsFromWebhook({ table: "service", record: { id: serviceId } }))
      .toEqual({ kind: "service", serviceId });
    expect(targetsFromWebhook({
      table: "service_marketplace_category",
      record: { service_id: serviceId, marketplace_category_id: locationId },
    })).toEqual({ kind: "service", serviceId });
  });

  it("ignores likes and junk", () => {
    expect(targetsFromWebhook({ table: "marketplace_location_like", record: { location_id: locationId } }))
      .toEqual({ kind: "ignore" });
    expect(targetsFromWebhook(null)).toEqual({ kind: "ignore" });
    expect(targetsFromWebhook({ table: "location", record: { id: "nope" } })).toEqual({ kind: "ignore" });
  });
});

describe("webhook secret", () => {
  it("rejects the placeholder, mismatches, and missing bearers", () => {
    expect(webhookSecretMatches("Bearer real-secret", WEBHOOK_SECRET_PLACEHOLDER)).toBe(false);
    expect(webhookSecretMatches("Bearer real-secret", undefined)).toBe(false);
    expect(webhookSecretMatches("Bearer other", "real-secret")).toBe(false);
    expect(webhookSecretMatches(null, "real-secret")).toBe(false);
    expect(webhookSecretMatches("Bearer real-secret", "real-secret")).toBe(true);
  });
});

describe("availability buckets", () => {
  it("classifies salon-local dates inside a 7 day window", () => {
    expect(addCalendarDays("2026-09-24", 6)).toBe("2026-09-30");
    expect(bucketForDates(["2026-09-24"], "2026-09-24")).toBe("today");
    expect(bucketForDates(["2026-09-25"], "2026-09-24")).toBe("tomorrow");
    expect(bucketForDates(["2026-09-30"], "2026-09-24")).toBe("this_week");
    expect(bucketForDates(["2026-10-02"], "2026-09-24")).toBe("none_soon");
    expect(soonerBucket("this_week", "tomorrow")).toBe("tomorrow");
  });
});
