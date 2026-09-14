import { supabase } from "../supabase";
import { Company } from "@tests/types/company";
import dotenv from "dotenv";

dotenv.config();

export async function addCompany(details: Company) {
  const { data, error } = await supabase.from("company").insert(details).select().single();
  if (error) throw new Error(error.message);
  return data;
}

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

export async function addTreatment(details: {
  name: string;
  company_id: string;
  description?: string;
  is_active?: boolean;
}) {
  const treatmentData = {
    is_active: true,
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

export async function addAppointment(details: {
  staff_id: string;
  treatment_id: string;
  client_id: string;
  company_id: string;
  price_option_id: string;
  price: number;
  start: string;
  end: string;
  duration_in_minutes?: number;
  notes?: string;
}) {
  const { data, error } = await supabase.from("appointment").insert(details).select().single();
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