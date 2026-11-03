import { Flow } from "@pgflow/dsl";
import { sendAppointmentUpdate, type AppointmentUpdateKind } from "../../functions/_shared/appointment/notifications/send-update.ts";

type Input = { appointmentId: string; kind: AppointmentUpdateKind };

export const AppointmentUpdated = new Flow<Input>({
  slug: "appointment_updated",
})
  .step(
    { slug: "sendEmails", maxAttempts: 5, baseDelay: 2 },
    async (input, ctx) => {
      const result = await sendAppointmentUpdate(
        input.appointmentId,
        input.kind,
        ctx.stepTask.run_id,
      );
      return { sent: result.sent, skipped: result.skipped, kind: result.kind };
    },
  );
