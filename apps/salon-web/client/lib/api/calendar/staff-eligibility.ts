export type EligibilityStaff = {
  id: string;
};

export type StaffServiceLink = {
  staff_id: string;
  service_id: string;
};

export type StaffServiceVariantLink = {
  staff_id: string;
  service_variant_id: string;
};

/**
 * Staff who can perform a catalog selection.
 * Variant assignments win when present; otherwise service assignments.
 * With no catalog selection (or no assignments), every staff member is eligible
 * so the visit-level Personeel field can stay visible before a service is picked.
 */
export function eligibleStaffFor<T extends EligibilityStaff>(
  staffList: T[],
  serviceId: string,
  variantId: string,
  serviceLinks: StaffServiceLink[],
  variantLinks: StaffServiceVariantLink[],
): T[] {
  const variantStaff = variantLinks
    .filter((link) => link.service_variant_id === variantId)
    .map((link) => link.staff_id);
  if (variantId && variantStaff.length > 0) {
    return staffList.filter((staff) => variantStaff.includes(staff.id));
  }

  const serviceStaff = serviceLinks
    .filter((link) => link.service_id === serviceId)
    .map((link) => link.staff_id);
  if (serviceId && serviceStaff.length > 0) {
    return staffList.filter((staff) => serviceStaff.includes(staff.id));
  }

  return staffList;
}

/**
 * Keep the visit staff when they can still perform the catalog selection.
 * Otherwise return empty so the picker stays visible without blocking the service.
 */
export function staffIdIfEligible<T extends EligibilityStaff>(
  staffId: string,
  eligible: T[],
): string {
  if (!staffId) return "";
  return eligible.some((staff) => staff.id === staffId) ? staffId : "";
}

/**
 * Radix Select needs the current value in its item list. If visit staff is
 * still selected (for example an existing appointment) but not in the filtered
 * eligible set, keep them in the options without hiding the field.
 */
export function staffOptionsForSelect<T extends EligibilityStaff>(
  eligible: T[],
  staffList: T[],
  selectedStaffId: string,
): T[] {
  if (!selectedStaffId) return eligible;
  if (eligible.some((staff) => staff.id === selectedStaffId)) return eligible;
  const selected = staffList.find((staff) => staff.id === selectedStaffId);
  return selected ? [selected, ...eligible] : eligible;
}
