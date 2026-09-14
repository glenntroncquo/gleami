import { supabase } from "../../supabase";

export async function addStaff(details: {
  first_name: string;
  last_name: string;
  email: string;
  company_id: string;
  phone?: string;
  specialization?: string;
}) {
  const { data, error } = await supabase.from("staff").insert(details).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function addStaffTreatment(staffId: string, treatmentId: string, companyId: string) {
  const { data, error } = await supabase
    .from("staff_treatment")
    .insert({
      staff_id: staffId,
      treatment_id: treatmentId,
      company_id: companyId
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function addStaffPriceOption(staffId: string, priceOptionId: string, companyId: string) {
  const { data, error } = await supabase
    .from("staff_price_option")
    .insert({
      staff_id: staffId,
      price_option_id: priceOptionId,
      company_id: companyId
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}
