import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { supabaseAdmin } from "@/shared/supabase";
import { formatDate, formatTime } from "@/shared/format-date";
import { sendEmail } from "@/shared/resend";
import { fetchAppointmentServicesForEmail } from "@/shared/appointment-services-for-email";
import { fetchNotificationPlace, placeToEmailAddress } from "@/shared/notification-place-fetch";
import {
  isInReminderWindow,
  localReminderWindowUtc,
  reminderCandidateFetchWindow,
} from "@/shared/reminder-window";

// Format services and prices for display
function formatTreatmentsWithPrices(treatments) {
  return treatments.map((t)=>{
    let display = t.serviceName;
    if (t.serviceVariantName) {
      display += ` - ${t.serviceVariantName}`;
    }
    return display;
  }).join("<br>");
}
// Calculate total price
function calculateTotalPrice(treatments) {
  return treatments.reduce((total, t)=>total + (parseFloat(t.price) || 0), 0);
}
// Reminder email template
function createReminderEmail(data) {
  const { customerName, companyName, appointmentStart, appointmentEnd, staffName, treatments, companyStreet, companyCity, companyPostalCode, companyCountry, cancelLink, rescheduleLink } = data;
  const startDate = new Date(appointmentStart);
  const endDate = new Date(appointmentEnd);
  // Build address
  const addressParts = [];
  if (companyStreet) addressParts.push(companyStreet);
  if (companyPostalCode && companyCity) addressParts.push(`${companyPostalCode} ${companyCity}`);
  if (companyCountry) addressParts.push(companyCountry);
  const addressString = addressParts.join(", ");
  const mapsUrl = addressString ? `https://www.google.com/maps?q=${encodeURIComponent(addressString)}` : null;
  // Format treatments and calculate total
  const treatmentsDisplay = formatTreatmentsWithPrices(treatments);
  const totalPrice = calculateTotalPrice(treatments);
  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Afspraakherinnering</title>
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
              <h1 style="margin: 0; color: #E91E63; font-size: 24px; font-weight: bold;">Afspraakherinnering</h1>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 20px;">
              <p style="margin: 0 0 15px 0; font-size: 16px;">Beste ${customerName},</p>
              <p style="margin: 0 0 20px 0; font-size: 16px;">Dit is een herinnering voor uw afspraak bij <strong>${companyName}</strong> morgen.</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="padding-bottom: 10px;">
                    <strong style="color: #E91E63;">Datum:</strong> ${formatDate(startDate)}
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 10px;">
                    <strong style="color: #E91E63;">Tijd:</strong> ${formatTime(startDate)} - ${formatTime(endDate)}
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 10px;">
                    <strong style="color: #E91E63;">Behandeling${treatments.length > 1 ? 'en' : ''}:</strong><br>
                    ${treatmentsDisplay}
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 10px;">
                    <strong style="color: #E91E63;">Medewerker:</strong> ${staffName}
                  </td>
                </tr>
                ${addressString ? `<tr>
                  <td>
                    <strong style="color: #E91E63;">Locatie:</strong> ${mapsUrl ? `<a href="${mapsUrl}" style="color: #E91E63; text-decoration: underline;" target="_blank">${addressString}</a>` : addressString}
                  </td>
                </tr>` : ""}
              </table>
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
    console.log("Processing appointment reminders");
    const now = new Date();
    const fetchWindow = reminderCandidateFetchWindow(now);
    console.log("Candidate fetch window (UTC, 20-30h; filtered per location TZ):", {
      currentUTC: now.toISOString(),
      startUTC: fetchWindow.start.toISOString(),
      endUTC: fetchWindow.end.toISOString()
    });
    const { data: appointments, error: appointmentsError } = await supabaseAdmin.from("appointment").select(`
        id,
        client_id,
        company_id,
        staff_id,
        location_id,
        start,
        end,
        is_canceled,
        reminder_sent
      `).gte("start", fetchWindow.start.toISOString()).lt("start", fetchWindow.end.toISOString()).eq("reminder_sent", false).eq("is_canceled", false);
    if (appointmentsError) {
      throw new Error(`Error fetching appointments: ${appointmentsError.message}`);
    }
    console.log(appointments);
    if (!appointments || appointments.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: "No appointments need reminders at this time",
        remindersSent: 0,
        timeWindow: {
          startUTC: fetchWindow.start.toISOString(),
          endUTC: fetchWindow.end.toISOString()
        }
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
    console.log(`Found ${appointments.length} appointments needing reminders`);
    const reminderResults = [];
    let successCount = 0;
    let failureCount = 0;
    // Process each appointment
    for (const appointment of appointments){
      try {
        console.log(`Processing appointment ${appointment.id}`);
        // Fetch client data
        const { data: client, error: clientError } = await supabaseAdmin.from("client").select("*").eq("id", appointment.client_id).single();
        if (clientError) {
          throw new Error(`Error fetching client: ${clientError.message}`);
        }
        if (!client) {
          throw new Error(`Client with ID ${appointment.client_id} not found`);
        }
        if (!client.email) {
          throw new Error(`Client with ID ${appointment.client_id} has no email on file`);
        }
        // Fetch company data
        const { data: company, error: companyError } = await supabaseAdmin.from("company").select("*").eq("id", appointment.company_id).single();
        if (companyError) {
          throw new Error(`Error fetching company: ${companyError.message}`);
        }
        if (!company) {
          throw new Error(`Company with ID ${appointment.company_id} not found`);
        }
        const place = await fetchNotificationPlace(company, appointment.location_id);
        const localWindow = localReminderWindowUtc(now, place.timezone);
        if (!isInReminderWindow(new Date(appointment.start), localWindow.start, localWindow.end)) {
          console.log(
            `Skipping appointment ${appointment.id}: start outside ${place.timezone} 24-25h window`,
          );
          continue;
        }
        // Fetch staff data
        const { data: staff, error: staffError } = await supabaseAdmin.from("staff").select("*").eq("id", appointment.staff_id).single();
        if (staffError) {
          throw new Error(`Error fetching staff: ${staffError.message}`);
        }
        if (!staff) {
          throw new Error(`Staff with ID ${appointment.staff_id} not found`);
        }
        // Segments only. No appointment_treatment fallback.
        const treatments = await fetchAppointmentServicesForEmail(appointment.id);
        console.log("Services fetched for reminder:", treatments);
        // Construct staff name
        const staffName = `${staff.first_name || ""} ${staff.last_name || ""}`.trim();
        // Construct customer name
        const customerName = `${client.first_name || ""} ${client.last_name || ""}`.trim();
        // Prepare data for the reminder email
        const reminderEmailData = {
          customerName,
          companyName: company.name,
          ...placeToEmailAddress(place),
          appointmentStart: appointment.start,
          appointmentEnd: appointment.end,
          staffName,
          treatments: treatments,
          logoUrl: company.image_url || "https://salonify.co/logo.png",
          cancelLink: `https://salonify.co/cancel/${appointment.id}`,
          rescheduleLink: `https://salonify.co/reschedule/${appointment.id}`,
          primaryColor: "#E91E63",
          reminderType: "day_before"
        };
        // Generate reminder email HTML
        const reminderHtml = createReminderEmail(reminderEmailData);
        // Send reminder email
        const emailResult = await sendEmail({
          from: `${company.name} <afspraken@salonify.co>`,
          to: [
            client.email
          ],
          subject: `Herinnering: Afspraak morgen bij ${company.name}`,
          html: reminderHtml
        });
        console.log(`Reminder email sent for appointment ${appointment.id}:`, emailResult.id);
        // Update appointment to mark reminder as sent
        const { error: updateError } = await supabaseAdmin.from("appointment").update({
          reminder_sent: true
        }).eq("id", appointment.id);
        if (updateError) {
          console.error(`Error updating appointment ${appointment.id}:`, updateError);
        // Don't throw here, we still want to count this as success since email was sent
        }
        reminderResults.push({
          appointmentId: appointment.id,
          clientEmail: client.email,
          emailId: emailResult.id,
          treatmentsCount: treatments.length,
          status: "success"
        });
        successCount++;
      } catch (appointmentError) {
        console.error(`Error processing appointment ${appointment.id}:`, appointmentError);
        reminderResults.push({
          appointmentId: appointment.id,
          status: "failed",
          error: appointmentError.message
        });
        failureCount++;
      }
    }
    console.log(`Reminder processing complete. Success: ${successCount}, Failures: ${failureCount}`);
    return new Response(JSON.stringify({
      success: true,
      message: `Processed ${appointments.length} appointments`,
      remindersSent: successCount,
      failures: failureCount,
      timeWindow: {
        startUTC: fetchWindow.start.toISOString(),
        endUTC: fetchWindow.end.toISOString()
      },
      results: reminderResults
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("Error processing appointment reminders:", error);
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
