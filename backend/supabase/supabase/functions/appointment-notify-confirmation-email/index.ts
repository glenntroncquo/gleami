import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { supabaseAdmin } from "@/shared/supabase";
import { formatDate, formatTime } from "@/shared/format-date";
import { sendEmail } from "@/shared/resend";
import { fetchAppointmentServicesForEmail } from "@/shared/appointment-services-for-email";
import { fetchNotificationPlace, placeToEmailAddress } from "@/shared/notification-place-fetch";

// Format services list for display
function formatTreatmentsList(treatments) {
  return treatments.map((t)=>t.serviceVariantName ? `${t.serviceName} - ${t.serviceVariantName}` : t.serviceName).join(", ");
}
// Customer confirmation email template - Plain text
function createConfirmationEmailText(data) {
  const { customerName, companyName, appointmentStart, appointmentEnd, staffName, treatmentsList, companyStreet, companyCity, companyPostalCode, companyCountry, cancelLink } = data;
  const startDate = new Date(appointmentStart);
  const endDate = new Date(appointmentEnd);
  // Build address
  const addressParts = [];
  if (companyStreet) addressParts.push(companyStreet);
  if (companyPostalCode && companyCity) addressParts.push(`${companyPostalCode} ${companyCity}`);
  if (companyCountry) addressParts.push(companyCountry);
  const addressString = addressParts.join(", ");
  return `AFSPRAAKBEVESTIGING

Beste ${customerName},

Uw afspraak bij ${companyName} is bevestigd.

AFSPRAAKGEGEVENS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Datum: ${formatDate(startDate)}
Tijd: ${formatTime(startDate)} - ${formatTime(endDate)}
Behandeling(en): ${treatmentsList}
Medewerker: ${staffName}${addressString ? `
Locatie: ${addressString}` : ""}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

AFSPRAAK ANNULEREN:
Als u uw afspraak wilt annuleren, klik dan op de onderstaande link:
${cancelLink}

Met vriendelijke groet,
${companyName}

---
Deze email is automatisch verstuurd. Voor vragen kunt u contact opnemen met ${companyName}.`;
}
function staffEmailHeading(isNewClient) {
  return isNewClient ? "Nieuwe klant" : "Nieuwe afspraak";
}
// Staff notification email template - Plain text
function createStaffEmailText(data) {
  const { appointmentStart, appointmentEnd, staffName, treatmentsList, customerName, customerEmail, customerPhone, appointmentNotes, companyName, isNewClient } = data;
  const startDate = new Date(appointmentStart);
  const endDate = new Date(appointmentEnd);
  const heading = staffEmailHeading(isNewClient).toUpperCase();
  return `${heading}

KLANTGEGEVENS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Naam: ${customerName}
Email: ${customerEmail}
Telefoon: ${customerPhone || "Niet opgegeven"}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

AFSPRAAKDETAILS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Datum: ${formatDate(startDate)}
Tijd: ${formatTime(startDate)} - ${formatTime(endDate)}
Behandeling(en): ${treatmentsList}
Medewerker: ${staffName}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${appointmentNotes ? `NOTITIES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${appointmentNotes}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

` : ""}Met vriendelijke groet,
${companyName}

---
Deze email is automatisch verstuurd vanuit het afsprakenplanningssysteem.`;
}
// Simple HTML template with minimal styling (fallback for email clients that support it)
function createSimpleHtmlEmail(data, isStaff = false) {
  const { customerName, companyName, appointmentStart, appointmentEnd, staffName, treatmentsList, companyStreet, companyCity, companyPostalCode, companyCountry, cancelLink, customerEmail, customerPhone, appointmentNotes, isNewClient } = data;
  const startDate = new Date(appointmentStart);
  const endDate = new Date(appointmentEnd);
  const addressParts = [];
  if (companyStreet) addressParts.push(companyStreet);
  if (companyPostalCode && companyCity) addressParts.push(`${companyPostalCode} ${companyCity}`);
  if (companyCountry) addressParts.push(companyCountry);
  const addressString = addressParts.join(", ");
  if (isStaff) {
    const heading = staffEmailHeading(isNewClient);
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${heading}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">

<h2>${heading}</h2>

<h3>Klantgegevens:</h3>
<p>
<strong>Naam:</strong> ${customerName}<br>
<strong>Email:</strong> ${customerEmail}<br>
<strong>Telefoon:</strong> ${customerPhone || "Niet opgegeven"}
</p>

<h3>Afspraakdetails:</h3>
<p>
<strong>Datum:</strong> ${formatDate(startDate)}<br>
<strong>Tijd:</strong> ${formatTime(startDate)} - ${formatTime(endDate)}<br>
<strong>Behandeling(en):</strong> ${treatmentsList}<br>
<strong>Medewerker:</strong> ${staffName}
</p>

${appointmentNotes ? `<h3>Notities:</h3><p>${appointmentNotes.replace(/\n/g, '<br>')}</p>` : ""}

<p>Met vriendelijke groet,<br>${companyName}</p>

</body>
</html>`;
  } else {
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Afspraakbevestiging</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">

<h2>Afspraakbevestiging</h2>

<p>Beste ${customerName},</p>
<p>Uw afspraak bij <strong>${companyName}</strong> is bevestigd.</p>

<h3>Afspraakgegevens:</h3>
<p>
<strong>Datum:</strong> ${formatDate(startDate)}<br>
<strong>Tijd:</strong> ${formatTime(startDate)} - ${formatTime(endDate)}<br>
<strong>Behandeling(en):</strong> ${treatmentsList}<br>
<strong>Medewerker:</strong> ${staffName}${addressString ? `<br><strong>Locatie:</strong> ${addressString}` : ""}
</p>

<p><a href="${cancelLink}" style="background: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Afspraak annuleren</a></p>

<p>Met vriendelijke groet,<br>${companyName}</p>

</body>
</html>`;
  }
}
serve(async (req)=>{
  try {
    console.log("Processing appointment email request");
    // Get the appointment data from the request
    const webhookPayload = await req.json();
    const { record } = webhookPayload;
    if (!record || !record.id) {
      throw new Error("No appointment record found in request");
    }
    console.log("Appointment ID:", record.id);
    // Get the appointment from the record
    const appointment = record;

    // Check if appointment is today or in the future (date-only check)
    const appointmentStart = new Date(appointment.start);
    const now = new Date();

    // Get date without time for comparison
    const appointmentDate = new Date(appointmentStart.getFullYear(), appointmentStart.getMonth(), appointmentStart.getDate());
    const currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (appointmentDate < currentDate) {
      console.log("Appointment is before today, skipping confirmation email");
      return new Response(JSON.stringify({
        success: true,
        message: "Appointment is before today, confirmation email not sent",
        skipped: true,
        appointmentId: appointment.id,
        appointmentStart: appointment.start
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }

    // Skip if confirmation email was already sent
    if (appointment.confirmation_sent === true) {
      return new Response(JSON.stringify({
        success: true,
        message: "Confirmation email already sent for this appointment",
        alreadySent: true,
        appointmentId: appointment.id
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }

    // Fetch client data
    const { data: client, error: clientError } = await supabaseAdmin.from("client").select("*").eq("id", appointment.client_id).single();
    if (clientError) throw new Error(`Error fetching client: ${clientError.message}`);
    if (!client) throw new Error(`Client with ID ${appointment.client_id} not found`);
    if (!client.email) {
      console.log("Client has no email on file, skipping confirmation email");
      return new Response(JSON.stringify({
        success: true,
        message: "Client has no email address, confirmation email not sent",
        skipped: true,
        appointmentId: appointment.id
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
    // Fetch company data
    const { data: company, error: companyError } = await supabaseAdmin.from("company").select("*").eq("id", appointment.company_id).single();
    if (companyError) throw new Error(`Error fetching company: ${companyError.message}`);
    if (!company) throw new Error(`Company with ID ${appointment.company_id} not found`);
    const place = await fetchNotificationPlace(company, appointment.location_id);
    // Fetch staff data
    const { data: staff, error: staffError } = await supabaseAdmin.from("staff").select("*").eq("id", appointment.staff_id).single();
    if (staffError) throw new Error(`Error fetching staff: ${staffError.message}`);
    if (!staff) throw new Error(`Staff with ID ${appointment.staff_id} not found`);
    // Segments only. No appointment_treatment fallback.
    const treatments = await fetchAppointmentServicesForEmail(appointment.id);
    console.log("Services fetched:", treatments);
    // First non-canceled booking at this company → treat as new client
    const { count: priorAppointmentCount, error: priorAppointmentError } = await supabaseAdmin
      .from("appointment")
      .select("id", { count: "exact", head: true })
      .eq("client_id", appointment.client_id)
      .eq("company_id", appointment.company_id)
      .eq("is_canceled", false)
      .neq("id", appointment.id);
    if (priorAppointmentError) {
      throw new Error(`Error checking prior appointments: ${priorAppointmentError.message}`);
    }
    const isNewClient = (priorAppointmentCount ?? 0) === 0;
    console.log("Is new client:", isNewClient, "prior appointments:", priorAppointmentCount);
    // Construct names
    const staffName = `${staff.first_name || ""} ${staff.last_name || ""}`.trim();
    const customerName = `${client.first_name || ""} ${client.last_name || ""}`.trim();
    // Format treatments list
    const treatmentsList = formatTreatmentsList(treatments);
    // Prepare email data
    const emailData = {
      customerName,
      customerEmail: client.email,
      customerPhone: client.phone || "",
      companyName: company.name,
      ...placeToEmailAddress(place),
      appointmentStart: appointment.start,
      appointmentEnd: appointment.end,
      staffName,
      treatmentsList,
      appointmentNotes: appointment.notes,
      cancelLink: `https://salonify.co/nl/cancel-appointment/${company.id}/${client.id}`,
      isNewClient
    };
    console.log("Email data prepared");
    // Generate plain text content for emails
    const clientText = createConfirmationEmailText(emailData);
    const staffText = createStaffEmailText(emailData);
    // Generate simple HTML as fallback
    const clientHtml = createSimpleHtmlEmail(emailData, false);
    const staffHtml = createSimpleHtmlEmail(emailData, true);
    console.log("Email content generated");
    // Email subjects - keep them simple and clear
    const clientSubject = `Afspraak bevestigd - ${company.name}`;
    const staffSubject = `${staffEmailHeading(isNewClient)}: ${customerName}`;
    // Send confirmation email to client
    try {
      const clientEmailResult = await sendEmail({
        from: `${company.name} <afspraken@notifications.salonify.co>`,
        to: [
          client.email
        ],
        subject: clientSubject,
        text: clientText,
        html: clientHtml
      });
      console.log("Client email sent successfully:", clientEmailResult);
      // Send staff email (best-effort - a failure here shouldn't fail the whole request)
      if (!place.email) {
        console.log("Location/company has no email on file, skipping staff notification");
      } else {
        try {
          const staffEmailResult = await sendEmail({
            from: `${company.name} <afspraken@notifications.salonify.co>`,
            to: [
              place.email
            ],
            subject: staffSubject,
            text: staffText,
            html: staffHtml
          });
          console.log("Staff email sent successfully:", staffEmailResult);
        } catch (staffEmailError) {
          console.error("Staff email failed:", staffEmailError);
        }
      }
      // Update appointment to mark confirmation as sent
      const { error: updateError } = await supabaseAdmin.from("appointment").update({
        confirmation_sent: true
      }).eq("id", appointment.id);
      if (updateError) {
        console.error("Error updating appointment:", updateError);
      }
      return new Response(JSON.stringify({
        success: true,
        message: "Confirmation emails sent successfully",
        clientEmailId: clientEmailResult.id,
        appointmentId: appointment.id,
        treatmentsCount: treatments.length
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      });
    } catch (emailError) {
      console.error("Error sending emails:", emailError);
      throw new Error(`Failed to send emails: ${emailError.message}`);
    }
  } catch (error) {
    console.error("Error processing appointment emails:", error);
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
