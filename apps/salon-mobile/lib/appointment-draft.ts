import type { ServiceWithVariants } from '@/lib/api/services';

// Shared types/constants for the `app/appointment-new/*` screen family,
// which hand results back to `index.tsx` via `DeviceEventEmitter` (screens
// pushed as native `formSheet` routes stay mounted underneath, same pattern
// the calendar already uses for `calendarRefreshAppointments`). Lives
// outside `app/` so expo-router's file-based routing doesn't pick it up as
// a route of its own.

export type CartItem = {
  serviceId: string;
  serviceVariantId: string;
  serviceName: string;
  color: string | null;
  variantName: string;
  price: number;
  durationMinutes: number;
  staffId: string;
  phases: ServiceWithVariants['service_variant'][number]['service_variant_phase'];
};

export type NewClientDraft = { firstName: string; lastName: string; email: string };

export const APPOINTMENT_DRAFT_EVENTS = {
  selectClient: 'appointmentDraft:selectClient',
  selectNewClient: 'appointmentDraft:selectNewClient',
  selectStaff: 'appointmentDraft:selectStaff',
  addService: 'appointmentDraft:addService',
  setDateTime: 'appointmentDraft:setDateTime',
} as const;
