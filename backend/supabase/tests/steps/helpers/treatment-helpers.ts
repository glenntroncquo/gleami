import { supabase } from "../../supabase";

export async function addTreatment(details: {
  name: string;
  company_id: string;
  description?: string;
  is_active?: boolean;
  interval?:number;
}) {
  const treatmentData = {
    is_active: true,
    interval: details.interval || 60,
    ...details
  };
  const { data, error } = await supabase.from("treatment").insert(treatmentData).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function addPriceOption(details: {
  name: string;
  treatment_id: string;
  company_id: string;
  price: number;
  duration_in_minutes: number;
  actual_duration_in_minutes?: number;
}) {
  const { data, error } = await supabase.from("price_option").insert(details).select().single();
  if (error) throw new Error(error.message);
  return data;
}
