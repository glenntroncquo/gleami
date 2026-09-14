import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createSupabaseClient } from "@/shared/supabase";
import {
  buildCreateEventBody,
  buildEventTimes,
  errorResponse,
  extractTimetreeEventId,
  fetchAppointmentEventDetails,
  jsonResponse,
  timetreeRequest,
} from "@/shared/timetree";

const LOG_SCOPE = "sync-create";

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const record = payload.record ?? payload;

    console.log(`[timetree-${LOG_SCOPE}] inserted row`, record);

    const appointmentId = String(payload.id ?? record.id ?? "");
    const startRaw = payload.start ?? record.start;
    const endRaw = payload.end ?? record.end;

    if (!appointmentId || !startRaw || !endRaw) {
      return jsonResponse({ error: "Missing required fields" }, 400);
    }

    const details = await fetchAppointmentEventDetails(appointmentId, LOG_SCOPE);
    const { startAt, endAt } = buildEventTimes(String(startRaw), String(endRaw));
    const timetreeBody = buildCreateEventBody(details, startAt, endAt);

    const { ok, status, body } = await timetreeRequest(LOG_SCOPE, {
      method: "POST",
      calendarId: details.calendarId,
      body: timetreeBody,
    });

    if (!ok) {
      return jsonResponse({ timetree_status: status, timetree_response: body }, 500);
    }

    const timetreeEventId = extractTimetreeEventId(body);
    if (timetreeEventId) {
      const supabase = createSupabaseClient();
      const { error: updateError } = await supabase
        .from("appointment")
        .update({ external_reference_id: timetreeEventId })
        .eq("id", appointmentId);

      if (updateError) {
        throw new Error(
          `TimeTree event created but failed to save external_reference_id: ${updateError.message}`,
        );
      }
    }

    return jsonResponse({
      success: true,
      external_reference_id: timetreeEventId,
      timetree_response: body,
    });
  } catch (err) {
    return errorResponse(err, LOG_SCOPE);
  }
});
