import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createSupabaseClient } from "@/shared/supabase";
import {
  errorResponse,
  fetchTimetreeIntegration,
  jsonResponse,
  timetreeRequest,
} from "@/shared/timetree";

const LOG_SCOPE = "sync-delete";

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const record = payload.record ?? payload;
    const oldRecord = payload.old_record ?? null;

    console.log(`[timetree-${LOG_SCOPE}] updated row`, record);

    if (record.is_canceled !== true) {
      return jsonResponse({
        success: true,
        skipped: true,
        reason: "Appointment is not canceled",
      });
    }

    const wasAlreadyCanceled = oldRecord?.is_canceled === true;
    if (wasAlreadyCanceled) {
      return jsonResponse({
        success: true,
        skipped: true,
        reason: "Appointment was already canceled",
      });
    }

    const externalReferenceId = record.external_reference_id ?? null;
    const companyId = record.company_id ?? null;

    if (!externalReferenceId) {
      return jsonResponse({
        success: true,
        skipped: true,
        reason: "No external_reference_id — nothing to delete in TimeTree",
      });
    }

    if (!companyId) {
      return jsonResponse({ error: "Missing company_id on canceled appointment" }, 400);
    }

    const supabase = createSupabaseClient();
    const { calendar_id: calendarId } = await fetchTimetreeIntegration(
      supabase,
      String(companyId),
      LOG_SCOPE,
    );

    console.log(`[timetree-${LOG_SCOPE}] calendar_id`, calendarId);

    const { ok, status, body } = await timetreeRequest(LOG_SCOPE, {
      method: "DELETE",
      calendarId,
      eventId: String(externalReferenceId),
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
