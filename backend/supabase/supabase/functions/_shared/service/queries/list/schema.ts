import { z } from "zod";
import { optionalLocationIdFields, pickLocationId } from "../../../location/schema.ts";

export const listServicesQuerySchema = z
  .object({
    company_id: z.string().uuid("Invalid company_id format"),
    staff_ids: z.array(z.string().uuid("Invalid staff_id format")).optional(),
    staff_slugs: z.array(z.string()).optional(),
    ...optionalLocationIdFields,
  })
  .transform((data) => ({
    companyId: data.company_id,
    staffIds: data.staff_ids,
    staffSlugs: data.staff_slugs,
    locationId: pickLocationId(data),
  }));

export type ListServicesQueryInput = z.infer<typeof listServicesQuerySchema>;
