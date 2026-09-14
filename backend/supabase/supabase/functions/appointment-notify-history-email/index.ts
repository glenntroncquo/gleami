import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { supabaseAdmin } from "@/shared/supabase";
import { formatDate, formatTime } from "@/shared/format-date";
import { sendEmail } from "@/shared/resend";
import {
  fetchAppointmentServicesForEmail,
  type AppointmentServiceForEmail,
} from "@/shared/appointment-services-for-email";
import {
  fetchNotificationPlacesByIds,
  resolveNotificationPlace,
} from "@/shared/notification-place-fetch";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};
// Format treatments list for display
function formatTreatmentsList(treatments) {
  return treatments.map((t)=>{
    let display = t.serviceName;
    if (t.serviceVariantName) {
      display += ` - ${t.serviceVariantName}`;
    }
    return display;
  }).join("<br>");
}
// Email template for appointments overview
function createAppointmentsEmail(data) {
  const { customerName, companyName, appointments, cancelLink } = data;
  const appointmentRows = appointments.map((appointment)=>{
    const startDate = new Date(appointment.start);
    const endDate = new Date(appointment.end);
    const treatmentsList = formatTreatmentsList(appointment.treatments);
    return `
            <tr>
              <td style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 15px; display: block; width: 100%; box-sizing: border-box;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td style="padding-bottom: 8px;">
                      <strong style="color: #E91E63;">Datum:</strong> ${formatDate(startDate)}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-bottom: 8px;">
                      <strong style="color: #E91E63;">Tijd:</strong> ${formatTime(startDate)} - ${formatTime(endDate)}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-bottom: 8px;">
                      <strong style="color: #E91E63;">Behandeling${appointment.treatments.length > 1 ? 'en' : ''}:</strong><br>
                      ${treatmentsList}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-bottom: 8px;">
                      <strong style="color: #E91E63;">Medewerker:</strong> ${appointment.staff.first_name} ${appointment.staff.last_name}
                    </td>
                  </tr>
                  ${appointment.locationAddress ? `<tr>
                    <td style="padding-bottom: 8px;">
                      <strong style="color: #E91E63;">Locatie:</strong> ${appointment.locationAddress}
                    </td>
                  </tr>` : ""}
                  <tr>
                    <td style="padding-bottom: 8px;">
                      <strong style="color: #E91E63;">Status:</strong> ${appointment.status || 'Bevestigd'}
                    </td>
                  </tr>
                  ${appointment.notes ? `<tr>
                    <td>
                      <strong style="color: #E91E63;">Notities:</strong> ${appointment.notes}
                    </td>
                  </tr>` : ""}
                </table>
              </td>
            </tr>`;
  }).join('');
  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Uw Afspraken</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.6; color: #333333;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #ffffff;">
    <tr>
      <td style="padding: 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto;">
          <tr>
            <td style="padding-bottom: 20px;">
              <h1 style="margin: 0; color: #E91E63; font-size: 24px; font-weight: bold;">Uw Afspraken</h1>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 20px;">
              <p style="margin: 0 0 15px 0; font-size: 16px;">Beste ${customerName},</p>
              <p style="margin: 0 0 20px 0; font-size: 16px;">Hieronder vindt u een overzicht van uw afspraken bij <strong>${companyName}</strong>.</p>
              <p style="margin: 0 0 20px 0; font-size: 14px; color: #666;">Totaal aantal afspraken: <strong>${appointments.length}</strong></p>
            </td>
          </tr>
          ${appointmentRows}
          <tr>
            <td style="padding: 20px 0; text-align: center;">
              <p>Een afspraak annuleren:</p>
              <a href="${cancelLink}" style="display: inline-block; background-color: #dc3545; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 14px;">Afspraak annuleren</a>
            </td>
          </tr>
          <tr>
            <td style="padding-top: 20px; border-top: 1px solid #e9ecef;">
              <p style="margin: 0; font-size: 14px;">Met vriendelijke groet,<br><strong>${companyName}</strong></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
serve(async (req)=>{
  try {
    console.log("Processing client appointments email request");
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Method not allowed'
      }), {
        status: 405,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
    // Get the request data
    const requestData = await req.json();
    const { email, companyId } = requestData;
    if (!email || !companyId) {
      throw new Error("Email and companyId are required");
    }
    console.log("Email:", email, "Company ID:", companyId);
    // Fetch client by email
    const { data: client, error: clientError } = await supabaseAdmin.from("client").select("*").eq("email", email).single();
    if (clientError) {
      if (clientError.code === 'PGRST116') {
        throw new Error(`No client found with email: ${email}`);
      }
      throw new Error(`Error fetching client: ${clientError.message}`);
    }
    if (!client) {
      throw new Error(`Client with email ${email} not found`);
    }
    console.log("Found client:", client.id);
    // Fetch company data
    const { data: company, error: companyError } = await supabaseAdmin.from("company").select("*").eq("id", companyId).single();
    if (companyError) throw new Error(`Error fetching company: ${companyError.message}`);
    if (!company) throw new Error(`Company with ID ${companyId} not found`);
    console.log("Found company:", company.name);
    // Fetch all appointments for this client and company. start/end only — leftover actual_* columns are ignored.
    const { data: appointments, error: appointmentsError } = await supabaseAdmin.from("appointment").select(`
    id,
    start,
    end,
    notes,
    status,
    is_canceled,
    location_id,
    staff (
      first_name,
      last_name
    )
  `).eq("client_id", client.id).eq("company_id", companyId)
    .order("start", {
      ascending: true
    });
    if (appointmentsError) {
      throw new Error(`Error fetching appointments: ${appointmentsError.message}`);
    }
    if (!appointments || appointments.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        message: "No appointments found for this client and company",
        clientId: client.id,
        companyId: companyId
      }), {
        status: 404,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
    console.log(`Found ${appointments.length} appointments`);
    const placesByLocationId = await fetchNotificationPlacesByIds(
      company,
      appointments.map((appointment) => appointment.location_id),
    );
    const companyPlace = resolveNotificationPlace(company, null);
    const formatLocationAddress = (locationId?: string | null) => {
      const place = (locationId && placesByLocationId.get(locationId)) || companyPlace;
      const parts = [];
      if (place.street) parts.push(place.street);
      if (place.postalCode && place.city) parts.push(`${place.postalCode} ${place.city}`);
      else if (place.city) parts.push(place.city);
      if (place.country) parts.push(place.country);
      return parts.join(", ");
    };
    // Fetch treatments for each appointment. A treatment-fetch failure for one
    // appointment shouldn't break the whole history email - fall back to [].
    const appointmentsWithTreatments = [];
    for (const appointment of appointments){
      let treatments: AppointmentServiceForEmail[];
      try {
        treatments = await fetchAppointmentServicesForEmail(appointment.id);
      } catch (err) {
        console.error(`Error fetching services for appointment ${appointment.id}:`, err);
        treatments = [];
      }
      appointmentsWithTreatments.push({
        ...appointment,
        treatments,
        locationAddress: formatLocationAddress(appointment.location_id),
      });
    }
    console.log("Fetched treatments for all appointments");
    // Prepare email data
    const customerName = `${client.first_name || ""} ${client.last_name || ""}`.trim();
    const emailData = {
      customerName,
      companyName: company.name,
      appointments: appointmentsWithTreatments,
      cancelLink: `https://salonify.co/nl/cancel-appointment/${company.id}/${client.id}`
    };
    // Generate HTML content
    const htmlContent = createAppointmentsEmail(emailData);
    const subject = `Uw afspraken bij ${company.name}`;
    console.log("Sending email...");
    // Send email via Resend
    const emailResult = await sendEmail({
      from: `${company.name} <afspraken@notifications.salonify.co>`,
      to: [
        email
      ],
      subject: subject,
      html: htmlContent
    });
    console.log("Email sent successfully:", emailResult);
    return new Response(JSON.stringify({
      success: true,
      message: "Appointments email sent successfully",
      emailId: emailResult.id,
      clientId: client.id,
      companyId: companyId,
      appointmentsCount: appointments.length
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("Error processing appointments email:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || "Unknown error occurred",
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
});
