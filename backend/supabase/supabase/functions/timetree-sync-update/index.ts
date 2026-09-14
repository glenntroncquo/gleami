import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  buildEventTimes,
  buildUpdateEventBody,
  errorResponse,
  fetchAppointmentEventDetails,
  jsonResponse,
  timetreeRequest,
} from "@/shared/timetree";

const LOG_SCOPE = "sync-update";

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const record = payload.record ?? payload;

    console.log(`[timetree-${LOG_SCOPE}] updated row`, record);

    if (record.is_canceled === true) {
      return jsonResponse({
        success: true,
        skipped: true,
        reason: "Appointment is canceled — handled by timetree-sync-delete",
      });
    }

    const appointmentId = String(payload.id ?? record.id ?? "");
    const startRaw = payload.start ?? record.start;
    const endRaw = payload.end ?? record.end;
    const externalReferenceId = record.external_reference_id ?? null;

    if (!appointmentId || !startRaw || !endRaw) {
      return jsonResponse({ error: "Missing required fields" }, 400);
    }

    if (!externalReferenceId) {
      return jsonResponse({
        error: "No external_reference_id on appointment — use timetree-sync-create first",
      }, 400);
    }

    const details = await fetchAppointmentEventDetails(appointmentId, LOG_SCOPE);
    const { startAt, endAt } = buildEventTimes(String(startRaw), String(endRaw));
    const timetreeBody = buildUpdateEventBody(startAt, endAt, details.alerts);

    const { ok, status, body } = await timetreeRequest(LOG_SCOPE, {
      method: "PUT",
      calendarId: details.calendarId,
      eventId: String(externalReferenceId),
      body: timetreeBody,
    });

    if (!ok) {
      return jsonResponse({ timetree_status: status, timetree_response: body }, 500);
    }

    return jsonResponse({
      success: true,
      external_reference_id: externalReferenceId,
      timetree_response: body,
    });
  } catch (err) {
    return errorResponse(err, LOG_SCOPE);
  }
});
