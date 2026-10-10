"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  addHours,
  eachHourOfInterval,
  format,
  isSameDay,
  startOfDay,
} from "date-fns";

import {
  EventItem,
  isMultiDayEvent,
  useCurrentTimeIndicator,
  type CalendarEvent,
} from "@/components/event-calendar";
import { StartHour, EndHour } from "@/components/event-calendar/constants";
import { useCalendarContext } from "@/components/event-calendar/calendar-context";
import { DayStaffColumn, DayStaffHeader } from "@/components/event-calendar/day-staff-column";
import { loadCalendarStaff, type Staff } from "@/components/participants";
import { useCompanyId, useLocationId } from "@/lib/company-util";
import { useAuth } from "@/providers/auth-provider";

interface DayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventSelect: (event: CalendarEvent) => void;
  onEventCreate: (startTime: Date) => void;
}

export function DayView({
  currentDate,
  events,
  onEventSelect,
  onEventCreate,
}: DayViewProps) {
  const { visibleStaff } = useCalendarContext();
  const hours = useMemo(() => {
    const dayStart = startOfDay(currentDate);
    return eachHourOfInterval({
      start: addHours(dayStart, StartHour),
      end: addHours(dayStart, EndHour - 1),
    });
  }, [currentDate]);

  const companyId = useCompanyId();
  const locationId = useLocationId();
  const { membershipReady } = useAuth();
  const [staff, setStaff] = useState<Staff[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const didScrollToNow = useRef(false);

  useEffect(() => {
    if (!companyId || !membershipReady) return;
    let cancelled = false;
    loadCalendarStaff(companyId, locationId)
      .then((rows) => {
        if (!cancelled) setStaff(rows);
      })
      .catch(() => {
        if (!cancelled) setStaff([]);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId, locationId, membershipReady]);

  const columns = useMemo(
    () =>
      staff.filter(
        (member) => visibleStaff.length === 0 || visibleStaff.includes(member.id),
      ),
    [staff, visibleStaff],
  );

  const dayEvents = useMemo(() => {
    return events
      .filter((event) => {
        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);
        return (
          isSameDay(currentDate, eventStart) ||
          isSameDay(currentDate, eventEnd) ||
          (currentDate > eventStart && currentDate < eventEnd)
        );
      })
      .sort(
        (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
      );
  }, [currentDate, events]);

  // Filter all-day events
  const allDayEvents = useMemo(() => {
    return dayEvents.filter((event) => {
      // Include explicitly marked all-day events or multi-day events
      return event.allDay || isMultiDayEvent(event);
    });
  }, [dayEvents]);

  // Get only single-day time-based events
  const timeEvents = useMemo(() => {
    return dayEvents.filter((event) => {
      // Exclude all-day events and multi-day events
      return !event.allDay && !isMultiDayEvent(event);
    });
  }, [dayEvents]);

  const handleEventClick = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    onEventSelect(event);
  };

  const showAllDaySection = allDayEvents.length > 0;
  const { currentTimePosition, currentTimeVisible } = useCurrentTimeIndicator(
    currentDate,
    "day"
  );

  useEffect(() => {
    const scroller = scrollRef.current;
    const grid = gridRef.current;
    if (!scroller || !grid || !currentTimeVisible || didScrollToNow.current) return;
    const top =
      grid.offsetTop +
      (currentTimePosition / 100) * grid.offsetHeight -
      scroller.clientHeight * 0.35;
    scroller.scrollTop = Math.max(0, top);
    didScrollToNow.current = true;
  }, [currentTimePosition, currentTimeVisible]);

  const columnMembers: Array<Staff | null> = columns.length > 0 ? columns : [null];
  const columnTemplate = `3rem repeat(${columnMembers.length}, minmax(9rem, 1fr))`;

  return (
    <div data-slot="day-view" className="flex h-full min-h-0 flex-1 flex-col">
      {showAllDaySection && (
        <div className="border-border/70 bg-muted/50 shrink-0 border-t">
          <div className="grid grid-cols-[2rem_1fr]">
            <div className="relative">
              <span className="text-muted-foreground/70 absolute bottom-0 left-0 h-6 w-8 max-w-full pe-1 text-right text-[10px] sm:pe-2 sm:text-xs">
                All day
              </span>
            </div>
            <div className="border-border/70 relative border-r p-1 last:border-r-0">
              {allDayEvents.map((event) => {
                const eventStart = new Date(event.start);
                const eventEnd = new Date(event.end);
                const isFirstDay = isSameDay(currentDate, eventStart);
                const isLastDay = isSameDay(currentDate, eventEnd);

                return (
                  <EventItem
                    key={`spanning-${event.id}`}
                    onClick={(e) => handleEventClick(event, e)}
                    event={event}
                    view="month"
                    isFirstDay={isFirstDay}
                    isLastDay={isLastDay}
                  >
                    {/* Always show the title in day view for better usability */}
                    <div>{event.title}</div>
                  </EventItem>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-auto">
        <div
          className="sticky top-0 z-30 grid border-b border-border/70 bg-background"
          style={{ gridTemplateColumns: columnTemplate }}
        >
          <div className="sticky left-0 z-30 border-r border-border/70 bg-background" />
          {columnMembers.map((member) => (
            <DayStaffHeader key={member?.id ?? "all"} member={member} />
          ))}
        </div>
        <div ref={gridRef} className="relative">
        <div
          className="grid"
          style={{ gridTemplateColumns: columnTemplate }}
        >
        <div className="sticky left-0 z-20 border-r border-border/70 bg-background">
          {currentTimeVisible && (
            <div
              className="pointer-events-none absolute right-0 z-30"
              style={{ top: `${currentTimePosition}%` }}
            >
              <div className="absolute -right-1 size-2 -translate-y-1/2 rounded-full bg-red-500" />
            </div>
          )}
          {hours.map((hour, index) => (
            <div
              key={hour.toString()}
              className="relative h-[var(--week-cells-height)] border-b border-border/70 last:border-b-0"
            >
              {index > 0 && (
                <span className="absolute -top-3 left-0 flex h-6 w-full items-center justify-end bg-background pe-1 text-[10px] text-muted-foreground/70 sm:pe-2 sm:text-xs">
                  {format(hour, "HH")}
                </span>
              )}
            </div>
          ))}
        </div>

        {columnMembers.map((member) => (
          <DayStaffColumn
            key={member?.id ?? "all"}
            member={member}
            events={
              member
                ? timeEvents.filter((event) => event.staff?.id === member.id)
                : timeEvents
            }
            hours={hours}
          currentDate={currentDate}
          onEventCreate={onEventCreate}
            onEventSelect={onEventSelect}
          />
        ))}
        </div>
        {currentTimeVisible && (
          <div
            className="pointer-events-none absolute inset-x-0 z-20"
            style={{ top: `${currentTimePosition}%` }}
          >
            <div className="ml-12 h-[2px] bg-red-500" />
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
