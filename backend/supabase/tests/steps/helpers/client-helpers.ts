import { supabase } from "../../supabase";

export async function addClient(details: {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
}) {
  const { data, error } = await supabase.from("client").insert(details).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function addClientToCompany(clientId: string, companyId: string) {
  const { data: location, error: locationError } = await supabase
    .from("location")
    .select("id")
    .eq("company_id", companyId)
    .eq("is_primary", true)
    .maybeSingle();
  if (locationError) throw new Error(locationError.message);
  if (!location) throw new Error("Primary location missing for company");

  const { data, error } = await supabase
    .from("client_location")
    .insert({
      client_id: clientId,
      location_id: location.id,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}
