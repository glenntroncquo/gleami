import { supabaseAdmin } from "../../infrastructure/supabase/client.ts";
import { formatDate, formatTime } from "../../notifications/format-date.ts";
import { sendEmail, transactionalFrom } from "../../infrastructure/email/resend.ts";
import { fetchAppointmentServicesForEmail } from "./fetch-services.ts";
import { fetchNotificationPlace, placeToEmailAddress, staffNotificationRecipients } from "./place-fetch.ts";
import { appointmentCancelUrl, issueAppointmentAccessToken } from "../access-token.ts";

export type AppointmentUpdateKind = "update" | "cancellation";

export type SendAppointmentUpdateResult = {
  sent: boolean;
  skipped: "no_email" | null;
  kind: AppointmentUpdateKind;
  clientEmailId?: string;
};

type AppointmentRow = {
  id: string;
  start: string;
  end: string;
  client_id: string;
  company_id: string;
  staff_id: string;
  location_id: string | null;
  notes: string | null;
  cancel_reason: string | null;
  canceled_by: string | null;
};

type EmailData = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  companyName: string;
  companyStreet: string;
  companyCity: string;
  companyPostalCode: string;
  companyCountry: string;
  appointmentStart: string;
  appointmentEnd: string;
  staffName: string;
  treatmentsList: string;
  appointmentNotes: string | null;
  cancelLink: string;
  cancelReason: string;
  canceledBy: string;
};

function formatTreatmentsList(treatments: { serviceName: string; serviceVariantName: string | null }[]) {
  return treatments
    .map((treatment) =>
      treatment.serviceVariantName
        ? `${treatment.serviceName} - ${treatment.serviceVariantName}`
        : treatment.serviceName
    )
    .join(", ");
}

