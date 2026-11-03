import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { assertInternalSecret } from "@/shared/internal-secret";
import { UnauthenticatedError } from "@/shared/errors";
import {
  sendAppointmentUpdate,
  type AppointmentUpdateKind,
} from "../_shared/appointment/notifications/send-update.ts";

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

type AppointmentSnapshot = {
  id?: string;
  start?: string;
  end?: string;
  staff_id?: string;
  location_id?: string | null;
  is_canceled?: boolean;
  reminder_sent?: boolean;
  cancellation_email_sent?: boolean;
};

function updateKind(oldRecord: AppointmentSnapshot | undefined, record: AppointmentSnapshot): AppointmentUpdateKind | null {
  const oldIsCanceled = oldRecord?.is_canceled === true;
  const newIsCanceled = record.is_canceled === true;
  const reminderJustSent = oldRecord?.reminder_sent !== true && record.reminder_sent === true;
  if (reminderJustSent) return null;

  const isCancellation = !oldIsCanceled && newIsCanceled;
  if (isCancellation) {
    if (record.cancellation_email_sent === true) return null;
    return "cancellation";
  }

  const appointmentEnded = new Date(record.end ?? record.start ?? 0) < new Date();
  if (appointmentEnded) return null;

  const hasMeaningfulChanges = oldRecord != null && (
    oldRecord.start !== record.start ||
    oldRecord.end !== record.end ||
    oldRecord.staff_id !== record.staff_id ||
    oldRecord.location_id !== record.location_id
  );
  return hasMeaningfulChanges ? "update" : null;
}

serve(async (req) => {
  try {
    assertInternalSecret(req);
    const webhookPayload = await req.json();
    const record = webhookPayload?.record as AppointmentSnapshot | undefined;
    const oldRecord = webhookPayload?.old_record as AppointmentSnapshot | undefined;
    if (!record?.id || typeof record.id !== "string") {
      throw new Error("No appointment record found in request");
    }

    const kind = updateKind(oldRecord, record);
    if (!kind) {
      return json({
        success: true,
        message: "No relevant change detected for email sending",
        appointmentId: record.id,
      }, 200);
    }

    const result = await sendAppointmentUpdate(record.id, kind, `manual:${record.id}:${kind}`);
    if (result.skipped === "no_email") {
      return json({
        success: true,
        message: "Client has no email address, email not sent",
        skipped: true,
        appointmentId: record.id,
      }, 200);
    }

    return json({
      success: true,
      message: `${kind === "cancellation" ? "Cancellation" : "Update"} emails sent successfully`,
      clientEmailId: result.clientEmailId,
      appointmentId: record.id,
      emailType: kind,
    }, 200);
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return json({ success: false, error: "Unauthorized" }, 401);
    }
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error processing appointment emails:", error);
    return json({ success: false, error: message, timestamp: new Date().toISOString() }, 500);
  }
});
