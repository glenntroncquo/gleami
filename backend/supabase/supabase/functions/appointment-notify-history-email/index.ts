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
import { appointmentCancelUrl, issueAppointmentAccessToken } from "@/shared/appointment-access-token";
import { escapeHtml, sanitizeDisplayName } from "@/shared/escape-html";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};
// Format treatments list for display
function formatTreatmentsList(treatments) {
  return treatments.map((t)=>{
    let display = escapeHtml(t.serviceName);
    if (t.serviceVariantName) {
      display += ` - ${escapeHtml(t.serviceVariantName)}`;
    }
    return display;
  }).join("<br>");
}
// Email template for appointments overview
function createAppointmentsEmail(data) {
  const { customerName, companyName, appointments } = data;
  const safeCustomerName = escapeHtml(customerName);
  const safeCompanyName = escapeHtml(companyName);
  const appointmentRows = appointments.map((appointment)=>{
    const startDate = new Date(appointment.start);
    const endDate = new Date(appointment.end);
    const treatmentsList = formatTreatmentsList(appointment.treatments);
    return `
            <tr>
              <td style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 15px; display: block; width: 100%; box-sizing: border-box;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  ${appointment.companyName ? `<tr>
                    <td style="padding-bottom: 8px;">
                      <strong style="color: #E91E63;">Salon:</strong> ${escapeHtml(appointment.companyName)}
                    </td>
                  </tr>` : ""}
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
                      <strong style="color: #E91E63;">Medewerker:</strong> ${escapeHtml(appointment.staff?.first_name ?? "")} ${escapeHtml(appointment.staff?.last_name ?? "")}
                    </td>
                  </tr>
                  ${appointment.locationAddress ? `<tr>
                    <td style="padding-bottom: 8px;">
                      <strong style="color: #E91E63;">Locatie:</strong> ${escapeHtml(appointment.locationAddress)}
                    </td>
                  </tr>` : ""}
                  <tr>
                    <td style="padding-bottom: 8px;">
                      <strong style="color: #E91E63;">Status:</strong> ${escapeHtml(appointment.status || 'Bevestigd')}
                    </td>
                  </tr>
                  ${appointment.notes ? `<tr>
                    <td>
                      <strong style="color: #E91E63;">Notities:</strong> ${escapeHtml(appointment.notes)}
                    </td>
                  </tr>` : ""}
                  ${appointment.cancelLink ? `<tr>
                    <td style="padding-top: 12px;">
                      <a href="${appointment.cancelLink}" style="display: inline-block; background-color: #dc3545; color: #ffffff; text-decoration: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; font-size: 13px;">Afspraak annuleren</a>
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
              <p style="margin: 0 0 15px 0; font-size: 16px;">Beste ${safeCustomerName},</p>
              <p style="margin: 0 0 20px 0; font-size: 16px;">Hieronder vindt u een overzicht van uw afspraken${companyName ? ` bij <strong>${safeCompanyName}</strong>` : ""}.</p>
              <p style="margin: 0 0 20px 0; font-size: 14px; color: #666;">Totaal aantal afspraken: <strong>${appointments.length}</strong></p>
            </td>
          </tr>
          ${appointmentRows}
          <tr>
            <td style="padding: 20px 0; text-align: center;">
              <p style="margin: 0; font-size: 14px; color: #666;">Een afspraak annuleren kan via de knop bij de betreffende afspraak hierboven.</p>
            </td>
          </tr>
          <tr>
            <td style="padding-top: 20px; border-top: 1px solid #e9ecef;">
              <p style="margin: 0; font-size: 14px;">Met vriendelijke groet,<br><strong>${safeCompanyName || "Salonify"}</strong></p>
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
    // Uniform success response regardless of what we find: this endpoint must
    // not reveal whether an email address has bookings at a company (C3
    // enumeration oracle). No client id, company id, or counts leave the
    // function.
    const uniformSuccess = () =>
      new Response(JSON.stringify({
        success: true,
        message: "If appointments exist for this email address, a summary is on its way."
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      });
    // Get the request data. `companyId` is optional since 2026-09-29: without
    // it ("recovery mode", e.g. the manage-booking page's "email me my
    // appointments" form) we send the client's upcoming appointments across
    // salons. The result only ever goes to the mailbox owner, and the
    // response stays uniform, so no cross-tenant information leaks.
    const requestData = await req.json();
    const email = String(requestData?.email ?? "").trim().toLowerCase();
    const companyId = requestData?.companyId ? String(requestData.companyId) : null;
    if (!email || !email.includes("@")) {
      return uniformSuccess();
    }
    // Rate-limit silently: the uniform 200 defeats enumeration, the limiter
    // defeats inbox spamming. 3/hour per address, 10/hour per source IP.
    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
    const [emailLimit, ipLimit] = await Promise.all([
      supabaseAdmin.rpc("check_rate_limit", {
        p_key: `history-email:email:${email}`,
        p_limit: 3,
        p_window_seconds: 3600,
      }),
      supabaseAdmin.rpc("check_rate_limit", {
        p_key: `history-email:ip:${ip}`,
        p_limit: 10,
        p_window_seconds: 3600,
      }),
    ]);
    if (emailLimit.data === false || ipLimit.data === false) {
      console.log("history email skipped: rate limited");
      return uniformSuccess();
    }
    // Fetch client by email
    const { data: client, error: clientError } = await supabaseAdmin.from("client").select("*").eq("email", email).maybeSingle();
    if (clientError) {
      throw new Error("Error fetching client");
    }
    if (!client) {
      return uniformSuccess();
    }
    console.log("Found client:", client.id);
    // Fetch the company when the caller scoped the request to one salon.
    let company = null;
    if (companyId) {
      const { data: companyRow, error: companyError } = await supabaseAdmin.from("company").select("*").eq("id", companyId).maybeSingle();
      if (companyError) throw new Error(`Error fetching company: ${companyError.message}`);
      if (!companyRow) {
        return uniformSuccess();
      }
      company = companyRow;
      console.log("Found company:", company.name);
    }
    // Fetch appointments for this client. start/end only — leftover actual_* columns are ignored.
    let appointmentsQuery = supabaseAdmin.from("appointment").select(`
    id,
    start,
    end,
    notes,
    status,
    is_canceled,
    location_id,
    company_id,
    staff (
      first_name,
      last_name
    )
  `).eq("client_id", client.id)
    .order("start", {
      ascending: true
    });
    if (companyId) {
      appointmentsQuery = appointmentsQuery.eq("company_id", companyId);
    } else {
      // Recovery mode: upcoming, not canceled, capped.
      appointmentsQuery = appointmentsQuery
        .eq("is_canceled", false)
        .gte("start", new Date().toISOString())
        .limit(20);
    }
    const { data: appointments, error: appointmentsError } = await appointmentsQuery;
    if (appointmentsError) {
      throw new Error(`Error fetching appointments: ${appointmentsError.message}`);
    }
    if (!appointments || appointments.length === 0) {
      return uniformSuccess();
    }
    console.log(`Found ${appointments.length} appointments`);
    // Resolve every involved company (recovery mode can span salons).
    const companiesById = new Map<string, any>();
    if (company) companiesById.set(company.id, company);
    const missingCompanyIds = [
      ...new Set(appointments.map((a) => a.company_id).filter((id): id is string => Boolean(id))),
    ].filter((id) => !companiesById.has(id));
    if (missingCompanyIds.length > 0) {
      const { data: companies, error: companiesError } = await supabaseAdmin
        .from("company")
        .select("id, name, street, city, postal_code, country, email")
        .in("id", missingCompanyIds);
      if (companiesError) throw new Error(`Error fetching companies: ${companiesError.message}`);
      for (const row of companies ?? []) companiesById.set(row.id, row);
    }
    // Resolve places per company so each location falls back to its own salon.
    const placesByLocationId = new Map<string, ReturnType<typeof resolveNotificationPlace>>();
    const locationIdsByCompany = new Map<string, string[]>();
    for (const appointment of appointments) {
      if (!appointment.location_id || !appointment.company_id) continue;
      const list = locationIdsByCompany.get(appointment.company_id) ?? [];
      list.push(appointment.location_id);
      locationIdsByCompany.set(appointment.company_id, list);
    }
    for (const [cid, locationIds] of locationIdsByCompany) {
      const partial = await fetchNotificationPlacesByIds(companiesById.get(cid) ?? {}, locationIds);
      for (const [key, value] of partial) placesByLocationId.set(key, value);
    }
    const formatLocationAddress = (locationId: string | null, cid: string | null) => {
      const companyContact = (cid && companiesById.get(cid)) || {};
      const place = (locationId && placesByLocationId.get(locationId)) ||
        resolveNotificationPlace(companyContact, null);
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
      // Per-appointment manage link: a fresh token that manages exactly this
      // booking, only while it is still upcoming and not canceled.
      const isUpcoming = !appointment.is_canceled && new Date(appointment.start).getTime() > Date.now();
      const manageToken = isUpcoming
        ? await issueAppointmentAccessToken(supabaseAdmin, appointment.id)
        : null;
      appointmentsWithTreatments.push({
        ...appointment,
        treatments,
        locationAddress: formatLocationAddress(appointment.location_id, appointment.company_id),
        // Per-appointment salon label only makes sense in recovery mode; in
        // single-company mode the header already names the salon.
        companyName: companyId ? null : companiesById.get(appointment.company_id)?.name ?? null,
        cancelLink: manageToken ? appointmentCancelUrl(appointment.id, manageToken) : null,
      });
    }
    console.log("Fetched treatments for all appointments");
    // Prepare email data
    const customerName = `${client.first_name || ""} ${client.last_name || ""}`.trim();
    const emailData = {
      customerName,
      companyName: company?.name ?? "",
      appointments: appointmentsWithTreatments
    };
    // Generate HTML content
    const htmlContent = createAppointmentsEmail(emailData);
    const subject = company ? `Uw afspraken bij ${sanitizeDisplayName(company.name)}` : "Uw afspraken";
    console.log("Sending email...");
    // Send email via Resend
    const emailResult = await sendEmail({
      from: `${company ? sanitizeDisplayName(company.name) : "Salonify"} <afspraken@notifications.salonify.co>`,
      to: [
        email
      ],
      subject: subject,
      html: htmlContent
    });
    console.log("Email sent successfully:", emailResult);
    return uniformSuccess();
  } catch (error) {
    console.error("Error processing appointments email:", error);
    return new Response(JSON.stringify({
      success: false,
      error: "Failed to process request"
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
});
