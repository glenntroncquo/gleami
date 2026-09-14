import { format } from "date-fns";
import type { Appointment } from "./types";

interface SelectedAppointmentsProps {
  selectedAppointmentIds: string[];
  appointments: Appointment[];
}

export function SelectedAppointments({
  selectedAppointmentIds,
  appointments,
}: SelectedAppointmentsProps) {
  if (selectedAppointmentIds.length === 0) {
    return null;
  }

  return (
    <div className="p-2 bg-blue-50 border border-blue-200 rounded-md">
      <div className="text-xs text-blue-600 font-medium mb-1">
        Linked to Appointment{selectedAppointmentIds.length > 1 ? "s" : ""}:
      </div>
      <div className="space-y-1">
        {selectedAppointmentIds.map((appointmentId) => {
          const appointment = appointments.find(
            (apt) => apt.id === appointmentId
          );
          if (!appointment) return null;
          return (
            <div key={appointmentId} className="text-sm text-blue-900">
              {appointment.client?.first_name} {appointment.client?.last_name}
              {appointment.start
                ? ` - ${format(new Date(appointment.start), "HH:mm")}`
                : ""}
            </div>
          );
        })}
      </div>
    </div>
  );
}



