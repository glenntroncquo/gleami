export interface StaffInfo {
  firstName: string | null;
  lastName: string | null;
  imagePath: string | null;
}

export interface ServicePhase {
  sequence: number;
  phaseType: "busy" | "free" | "buffer";
  durationMinutes: number;
  label: string | null;
}

export interface ServiceVariantSummary {
  id: string;
  name: string;
  price: number;
  priceNet: number | null;
  maxPrice: number | null;
  clientDurationMinutes: number;
  staffDurationMinutes: number | null;
  imagePath: string | null;
  displayOrder: number | null;
  phases: ServicePhase[];
}

export interface ServiceListItem {
  id: string;
  companyId: string;
  name: string;
  description: string | null;
  displayOrder: number | null;
  bookingIntervalMinutes: number | null;
  variants: ServiceVariantSummary[];
}

export interface ServiceSummary {
  id: string;
  bookingIntervalMinutes: number;
}

export interface ServiceVariantWithPhases {
  id: string;
  serviceId: string;
  clientDurationMinutes: number;
  staffDurationMinutes: number | null;
  phases: ServicePhase[];
}

export interface ServiceStaffEligibility {
  staffId: string;
  serviceId: string;
  staffInfo: StaffInfo;
}

export interface VariantStaffEligibility {
  staffId: string;
  serviceVariantId: string;
  staffInfo: StaffInfo;
}
