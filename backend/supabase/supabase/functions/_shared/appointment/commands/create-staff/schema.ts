import { z } from "zod";
import { bookingSegmentSchema } from "../../booking-segment.ts";
import { optionalLocationIdFields, pickLocationId } from "../../../location/schema.ts";

export const createStaffAppointmentSchema = z
  .object({
    start: z.string().min(1, "start is required"),
    staffId: z.string().uuid("Invalid staffId format"),
    companyId: z.string().uuid("Invalid companyId format"),
    services: z.array(bookingSegmentSchema).min(1, "At least one service is required"),
    price: z.number().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z
      .union([z.string().email("Invalid email format"), z.literal("")])
      .optional()
      .transform((val) => (val ? val : undefined)),
    phone: z.string().optional(),
    notes: z.string().optional(),
    staff_notes: z.string().optional(),
    imageData: z.string().nullable().optional(),
    ...optionalLocationIdFields,
  })
  .transform(({ location_id, locationId, ...rest }) => ({
    ...rest,
    locationId: pickLocationId({ location_id, locationId }),
  }));

export type CreateStaffAppointmentInput = z.infer<typeof createStaffAppointmentSchema>;
