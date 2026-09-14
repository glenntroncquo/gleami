import { supabase } from "../../supabase";
import dotenv from "dotenv";

dotenv.config();

export async function addAvailability(details: {
  staff_id: string;
  company_id: string;
  start: string;
  end: string;
  recurring?: boolean;
  day_of_week?: number;
}) {
  const availabilityData = {
    recurring: false,
    ...details
  };
  const { data, error } = await supabase.from("availability").insert(availabilityData).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export interface AvailabilitySlot {
  staff_id: string;
  first_name: string;
  last_name: string;
  image_path: string | null;
  start_time: string;
  end_time: string;
  available_start: string;
  available_end: string;
}

export interface StaffInfo {
  first_name: string;
  last_name: string;
  image_path: string | null;
  slots: AvailabilitySlot[];
}

export interface DateSlots {
  dayName: string;
  staff: Record<string, StaffInfo>;
}

export interface AvailabilitiesResponse {
  dates: Record<string, DateSlots>;
}

export async function getAvailabilitiesByInterval(details: {
  companyId: string;
  treatments: Array<{ treatmentId: string; priceOptionId: string }>;
  startDate: string;
  endDate: string;
}): Promise<AvailabilitiesResponse> {
  const response = await fetch(`${process.env.SUPABASE_URL}/functions/v1/get-availabilities-by-interval`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify(details),
  });

  if (!response.ok) {
    const errorData = await response.json() as { error: string };
    throw new Error(`Get availabilities failed: ${errorData.error}` + details.startDate + details.endDate);
  }

  return await response.json() as AvailabilitiesResponse;
}
