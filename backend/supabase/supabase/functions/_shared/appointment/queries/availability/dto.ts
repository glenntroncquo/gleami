import type { AvailableSlot } from "./calculate-slots.ts";
import type { StaffInfo } from "../../../service/entity.ts";
import { formatInSalonZone } from "../../../time/salon-timezone.ts";

export interface AvailabilitySlotDto {
  staff_id: string;
  first_name: string;
  last_name: string;
  image_path: string | null;
  start_time: string;
  end_time: string;
  available_start: string;
  available_end: string;
}

export interface AvailabilityStaffGroupDto {
  first_name: string;
  last_name: string;
  image_path: string | null;
  slots: AvailabilitySlotDto[];
}

export interface AvailabilityDateGroupDto {
  dayName: string;
  staff: Record<string, AvailabilityStaffGroupDto>;
}

export type AvailabilityResponseDto = Record<string, AvailabilityDateGroupDto>;

export function toAvailabilityResponseDto(
  slots: AvailableSlot[],
  staffInfoById: Record<string, StaffInfo>,
  timeZone?: string,
): AvailabilityResponseDto {
  const slotsByDate: AvailabilityResponseDto = {};

  for (const slot of slots) {
    const startDate = new Date(slot.availableStart);
    const dateKey = formatInSalonZone(startDate, "yyyy-MM-dd", timeZone);
    const dayName = formatInSalonZone(startDate, "EEEE", timeZone);
    const staffId = slot.staffId;
    const staff = staffInfoById[staffId] || { firstName: "", lastName: "", imagePath: null };

    if (!slotsByDate[dateKey]) {
      slotsByDate[dateKey] = { dayName, staff: {} };
    }

    if (!slotsByDate[dateKey].staff[staffId]) {
      slotsByDate[dateKey].staff[staffId] = {
        first_name: staff.firstName || "",
        last_name: staff.lastName || "",
        image_path: staff.imagePath || null,
        slots: [],
      };
    }

    slotsByDate[dateKey].staff[staffId].slots.push({
      staff_id: staffId,
      first_name: staff.firstName || "",
      last_name: staff.lastName || "",
      image_path: staff.imagePath || null,
      start_time: formatInSalonZone(startDate, "HH:mm", timeZone),
      end_time: formatInSalonZone(new Date(slot.availableEnd), "HH:mm", timeZone),
      available_start: slot.availableStart,
      available_end: slot.availableEnd,
    });
  }

  return slotsByDate;
}
