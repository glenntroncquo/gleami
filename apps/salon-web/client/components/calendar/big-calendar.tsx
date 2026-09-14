"use client";

import { useState, useMemo, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useCalendarContext } from "@/components/event-calendar/calendar-context";
import { toast } from "sonner";
import { fetchAppointments as fetchAppointmentsFromDB } from "@/lib/api/calendar/queries/fetch-appointments";
import { moveStaffAppointment } from "@/lib/api/calendar/mutations/move-staff-appointment";
import { EventCalendar, type CalendarEvent } from "@/components/event-calendar";
import { transformAppointmentToEvents } from "@/lib/api/calendar/transform-appointment";
import { useLocationId } from "@/lib/company-util";

export default function Component() {
  const t = useTranslations();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const { isStaffVisible } = useCalendarContext();
  const locationId = useLocationId();

  // Fetch appointments from Supabase
  const fetchAppointments = async () => {
    try {
      const { data, error } = await fetchAppointmentsFromDB(locationId);

      if (error) {
        console.error("Error fetching appointments:", error);
        toast.error("Failed to load appointments");
        setEvents([]);
      } else {
        // Transform appointments to calendar events
        console.log("data", data);
        const calendarEvents = data?.flatMap((apt) =>
          transformAppointmentToEvents(apt, t)
        );
        console.log("calendarEvents", calendarEvents);
        setEvents(calendarEvents || []);
      }
    } catch (err) {
      console.error("Error fetching appointments:", err);
      toast.error("Failed to load appointments");
      setEvents([]);
    }
  };

  useEffect(() => {
    fetchAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId]);

  // Filter events based on staff visibility
  const visibleEvents = useMemo(() => {
    return events.filter((event) => {
      // Check if the event's staff is visible
      return isStaffVisible(event.staff?.id);
    });
  }, [events, isStaffVisible]);

  const handleEventAdd = async (event: CalendarEvent) => {
    // For now, just add to local state - in a real app you'd want to save to Supabase
    // TODO: Implement appointment creation in Supabase
    setEvents([...events, event]);
  };

  const handleEventUpdate = async (updatedEvent: CalendarEvent) => {
    const previous = events.find((event) => event.id === updatedEvent.id);
    const appointmentId = updatedEvent.appointmentId;
    const deltaMs = previous
      ? updatedEvent.start.getTime() - previous.start.getTime()
      : 0;

    if (!appointmentId || !previous || deltaMs === 0) {
      setEvents(
        events.map((event) =>
          event.id === updatedEvent.id ? updatedEvent : event,
        ),
      );
      return;
    }

    const previousEvents = events;
    setEvents(
      events.map((event) => {
        if (event.appointmentId !== appointmentId) return event;
        if (event.id === updatedEvent.id) {
          return {
            ...updatedEvent,
            visitStart: event.visitStart
              ? new Date(event.visitStart.getTime() + deltaMs)
              : event.visitStart,
            visitEnd: event.visitEnd
              ? new Date(event.visitEnd.getTime() + deltaMs)
              : event.visitEnd,
          };
        }
        return {
          ...event,
          start: new Date(event.start.getTime() + deltaMs),
          end: new Date(event.end.getTime() + deltaMs),
          visitStart: event.visitStart
            ? new Date(event.visitStart.getTime() + deltaMs)
            : event.visitStart,
          visitEnd: event.visitEnd
            ? new Date(event.visitEnd.getTime() + deltaMs)
            : event.visitEnd,
        };
      }),
    );

    const { error } = await moveStaffAppointment({
      appointmentId,
      locationId: updatedEvent.locationId || locationId,
      deltaMs,
    });

    if (error) {
      console.error("Error moving appointment:", error);
      setEvents(previousEvents);
      toast.error("Failed to move appointment");
      return;
    }

    await fetchAppointments();
  };

  const handleEventDelete = async (eventId: string) => {
    setEvents(
      events.filter(
        (event) => event.id !== eventId && event.appointmentId !== eventId,
      ),
    );
  };

  // Don't return early - let the calendar render with loading state

  return (
    <div className="space-y-4">
      <EventCalendar
        events={visibleEvents}
        onEventAdd={handleEventAdd}
        onEventUpdate={handleEventUpdate}
        onEventDelete={handleEventDelete}
        initialView="week"
        loading={false}
        onRefresh={fetchAppointments}
      />
    </div>
  );
}
