import { describe, expect, it } from "vitest";
import {
  placeToEmailAddress,
  resolveNotificationPlace,
} from "../../supabase/functions/_shared/appointment/notifications/place.ts";
import { SALON_TIMEZONE } from "../../supabase/functions/_shared/time/salon-timezone.ts";

const company = {
  street: "Kerkstraat 1",
  city: "Gent",
  postal_code: "9000",
  country: "BE",
  email: "salon@example.com",
};

describe("resolveNotificationPlace", () => {
  it("uses company address and email when location is missing", () => {
    const place = resolveNotificationPlace(company, null);
    expect(place).toEqual({
      street: "Kerkstraat 1",
      city: "Gent",
      postalCode: "9000",
      country: "BE",
      email: "salon@example.com",
      timezone: SALON_TIMEZONE,
    });
  });

  it("prefers location address, email, and timezone when set", () => {
    const place = resolveNotificationPlace(company, {
      street: "Nieuwstraat 10",
      city: "Antwerpen",
      postal_code: "2000",
      country: "BE",
      email: "antwerpen@example.com",
      timezone: "Europe/Amsterdam",
    });
    expect(place.street).toBe("Nieuwstraat 10");
    expect(place.city).toBe("Antwerpen");
    expect(place.postalCode).toBe("2000");
    expect(place.email).toBe("antwerpen@example.com");
    expect(place.timezone).toBe("Europe/Amsterdam");
  });

  it("falls back per-field when a location value is blank", () => {
    const place = resolveNotificationPlace(company, {
      street: "Nieuwstraat 10",
      city: "  ",
      postal_code: null,
      country: "",
      email: null,
      timezone: "",
    });
    expect(place.street).toBe("Nieuwstraat 10");
    expect(place.city).toBe("Gent");
    expect(place.postalCode).toBe("9000");
    expect(place.country).toBe("BE");
    expect(place.email).toBe("salon@example.com");
    expect(place.timezone).toBe(SALON_TIMEZONE);
  });

  it("maps place fields onto existing email template keys", () => {
    const place = resolveNotificationPlace(company, {
      street: "Nieuwstraat 10",
      city: "Antwerpen",
      postal_code: "2000",
      country: "BE",
    });
    expect(placeToEmailAddress(place)).toEqual({
      companyStreet: "Nieuwstraat 10",
      companyCity: "Antwerpen",
      companyPostalCode: "2000",
      companyCountry: "BE",
    });
  });
});