function createUpdateEmailText(data: EmailData) {
  const {
    customerName,
    companyName,
    appointmentStart,
    appointmentEnd,
    staffName,
    treatmentsList,
    companyStreet,
    companyCity,
    companyPostalCode,
    companyCountry,
    cancelLink,
  } = data;
  const startDate = new Date(appointmentStart);
  const endDate = new Date(appointmentEnd);
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

function createStaffUpdateEmailText(data: EmailData) {
  const {
    customerName,
    companyName,
    appointmentStart,
    appointmentEnd,
    staffName,
    treatmentsList,
    customerEmail,
    customerPhone,
    appointmentNotes,
  } = data;
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

function createCancellationEmailText(data: EmailData) {
  const {
    customerName,
    companyName,
    appointmentStart,
    appointmentEnd,
    staffName,
    treatmentsList,
    companyStreet,
    companyCity,
    companyPostalCode,
    companyCountry,
    cancelReason,
  } = data;
  const startDate = new Date(appointmentStart);
  const endDate = new Date(appointmentEnd);
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

function createStaffCancellationEmailText(data: EmailData) {
  const {
    customerName,
    companyName,
    appointmentStart,
    appointmentEnd,
    staffName,
    treatmentsList,
    customerEmail,
    customerPhone,
    cancelReason,
    canceledBy,
  } = data;
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

function createSimpleHtmlUpdateEmail(data: EmailData, isStaff = false) {
  const {
    customerName,
    companyName,
    appointmentStart,
    appointmentEnd,
    staffName,
    treatmentsList,
    companyStreet,
    companyCity,
    companyPostalCode,
    companyCountry,
    cancelLink,
    customerEmail,
    customerPhone,
    appointmentNotes,
  } = data;
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

${appointmentNotes ? `<h3>Notities:</h3><p>${appointmentNotes.replace(/\n/g, "<br>")}</p>` : ""}

<p>Met vriendelijke groet,<br>${companyName}</p>

</body>
</html>`;
  }
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

function createSimpleHtmlCancellationEmail(data: EmailData, isStaff = false) {
  const {
    customerName,
    companyName,
    appointmentStart,
    appointmentEnd,
    staffName,
    treatmentsList,
    companyStreet,
    companyCity,
    companyPostalCode,
    companyCountry,
    cancelReason,
    customerEmail,
    customerPhone,
    canceledBy,
  } = data;
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

${cancelReason ? `<h3>Reden van annulering:</h3><p>${cancelReason.replace(/\n/g, "<br>")}</p>` : ""}

<p>Met vriendelijke groet,<br>${companyName}</p>

</body>
</html>`;
  }
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

${cancelReason ? `<h3>Reden van annulering:</h3><p>${cancelReason.replace(/\n/g, "<br>")}</p>` : ""}

<p>Met vriendelijke groet,<br>${companyName}</p>

</body>
</html>`;
}

/**
 * Sends the client and salon/staff notice for a reschedule or cancellation.
 * The caller decides which kind applies. This does not update appointment:
 * that write would re-enter the update trigger. idempotencyScope must be
 * stable across retries of the same send and different for a later change.
 */
export async function sendAppointmentUpdate(
  appointmentId: string,
  kind: AppointmentUpdateKind,
  idempotencyScope: string,
): Promise<SendAppointmentUpdateResult> {
  if (kind !== "update" && kind !== "cancellation") {
    throw new Error(`Unknown appointment update kind: ${kind}`);
  }

  const { data: appointment, error: appointmentError } = await supabaseAdmin
    .from("appointment")
    .select("id, start, end, client_id, company_id, staff_id, location_id, notes, cancel_reason, canceled_by")
    .eq("id", appointmentId)
    .single();
  if (appointmentError || !appointment) {
    throw new Error(`Appointment ${appointmentId} not found`);
  }

  const row = appointment as AppointmentRow;
  const { data: client, error: clientError } = await supabaseAdmin
    .from("client")
    .select("*")
    .eq("id", row.client_id)
    .single();
  if (clientError) throw new Error(`Error fetching client: ${clientError.message}`);
  if (!client) throw new Error(`Client with ID ${row.client_id} not found`);
  if (!client.email) {
    return { sent: false, skipped: "no_email", kind };
  }

  const { data: company, error: companyError } = await supabaseAdmin
    .from("company")
    .select("*")
    .eq("id", row.company_id)
    .single();
  if (companyError) throw new Error(`Error fetching company: ${companyError.message}`);
  if (!company) throw new Error(`Company with ID ${row.company_id} not found`);

  const place = await fetchNotificationPlace(company, row.location_id);
  const { data: staff, error: staffError } = await supabaseAdmin
    .from("staff")
    .select("*")
    .eq("id", row.staff_id)
    .single();
  if (staffError) throw new Error(`Error fetching staff: ${staffError.message}`);
  if (!staff) throw new Error(`Staff with ID ${row.staff_id} not found`);

  const treatments = await fetchAppointmentServicesForEmail(row.id);
  const manageToken = await issueAppointmentAccessToken(supabaseAdmin, row.id);
  const emailData: EmailData = {
    customerName: `${client.first_name || ""} ${client.last_name || ""}`.trim(),
    customerEmail: client.email,
    customerPhone: client.phone || "",
    companyName: company.name,
    ...placeToEmailAddress(place),
    appointmentStart: row.start,
    appointmentEnd: row.end,
    staffName: `${staff.first_name || ""} ${staff.last_name || ""}`.trim(),
    treatmentsList: formatTreatmentsList(treatments),
    appointmentNotes: row.notes,
    cancelLink: appointmentCancelUrl(row.id, manageToken),
    cancelReason: row.cancel_reason || "",
    canceledBy: row.canceled_by || "",
  };

  const isCancellation = kind === "cancellation";
  const clientSubject = isCancellation
    ? `Afspraak geannuleerd - ${company.name}`
    : `Afspraak bijgewerkt - ${company.name}`;
  const staffSubject = isCancellation
    ? `Afspraak geannuleerd: ${emailData.customerName}`
    : `Afspraak bijgewerkt: ${emailData.customerName}`;

  const clientEmailResult = await sendEmail({
    from: transactionalFrom(company.name),
    to: [client.email],
    subject: clientSubject,
    text: isCancellation ? createCancellationEmailText(emailData) : createUpdateEmailText(emailData),
    html: isCancellation
      ? createSimpleHtmlCancellationEmail(emailData, false)
      : createSimpleHtmlUpdateEmail(emailData, false),
    idempotencyKey: `appointment-${kind}:${idempotencyScope}:client`,
  });

  const staffRecipients = staffNotificationRecipients(place.email, staff.email);
  for (const recipient of staffRecipients) {
    await sendEmail({
      from: transactionalFrom(company.name),
      to: [recipient],
      subject: staffSubject,
      text: isCancellation ? createStaffCancellationEmailText(emailData) : createStaffUpdateEmailText(emailData),
      html: isCancellation
        ? createSimpleHtmlCancellationEmail(emailData, true)
        : createSimpleHtmlUpdateEmail(emailData, true),
      idempotencyKey: `appointment-${kind}:${idempotencyScope}:staff:${recipient.toLowerCase()}`,
    });
  }

  return { sent: true, skipped: null, kind, clientEmailId: clientEmailResult.id };
}
