import { supabase } from "../../supabase";
import dotenv from "dotenv";

dotenv.config();

// Updated to use the book-appointment edge function
export async function bookAppointment(details: {
  start: string;
  end: string;
  staffId: string;
  companyId: string;
  treatmentId: string;
  priceOptionId: string;
  price: number;
  firstName: string;
  lastName: string;
  email: string;
  notes?: string;
}) {
  const response = await fetch(`${process.env.SUPABASE_URL}/functions/v1/book-appointment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify(details),
  });

  if (!response.ok) {
    const errorData = await response.json() as { error: string; details?: string };
    console.log(errorData);
    console.log('hello')
    throw new Error(`Booking failed: ${errorData.error} - ${errorData.details || ''}`);
  }

  const result = await response.json() as { success: boolean; booking_id: string; client_id: string };
  
  // Fetch the created appointment to return it in the expected format
  const { data: appointment, error } = await supabase
    .from("appointment")
    .select("*")
    .eq("id", result.booking_id)
    .single();

  if (error) throw new Error(error.message);
  return appointment;
}

// Keep the old function for backward compatibility, but make it use the edge function
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
  // For backward compatibility, we need to get client details to call the edge function
  const { data: client, error: clientError } = await supabase
    .from("client")
    .select("first_name, last_name, email")
    .eq("id", details.client_id)
    .single();

  if (clientError) throw new Error(clientError.message);

  return bookAppointment({
    start: details.start,
    end: details.end,
    staffId: details.staff_id,
    companyId: details.company_id,
    treatmentId: details.treatment_id,
    priceOptionId: details.price_option_id,
    price: details.price,
    firstName: client.first_name,
    lastName: client.last_name,
    email: client.email,
    notes: details.notes
  });
}
