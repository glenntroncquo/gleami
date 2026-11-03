import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { assertInternalSecret } from "@/shared/internal-secret";
import { UnauthenticatedError } from "@/shared/errors";
import { sendAppointmentConfirmation } from "../_shared/appointment/notifications/send-confirmation.ts";

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  try {
    assertInternalSecret(req);
    const webhookPayload = await req.json();
    const record = webhookPayload?.record;
    if (!record?.id || typeof record.id !== "string") {
      throw new Error("No appointment record found in request");
    }

    const result = await sendAppointmentConfirmation(record.id);
    if (result.skipped === "past") {
      return json({
        success: true,
        message: "Appointment is before today, confirmation email not sent",
        skipped: true,
        appointmentId: record.id,
      }, 200);
    }
    if (result.skipped === "no_email") {
      return json({
        success: true,
        message: "Client has no email address, confirmation email not sent",
        skipped: true,
        appointmentId: record.id,
      }, 200);
    }

    return json({
      success: true,
      message: "Confirmation emails sent successfully",
      clientEmailId: result.clientEmailId,
      appointmentId: record.id,
    }, 200);
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return json({ success: false, error: "Unauthorized" }, 401);
    }
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error processing appointment emails:", error);
    return json({
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
    }, 500);
  }
});
