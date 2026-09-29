import { z } from "zod";

// Wired into company-search since the M7 hardening (2026-09-29). Accepts
// numbers or numeric strings (legacy clients send either), clamps nothing
// silently — out-of-range values are a 400. Radius is capped at 100 km;
// the audit flagged the previously unbounded radius as a scraping /
// resource-consumption vector.
export const getCompaniesListSchema = z.object({
  lat: z.coerce
    .number({ invalid_type_error: "Invalid latitude" })
    .min(-90, "Invalid latitude")
    .max(90, "Invalid latitude"),
  long: z.coerce
    .number({ invalid_type_error: "Invalid longitude" })
    .min(-180, "Invalid longitude")
    .max(180, "Invalid longitude"),
  radius: z.coerce
    .number({ invalid_type_error: "Invalid radius" })
    .int()
    .positive("Invalid radius")
    .max(100_000, "Radius too large")
    .optional()
    .default(5000),
  search_term: z.string().max(120, "Search term too long").nullish(),
});

export type GetCompaniesListInput = z.infer<typeof getCompaniesListSchema>;
