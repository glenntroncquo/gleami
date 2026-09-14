import { supabase } from "../../supabase";
import { Company } from "@tests/types/company";

export async function addCompany(details: Company) {
  const { data, error } = await supabase.from("company").insert(details).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateCompanySettings(companyId: string, settings: any) {
  const { data, error } = await supabase
    .from("company")
    .update({ settings })
    .eq("id", companyId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}
