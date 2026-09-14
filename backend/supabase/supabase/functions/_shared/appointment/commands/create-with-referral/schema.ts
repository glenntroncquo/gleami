import { z } from "zod";
import { bookingSegmentSchema } from "../../booking-segment.ts";
import { optionalLocationIdFields, pickLocationId } from "../../../location/schema.ts";

export const createAppointmentSchema = z
  .object({
    start: z.string().min(1, "start is required"),
    staffId: z.string().uuid("Invalid staffId format"),
    companyId: z.string().uuid("Invalid companyId format"),
    services: z.array(bookingSegmentSchema).min(1, "At least one service is required"),
    price: z.number().optional(),
    firstName: z.string().min(1, "firstName is required"),
    lastName: z.string().min(1, "lastName is required"),
    email: z.string().email("Invalid email format"),
    phone: z.string().optional(),
    notes: z.string().optional(),
    imageData: z.string().nullable().optional(),
    referralCode: z.string().optional(),
    referral_code: z.string().optional(),
    ...optionalLocationIdFields,
  })
  .transform(({ referralCode, referral_code, location_id, locationId, ...rest }) => ({
    ...rest,
    referralCode: referralCode ?? referral_code,
    locationId: pickLocationId({ location_id, locationId }),
  }));

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
