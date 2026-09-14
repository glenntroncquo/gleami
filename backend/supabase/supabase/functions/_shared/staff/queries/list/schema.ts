import { z } from "zod";
import { optionalLocationIdFields, pickLocationId } from "../../../location/schema.ts";

export const listStaffQuerySchema = z
  .object({
    company_id: z.string().uuid("Invalid company_id format"),
    ...optionalLocationIdFields,
  })
  .transform((data) => ({
    companyId: data.company_id,
    locationId: pickLocationId(data),
  }));

export type ListStaffQueryInput = z.infer<typeof listStaffQuerySchema>;
