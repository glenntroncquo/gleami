import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { supabaseAdmin } from "@/shared/supabase";
import { formatDate, formatTime } from "@/shared/format-date";
import { sendEmail } from "@/shared/resend";
import { fetchAppointmentServicesForEmail } from "@/shared/appointment-services-for-email";
import { fetchNotificationPlace, placeToEmailAddress } from "@/shared/notification-place-fetch";

// Format treatments list for display
function formatTreatmentsList(treatments: Array<{ treatment: string; priceOption: string | null }>) {
  return treatments.map((t) => t.priceOption ? `${t.treatment} - ${t.priceOption}` : t.treatment).join(", ");
}

// Customer update email template - Plain text
function createUpdateEmailText(data: {
  customerName: string;
  companyName: string;
  appointmentStart: string;
  appointmentEnd: string;
  staffName: string;
  treatmentsList: string;
  companyStreet?: string;
  companyCity?: string;
  companyPostalCode?: string;
  companyCountry?: string;
  cancelLink?: string;
}) {
  const { customerName, companyName, appointmentStart, appointmentEnd, staffName, treatmentsList, companyStreet, companyCity, companyPostalCode, companyCountry, cancelLink } = data;
  const startDate = new Date(appointmentStart);
  const endDate = new Date(appointmentEnd);

  // Build address
  const addressParts = [];
  if (companyStreet) addressParts.push(companyStreet);
  if (companyPostalCode && companyCity) addressParts.push(`${companyPostalCode} ${companyCity}`);
  if (companyCountry) addressParts.push(companyCountry);
  const addressString = addressParts.join(", ");

  return `AFSPRAAK BIJGEWERKT

Beste ${customerName},

Uw afspraak bij ${companyName} is bijgewerkt.

AFSPRAAKGEGEVENS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Datum: ${formatDate(startDate)}
Tijd: ${formatTime(startDate)} - ${formatTime(endDate)}
Behandeling(en): ${treatmentsList}
Medewerker: ${staffName}${addressString ? `
Locatie: ${addressString}` : ""}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${cancelLink ? `AFSPRAAK ANNULEREN:
Als u uw afspraak wilt annuleren, klik dan op de onderstaande link:
${cancelLink}

` : ""}Met vriendelijke groet,
${companyName}

---
Deze email is automatisch verstuurd. Voor vragen kunt u contact opnemen met ${companyName}.`;
}

