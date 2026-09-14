import { z } from "zod";

// Not currently wired into the index.ts adapter: validation was disabled
// upstream before this refactor and is being preserved as-is to avoid
// changing live request behavior. Kept here as the intended contract.
export const getCompaniesListSchema = z.object({
  lat: z.string().transform(val => {
    const num = parseFloat(val);
    if (isNaN(num)) throw new Error("Invalid latitude");
    return num;
  }),
  long: z.string().transform(val => {
    const num = parseFloat(val);
    if (isNaN(num)) throw new Error("Invalid longitude");
    return num;
  }),
  radius: z.string().optional().transform(val => val ? parseInt(val) : 5000),
  search_term: z.string().optional(),
});

export type GetCompaniesListInput = z.infer<typeof getCompaniesListSchema>;
