import { addMinutes } from "date-fns";
import { resolveBookingLocation } from "../../../location/resolve.ts";
import { serviceRepository } from "../../../service/repository.ts";
import { appointmentRepository } from "../../repository.ts";
import { clientFacingMinutes } from "../../phases.ts";
import { uploadAppointmentImage } from "../../upload-image.ts";
import type { CreateStaffAppointmentInput } from "./schema.ts";

export type CreateStaffAppointmentOutcome =
  | {
      outcome: "success";
      bookingId: string;
      clientId: string;
      imagePath: string | null;
      totalServices: number;
      totalDuration: number;
    }
  | { outcome: "invalid_service_variant"; serviceVariantId: string }
  | { outcome: "invalid_image_data" }
  | { outcome: "image_upload_failed" }
  | { outcome: "booking_failed"; errorKey: string };

export async function createStaffAppointmentHandler(
  input: CreateStaffAppointmentInput,
): Promise<CreateStaffAppointmentOutcome> {
  const location = await resolveBookingLocation(input.companyId, input.locationId);

  const variants = await serviceRepository.findVariantsWithPhasesByIds(
    input.services.map((service) => service.serviceVariantId),
  );
  const variantById = new Map(variants.map((variant) => [variant.id, variant]));

  let totalDurationInMinutes = 0;
  for (const service of input.services) {
    const variant = variantById.get(service.serviceVariantId);
    if (!variant) {
      return { outcome: "invalid_service_variant", serviceVariantId: service.serviceVariantId };
    }
    const phaseDuration =
      variant.phases.length > 0
        ? clientFacingMinutes(variant.phases)
        : variant.clientDurationMinutes;
    totalDurationInMinutes += phaseDuration;
  }

  let imagePath: string | null = null;
  if (input.imageData) {
    const uploaded = await uploadAppointmentImage(input.companyId, input.imageData);
    if (uploaded === "invalid_format") {
      return { outcome: "invalid_image_data" };
    }
    if (uploaded === "upload_failed") {
      return { outcome: "image_upload_failed" };
    }
    imagePath = uploaded;
  }

  const start = input.start;
  const end = addMinutes(new Date(start), totalDurationInMinutes).toISOString();

  const booking = await appointmentRepository.createForStaff({
    companyId: input.companyId,
    staffId: input.staffId,
    email: input.email,
    firstName: input.firstName,
    lastName: input.lastName,
    phone: input.phone,
    segments: input.services.map((service) => ({
      serviceId: service.serviceId,
      serviceVariantId: service.serviceVariantId,
      staffId: service.staffId ?? input.staffId,
    })),
    price: input.price ?? 0,
    notes: input.notes ?? "",
    staffNotes: input.staff_notes ?? null,
    durationInMinutes: totalDurationInMinutes,
    start,
    end,
    imagePath,
    locationId: location.locationId,
  });

  if (!booking.success) {
    return { outcome: "booking_failed", errorKey: booking.error };
  }

  return {
    outcome: "success",
    bookingId: booking.id,
    clientId: booking.clientId,
    imagePath,
    totalServices: input.services.length,
    totalDuration: totalDurationInMinutes,
  };
}