// Staff update notification email template - Plain text
function createStaffUpdateEmailText(data: {
  customerName: string;
  companyName: string;
  appointmentStart: string;
  appointmentEnd: string;
  staffName: string;
  treatmentsList: string;
  customerEmail: string;
  customerPhone?: string;
  appointmentNotes?: string;
}) {
  const { customerName, companyName, appointmentStart, appointmentEnd, staffName, treatmentsList, customerEmail, customerPhone, appointmentNotes } = data;
  const startDate = new Date(appointmentStart);
  const endDate = new Date(appointmentEnd);

  return `AFSPRAAK BIJGEWERKT

Er is een afspraak bijgewerkt voor ${companyName}.

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

// Customer cancellation email template - Plain text
function createCancellationEmailText(data: {
  customerName: string;
  companyName: string;
  appointmentStart: string;
  appointmentEnd: string;
  staffName: string;
  treatmentsList: string;
  companyStreet?: string;
  companyCity?: string;
  companyPostalCode?: string;
  companyCountry?: string;
  cancelReason?: string;
}) {
  const { customerName, companyName, appointmentStart, appointmentEnd, staffName, treatmentsList, companyStreet, companyCity, companyPostalCode, companyCountry, cancelReason } = data;
  const startDate = new Date(appointmentStart);
  const endDate = new Date(appointmentEnd);

  // Build address
  const addressParts = [];
  if (companyStreet) addressParts.push(companyStreet);
  if (companyPostalCode && companyCity) addressParts.push(`${companyPostalCode} ${companyCity}`);
  if (companyCountry) addressParts.push(companyCountry);
  const addressString = addressParts.join(", ");

  return `AFSPRAAK GEANNULEERD

Beste ${customerName},

Uw afspraak bij ${companyName} is geannuleerd.

AFSPRAAKGEGEVENS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Datum: ${formatDate(startDate)}
Tijd: ${formatTime(startDate)} - ${formatTime(endDate)}
Behandeling(en): ${treatmentsList}
Medewerker: ${staffName}${addressString ? `
Locatie: ${addressString}` : ""}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${cancelReason ? `REDEN VAN ANNULERING:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${cancelReason}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

` : ""}Met vriendelijke groet,
${companyName}

---
Deze email is automatisch verstuurd. Voor vragen kunt u contact opnemen met ${companyName}.`;
}

// Staff notification email template - Plain text
function createStaffCancellationEmailText(data: {
  customerName: string;
  companyName: string;
  appointmentStart: string;
  appointmentEnd: string;
  staffName: string;
  treatmentsList: string;
  customerEmail: string;
  customerPhone?: string;
  cancelReason?: string;
  canceledBy?: string;
}) {
  const { customerName, companyName, appointmentStart, appointmentEnd, staffName, treatmentsList, customerEmail, customerPhone, cancelReason, canceledBy } = data;
  const startDate = new Date(appointmentStart);
  const endDate = new Date(appointmentEnd);

  return `AFSPRAAK GEANNULEERD

Er is een afspraak geannuleerd voor ${companyName}.

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

${canceledBy ? `GEANNULEERD DOOR: ${canceledBy}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

` : ""}${cancelReason ? `REDEN VAN ANNULERING:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${cancelReason}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

` : ""}Met vriendelijke groet,
${companyName}

`;
}

// Simple HTML template for update emails
function createSimpleHtmlUpdateEmail(data: {
  customerName: string;
  companyName: string;
  appointmentStart: string;
  appointmentEnd: string;
  staffName: string;
  treatmentsList: string;
  companyStreet?: string;
  companyCity?: string;
  companyPostalCode?: string;
  companyCountry?: string;
  cancelLink?: string;
  customerEmail?: string;
  customerPhone?: string;
  appointmentNotes?: string;
}, isStaff = false) {
  const { customerName, companyName, appointmentStart, appointmentEnd, staffName, treatmentsList, companyStreet, companyCity, companyPostalCode, companyCountry, cancelLink, customerEmail, customerPhone, appointmentNotes } = data;
  const startDate = new Date(appointmentStart);
  const endDate = new Date(appointmentEnd);

  const addressParts = [];
  if (companyStreet) addressParts.push(companyStreet);
  if (companyPostalCode && companyCity) addressParts.push(`${companyPostalCode} ${companyCity}`);
  if (companyCountry) addressParts.push(companyCountry);
  const addressString = addressParts.join(", ");

  if (isStaff) {
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Afspraak Bijgewerkt</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">

<h2>Afspraak Bijgewerkt</h2>

<p>Er is een afspraak bijgewerkt voor ${companyName}.</p>

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
<title>Afspraak Bijgewerkt</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">

<h2>Afspraak Bijgewerkt</h2>

<p>Beste ${customerName},</p>
<p>Uw afspraak bij <strong>${companyName}</strong> is bijgewerkt.</p>

<h3>Afspraakgegevens:</h3>
<p>
<strong>Datum:</strong> ${formatDate(startDate)}<br>
<strong>Tijd:</strong> ${formatTime(startDate)} - ${formatTime(endDate)}<br>
<strong>Behandeling(en):</strong> ${treatmentsList}<br>
<strong>Medewerker:</strong> ${staffName}${addressString ? `<br><strong>Locatie:</strong> ${addressString}` : ""}
</p>

${cancelLink ? `<p><a href="${cancelLink}" style="background: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Afspraak annuleren</a></p>` : ""}

<p>Met vriendelijke groet,<br>${companyName}</p>

</body>
</html>`;
  }
}

// Simple HTML template with minimal styling (fallback for email clients that support it)
function createSimpleHtmlCancellationEmail(data: {
  customerName: string;
  companyName: string;
  appointmentStart: string;
  appointmentEnd: string;
  staffName: string;
  treatmentsList: string;
  companyStreet?: string;
  companyCity?: string;
  companyPostalCode?: string;
  companyCountry?: string;
  cancelReason?: string;
  customerEmail?: string;
  customerPhone?: string;
  canceledBy?: string;
}, isStaff = false) {
  const { customerName, companyName, appointmentStart, appointmentEnd, staffName, treatmentsList, companyStreet, companyCity, companyPostalCode, companyCountry, cancelReason, customerEmail, customerPhone, canceledBy } = data;
  const startDate = new Date(appointmentStart);
  const endDate = new Date(appointmentEnd);

  const addressParts = [];
  if (companyStreet) addressParts.push(companyStreet);
  if (companyPostalCode && companyCity) addressParts.push(`${companyPostalCode} ${companyCity}`);
  if (companyCountry) addressParts.push(companyCountry);
  const addressString = addressParts.join(", ");

  if (isStaff) {
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Afspraak Geannuleerd</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">

<h2>Afspraak Geannuleerd</h2>

<p>Er is een afspraak geannuleerd voor ${companyName}.</p>

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

${canceledBy ? `<h3>Geannuleerd door:</h3><p>${canceledBy}</p>` : ""}

${cancelReason ? `<h3>Reden van annulering:</h3><p>${cancelReason.replace(/\n/g, '<br>')}</p>` : ""}

<p>Met vriendelijke groet,<br>${companyName}</p>

</body>
</html>`;
  } else {
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Afspraak Geannuleerd</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">

<h2>Afspraak Geannuleerd</h2>

<p>Beste ${customerName},</p>
<p>Uw afspraak bij <strong>${companyName}</strong> is geannuleerd.</p>

<h3>Afspraakgegevens:</h3>
<p>
<strong>Datum:</strong> ${formatDate(startDate)}<br>
<strong>Tijd:</strong> ${formatTime(startDate)} - ${formatTime(endDate)}<br>
<strong>Behandeling(en):</strong> ${treatmentsList}<br>
<strong>Medewerker:</strong> ${staffName}${addressString ? `<br><strong>Locatie:</strong> ${addressString}` : ""}
</p>

${cancelReason ? `<h3>Reden van annulering:</h3><p>${cancelReason.replace(/\n/g, '<br>')}</p>` : ""}

<p>Met vriendelijke groet,<br>${companyName}</p>

</body>
</html>`;
  }
}

serve(async (req) => {
  try {
    console.log("Processing appointment update/cancellation email request");

    // Get the appointment data from the request
    const webhookPayload = await req.json();
    const { record, old_record } = webhookPayload;

    if (!record || !record.id) {
      throw new Error("No appointment record found in request");
    }

    // Log old and new records for debugging
    console.log("=== Appointment Update Webhook ===");
    console.log("Appointment ID:", record.id);
    console.log("OLD RECORD:", JSON.stringify(old_record, null, 2));
    console.log("NEW RECORD:", JSON.stringify(record, null, 2));
    console.log("===================================");

    // Get the appointment from the record
    const appointment = record;

    // Compare old vs new to determine what changed
    const oldIsCanceled = old_record?.is_canceled === true;
    const newIsCanceled = record.is_canceled === true;

    const oldReminderSent = old_record?.reminder_sent === true;
    const newReminderSent = record.reminder_sent === true;

    const oldConfirmationSent = old_record?.confirmation_sent === true;
    const newConfirmationSent = record.confirmation_sent === true;

    // Check if reminder_sent or confirmation_sent changed from false to true
    // If so, skip sending email (these are handled by other functions)
    if ((!oldReminderSent && newReminderSent) || (!oldConfirmationSent && newConfirmationSent)) {
      console.log("Skipping: reminder_sent or confirmation_sent was just set to true");
      return new Response(JSON.stringify({
        success: true,
        message: "Skipping email - reminder or confirmation was just sent",
        appointmentId: appointment.id,
        reason: !oldReminderSent && newReminderSent ? "reminder_sent" : "confirmation_sent"
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }

    // Check if is_canceled changed from false to true → send cancellation email
    const isCancellation = !oldIsCanceled && newIsCanceled;
    console.log(`Cancellation check: old=${oldIsCanceled}, new=${newIsCanceled}, isCancellation=${isCancellation}`);

    // Check if there are meaningful changes for update emails.
    // Only client-facing start/end/staff changes warrant an email.
    // notes/staff_notes are internal-only. Canonical window is naive start/end.
    const hasMeaningfulChanges = old_record && (
      old_record.start !== record.start ||
      old_record.end !== record.end ||
      old_record.staff_id !== record.staff_id ||
      old_record.location_id !== record.location_id
    );

    if (old_record) {
      console.log("=== Change Detection ===");
      console.log("start changed:", old_record.start !== record.start, `(${old_record.start} → ${record.start})`);
      console.log("end changed:", old_record.end !== record.end, `(${old_record.end} → ${record.end})`);
      console.log("staff_id changed:", old_record.staff_id !== record.staff_id, `(${old_record.staff_id} → ${record.staff_id})`);
      console.log("location_id changed:", old_record.location_id !== record.location_id, `(${old_record.location_id} → ${record.location_id})`);
      console.log("hasMeaningfulChanges:", hasMeaningfulChanges);
      console.log("========================");
    }

    // Skip update emails for appointments that already happened - editing a past
    // appointment's record (e.g. correcting notes after the fact)
    // shouldn't notify the client or staff as if something is changing going forward.
    const appointmentEnded = new Date(record.end ?? record.start) < new Date();
    if (!isCancellation && appointmentEnded) {
      console.log("Skipping: appointment has already ended, not sending update email");
      return new Response(JSON.stringify({
        success: true,
        message: "Skipping email - appointment is in the past",
        appointmentId: appointment.id
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }

    // If not a cancellation, it's a regular update (only if there are meaningful changes)
    const isUpdate = !isCancellation && hasMeaningfulChanges;
    console.log(`Update check: isCancellation=${isCancellation}, hasMeaningfulChanges=${hasMeaningfulChanges}, isUpdate=${isUpdate}`);

    // If no relevant change detected, skip
    if (!isCancellation && !isUpdate) {
      console.log("No relevant change detected - skipping email");
      return new Response(JSON.stringify({
        success: true,
        message: "No relevant change detected for email sending",
        appointmentId: appointment.id
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }

    // Check if email was already sent (for cancellation)
    if (isCancellation && appointment.cancellation_email_sent === true) {
      return new Response(JSON.stringify({
        success: true,
        message: "Cancellation email already sent for this appointment",
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
    const { data: client, error: clientError } = await supabaseAdmin
      .from("client")
      .select("*")
      .eq("id", appointment.client_id)
      .single();

    if (clientError) throw new Error(`Error fetching client: ${clientError.message}`);
    if (!client) throw new Error(`Client with ID ${appointment.client_id} not found`);
    if (!client.email) {
      console.log("Client has no email on file, skipping email");
      return new Response(JSON.stringify({
        success: true,
        message: "Client has no email address, email not sent",
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
    const { data: company, error: companyError } = await supabaseAdmin
      .from("company")
      .select("*")
      .eq("id", appointment.company_id)
      .single();

    if (companyError) throw new Error(`Error fetching company: ${companyError.message}`);
    if (!company) throw new Error(`Company with ID ${appointment.company_id} not found`);
    const place = await fetchNotificationPlace(company, appointment.location_id);

    // Fetch staff data
    const { data: staff, error: staffError } = await supabaseAdmin
      .from("staff")
      .select("*")
      .eq("id", appointment.staff_id)
      .single();

    if (staffError) throw new Error(`Error fetching staff: ${staffError.message}`);
    if (!staff) throw new Error(`Staff with ID ${appointment.staff_id} not found`);

    // Segments only. No appointment_treatment / treatment_id fallback.
    const fetched = await fetchAppointmentServicesForEmail(appointment.id);
    const treatments: Array<{ treatment: string; priceOption: string | null }> = fetched.map((t) => ({
      treatment: t.serviceName,
      priceOption: t.serviceVariantName,
    }));
    console.log("Services fetched:", treatments);

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
      cancelReason: appointment.cancel_reason || "",
      canceledBy: appointment.canceled_by || "",
      cancelLink: `https://salonify.co/nl/cancel-appointment/${company.id}/${client.id}`,
      appointmentNotes: appointment.notes
    };

    console.log("Email data prepared");
    console.log(`Processing ${isCancellation ? 'cancellation' : 'update'} email`);

    // Generate email content based on type
    let clientText: string;
    let staffText: string;
    let clientHtml: string;
    let staffHtml: string;
    let clientSubject: string;
    let staffSubject: string;

    if (isCancellation) {
      // Cancellation emails
      clientText = createCancellationEmailText(emailData);
      staffText = createStaffCancellationEmailText(emailData);
      clientHtml = createSimpleHtmlCancellationEmail(emailData, false);
      staffHtml = createSimpleHtmlCancellationEmail(emailData, true);
      clientSubject = `Afspraak geannuleerd - ${company.name}`;
      staffSubject = `Afspraak geannuleerd: ${customerName}`;
    } else {
      // Update emails
      clientText = createUpdateEmailText(emailData);
      staffText = createStaffUpdateEmailText(emailData);
      clientHtml = createSimpleHtmlUpdateEmail(emailData, false);
      staffHtml = createSimpleHtmlUpdateEmail(emailData, true);
      clientSubject = `Afspraak bijgewerkt - ${company.name}`;
      staffSubject = `Afspraak bijgewerkt: ${customerName}`;
    }

    console.log("Email content generated");

    // Send email to client
    try {
      const clientEmailResult = await sendEmail({
        from: `${company.name} <afspraken@notifications.salonify.co>`,
        to: [client.email],
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
            to: [place.email],
            subject: staffSubject,
            text: staffText,
            html: staffHtml
          });
          console.log("Staff email sent successfully:", staffEmailResult);
        } catch (staffEmailError) {
          console.error("Staff email failed:", staffEmailError);
        }
      }

      // Update appointment to mark email as sent (if field exists)
      try {
        const updateData: any = {};
        if (isCancellation) {
          updateData.cancellation_email_sent = true;
        } else {
          updateData.update_email_sent = true;
        }

        const { error: updateError } = await supabaseAdmin
          .from("appointment")
          .update(updateData)
          .eq("id", appointment.id);

        if (updateError) {
          // Field might not exist yet, log but don't fail
          console.warn(`Could not update ${isCancellation ? 'cancellation' : 'update'}_email_sent field (may not exist in schema):`, updateError);
        }
      } catch (updateErr) {
        // Silently handle if field doesn't exist
        console.warn(`Could not update ${isCancellation ? 'cancellation' : 'update'}_email_sent field:`, updateErr);
      }

      return new Response(JSON.stringify({
        success: true,
        message: `${isCancellation ? 'Cancellation' : 'Update'} emails sent successfully`,
        clientEmailId: clientEmailResult.id,
        appointmentId: appointment.id,
        treatmentsCount: treatments.length,
        emailType: isCancellation ? 'cancellation' : 'update'
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      });
    } catch (emailError: any) {
      console.error("Error sending emails:", emailError);
      throw new Error(`Failed to send emails: ${emailError.message}`);
    }
  } catch (error: any) {
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
