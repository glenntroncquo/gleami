import { Flow } from "@pgflow/dsl";
import { sendAppointmentConfirmation } from "../../functions/_shared/appointment/notifications/send-confirmation.ts";

type Input = { appointmentId: string };

export const AppointmentCreated = new Flow<Input>({
  slug: "appointment_created",
})
  .step(
    { slug: "sendEmails", maxAttempts: 5, baseDelay: 2 },
    async (input) => {
      const result = await sendAppointmentConfirmation(input.appointmentId);
      return { sent: result.sent, skipped: result.skipped };
    },
  );
