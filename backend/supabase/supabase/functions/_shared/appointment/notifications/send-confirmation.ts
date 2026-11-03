import { supabaseAdmin } from "../../infrastructure/supabase/client.ts";
import { formatDate, formatTime } from "../../notifications/format-date.ts";
import { sendEmail, transactionalFrom } from "../../infrastructure/email/resend.ts";
import { fetchAppointmentServicesForEmail } from "./fetch-services.ts";
import { fetchNotificationPlace, placeToEmailAddress, staffNotificationRecipients } from "./place-fetch.ts";
import { appointmentCancelUrl, issueAppointmentAccessToken } from "../access-token.ts";

type AppointmentRow = {
  id: string;
  start: string;
  end: string;
  client_id: string;
  company_id: string;
  staff_id: string;
  location_id: string | null;
  notes: string | null;
};

export type SendAppointmentConfirmationResult = {
  sent: boolean;
  skipped: "past" | "no_email" | null;
  clientEmailId?: string;
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

function createConfirmationEmailText(data: EmailData) {
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

function staffEmailHeading(isNewClient: boolean) {
  return isNewClient ? "Nieuwe klant" : "Nieuwe afspraak";
}

function createStaffEmailText(data: EmailData) {
  const {
    appointmentStart,
    appointmentEnd,
    staffName,
    treatmentsList,
    customerName,
    customerEmail,
    customerPhone,
    appointmentNotes,
    companyName,
    isNewClient,
  } = data;
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
  isNewClient: boolean;
};

function createSimpleHtmlEmail(data: EmailData, isStaff = false) {
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
    isNewClient,
  } = data;
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

${appointmentNotes ? `<h3>Notities:</h3><p>${appointmentNotes.replace(/\n/g, "<br>")}</p>` : ""}

<p>Met vriendelijke groet,<br>${companyName}</p>

</body>
</html>`;
  }
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

function isBeforeToday(appointmentStart: string) {
  const start = new Date(appointmentStart);
  const now = new Date();
  const appointmentDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return appointmentDate < currentDate;
}

/**
 * Sends the client confirmation and the salon/staff notice.
 * Skip cases return normally. A send failure throws so the queue can retry.
 * Idempotency keys make a retry of a send that already reached Resend a no-op.
 */
export async function sendAppointmentConfirmation(
  appointmentId: string,
): Promise<SendAppointmentConfirmationResult> {
  const { data: appointment, error: appointmentError } = await supabaseAdmin
    .from("appointment")
    .select("id, start, end, client_id, company_id, staff_id, location_id, notes")
    .eq("id", appointmentId)
    .single();

  if (appointmentError || !appointment) {
    throw new Error(`Appointment ${appointmentId} not found`);
  }

  const row = appointment as AppointmentRow;
  if (isBeforeToday(row.start)) {
    return { sent: false, skipped: "past" };
  }

  const { data: client, error: clientError } = await supabaseAdmin
    .from("client")
    .select("*")
    .eq("id", row.client_id)
    .single();
  if (clientError) throw new Error(`Error fetching client: ${clientError.message}`);
  if (!client) throw new Error(`Client with ID ${row.client_id} not found`);
  if (!client.email) {
    return { sent: false, skipped: "no_email" };
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
  const { count: priorAppointmentCount, error: priorAppointmentError } = await supabaseAdmin
    .from("appointment")
    .select("id", { count: "exact", head: true })
    .eq("client_id", row.client_id)
    .eq("company_id", row.company_id)
    .eq("is_canceled", false)
    .neq("id", row.id);
  if (priorAppointmentError) {
    throw new Error(`Error checking prior appointments: ${priorAppointmentError.message}`);
  }

  const isNewClient = (priorAppointmentCount ?? 0) === 0;
  const manageToken = await issueAppointmentAccessToken(supabaseAdmin, row.id);
  const staffName = `${staff.first_name || ""} ${staff.last_name || ""}`.trim();
  const customerName = `${client.first_name || ""} ${client.last_name || ""}`.trim();
  const emailData: EmailData = {
    customerName,
    customerEmail: client.email,
    customerPhone: client.phone || "",
    companyName: company.name,
    ...placeToEmailAddress(place),
    appointmentStart: row.start,
    appointmentEnd: row.end,
    staffName,
    treatmentsList: formatTreatmentsList(treatments),
    appointmentNotes: row.notes,
    cancelLink: appointmentCancelUrl(row.id, manageToken),
    isNewClient,
  };

  const clientSubject = `Afspraak bevestigd - ${company.name}`;
  const staffSubject = `${staffEmailHeading(isNewClient)}: ${customerName}`;
  const clientEmailResult = await sendEmail({
    from: transactionalFrom(company.name),
    to: [client.email],
    subject: clientSubject,
    text: createConfirmationEmailText(emailData),
    html: createSimpleHtmlEmail(emailData, false),
    idempotencyKey: `appointment-confirmation:${row.id}:client`,
  });

  const staffRecipients = staffNotificationRecipients(place.email, staff.email);
  for (const recipient of staffRecipients) {
    await sendEmail({
      from: transactionalFrom(company.name),
      to: [recipient],
      subject: staffSubject,
      text: createStaffEmailText(emailData),
      html: createSimpleHtmlEmail(emailData, true),
      idempotencyKey: `appointment-confirmation:${row.id}:staff:${recipient.toLowerCase()}`,
    });
  }

  return { sent: true, skipped: null, clientEmailId: clientEmailResult.id };
}
