import { formatLocalTimestamp } from "../layout-segments";

export type CreateStaffAppointmentService = {
  serviceId: string;
  serviceVariantId: string;
  staffId?: string;
};

export type CreateStaffAppointmentInput = {
  start: Date;
  staffId: string;
  companyId: string;
  locationId?: string;
  services: CreateStaffAppointmentService[];
  price?: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  notes?: string;
  staffNotes?: string;
  imageData?: string | null;
};

export type CreateStaffAppointmentBody = {
  start: string;
  staffId: string;
  companyId: string;
  locationId?: string;
  services: CreateStaffAppointmentService[];
  price?: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  notes?: string;
  staff_notes?: string;
  imageData?: string | null;
};

/** Person fields only — the edge function finds/creates the client. Never send clientId. */
export function buildCreateStaffAppointmentBody(
  input: CreateStaffAppointmentInput,
): CreateStaffAppointmentBody {
  const body: CreateStaffAppointmentBody = {
    start: formatLocalTimestamp(input.start),
    staffId: input.staffId,
    companyId: input.companyId,
    services: input.services.map((service) => ({
      serviceId: service.serviceId,
      serviceVariantId: service.serviceVariantId,
      ...(service.staffId ? { staffId: service.staffId } : {}),
    })),
    email: input.email?.trim() ?? "",
  };

  if (input.locationId) body.locationId = input.locationId;
  if (input.price != null) body.price = input.price;
  if (input.firstName?.trim()) body.firstName = input.firstName.trim();
  if (input.lastName?.trim()) body.lastName = input.lastName.trim();
  if (input.notes) body.notes = input.notes;
  if (input.staffNotes) body.staff_notes = input.staffNotes;
  if (input.imageData) body.imageData = input.imageData;

  return body;
}
