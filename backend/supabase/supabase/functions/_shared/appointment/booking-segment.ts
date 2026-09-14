import { z } from "zod";

/** One booked service. serviceId + serviceVariantId only — no treatment aliases. */
export const bookingSegmentSchema = z.object({
  serviceId: z.string().uuid("Invalid serviceId format"),
  serviceVariantId: z.string().uuid("Invalid serviceVariantId format"),
  staffId: z.string().uuid("Invalid staffId format").optional(),
});

export type BookingSegmentInput = z.infer<typeof bookingSegmentSchema>;
