import { z } from "zod";
import { bookingSegmentSchema } from "../../booking-segment.ts";
import { optionalLocationIdFields, pickLocationId } from "../../../location/schema.ts";

export const getAvailabilitySchema = z
  .object({
    companyId: z.string().uuid("Invalid companyId format"),
    services: z.array(bookingSegmentSchema).min(1, "At least one service is required"),
    startDate: z.string().min(1, "startDate is required"),
    endDate: z.string().min(1, "endDate is required"),
    staffIds: z.array(z.string().uuid("Invalid staffId format")).optional(),
    ...optionalLocationIdFields,
  })
  .transform((data) => ({
    companyId: data.companyId,
    services: data.services,
    startDate: data.startDate,
    endDate: data.endDate,
    staffIds: data.staffIds,
    locationId: pickLocationId(data),
  }));

export type GetAvailabilityInput = z.infer<typeof getAvailabilitySchema>;
