import { format } from "date-fns";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { Appointment } from "./types";

interface AppointmentGridProps {
  appointments: Appointment[];
  selectedAppointmentIds: string[];
  onAppointmentToggle: (appointmentId: string) => void;
}

export function AppointmentGrid({
  appointments,
  selectedAppointmentIds,
  onAppointmentToggle,
}: AppointmentGridProps) {
  const t = useTranslations();

  if (appointments.length === 0) {
    return (
      <div className="text-center text-gray-500 py-12">
        <div className="text-4xl sm:text-6xl mb-4">📅</div>
        <p className="text-base sm:text-lg">
          {t("pos.appointments.noAppointmentsToday")}
        </p>
        <p className="text-sm">{t("pos.appointments.createToLink")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">
          {t("pos.appointments.todaysAppointments")}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t("pos.appointments.selectToLink")}
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {appointments.map((appointment) => (
          <div
            key={appointment.id}
            className={cn(
              "bg-white rounded-lg shadow-sm border p-4 cursor-pointer transition-all hover:shadow-md",
              selectedAppointmentIds.includes(appointment.id)
                ? "border-primary border-2 bg-primary/5"
                : "hover:border-primary/50"
            )}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAppointmentToggle(appointment.id);
            }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="text-2xl">👤</div>
                  <div>
                    <h4 className="font-semibold text-base">
                      {appointment.client?.first_name}{" "}
                      {appointment.client?.last_name}
                    </h4>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  <div className="flex items-center gap-1 mb-1">
                    <span>🕐</span>
                    <span>
                      {format(new Date(appointment.start), "HH:mm")} -{" "}
                      {format(new Date(appointment.end), "HH:mm")}
                    </span>
                  </div>
                </div>
              </div>
              {selectedAppointmentIds.includes(appointment.id) && (
                <div className="ml-2">
                  <div className="bg-primary text-primary-foreground rounded-full p-1">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
