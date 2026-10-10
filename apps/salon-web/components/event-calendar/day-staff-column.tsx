"use client";

import { useMemo } from "react";
import {
  addHours,
  areIntervalsOverlapping,
  differenceInMinutes,
  getHours,
  getMinutes,
  isSameDay,
  startOfDay,
  endOfDay,
} from "date-fns";

import {
  DraggableEvent,
  DroppableCell,
  WeekCellsHeight,
  type CalendarEvent,
} from "@/components/event-calendar";
import { StartHour } from "@/components/event-calendar/constants";
import { useStaffAvailability } from "@/components/event-calendar/hooks/use-staff-availability";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Staff } from "@/components/participants";
import { cn } from "@/lib/utils";

function layoutColumnEvents(events: CalendarEvent[], currentDate: Date) {
  const result: {
    event: CalendarEvent;
    top: number;
    height: number;
    left: number;
    width: number;
    zIndex: number;
  }[] = [];
  const dayStart = startOfDay(currentDate);
  const columns: { event: CalendarEvent; end: Date }[][] = [];

  const sorted = [...events].sort((a, b) => {
    const startDelta = new Date(a.start).getTime() - new Date(b.start).getTime();
    if (startDelta !== 0) return startDelta;
    return differenceInMinutes(new Date(b.end), new Date(b.start)) -
      differenceInMinutes(new Date(a.end), new Date(a.start));
  });

  sorted.forEach((event) => {
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);
    const adjustedStart = isSameDay(currentDate, eventStart) ? eventStart : dayStart;
    const adjustedEnd = isSameDay(currentDate, eventEnd)
      ? eventEnd
      : addHours(dayStart, 24);
    const startHour = getHours(adjustedStart) + getMinutes(adjustedStart) / 60;
    const endHour = getHours(adjustedEnd) + getMinutes(adjustedEnd) / 60;
    const top = (startHour - StartHour) * WeekCellsHeight;
    const height = Math.max((endHour - startHour) * WeekCellsHeight, 24);

    let columnIndex = 0;
    let placed = false;
    while (!placed) {
      const col = columns[columnIndex] || [];
      if (col.length === 0) {
        columns[columnIndex] = col;
        placed = true;
      } else if (
        !col.some((entry) =>
          areIntervalsOverlapping(
            { start: adjustedStart, end: adjustedEnd },
            { start: new Date(entry.event.start), end: new Date(entry.event.end) },
          ),
        )
      ) {
        placed = true;
      } else {
        columnIndex += 1;
      }
    }

    const currentColumn = columns[columnIndex] || [];
    columns[columnIndex] = currentColumn;
    currentColumn.push({ event, end: adjustedEnd });
    result.push({
      event,
      top,
      height,
      left: columnIndex,
      width: 1,
      zIndex: 10 + columnIndex,
    });
  });

  const count = Math.max(columns.length, 1);
  return result.map((item) => ({
    ...item,
    left: item.left / count,
    width: 1 / count,
  }));
}

export function staffInitials(member: Staff) {
  return `${member.first_name?.[0] ?? ""}${member.last_name?.[0] ?? ""}`.toUpperCase();
}

export function staffPhoto(member: Staff) {
  if (!member.image_path) return undefined;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/company/${member.image_path}`;
}

export function DayStaffHeader({ member }: { member: Staff | null }) {
  if (!member) return <div className="border-r border-border/70 bg-background" />;
  const first = member.first_name?.trim() ?? "";
  const last = member.last_name?.trim() ?? "";
  const name = `${first} ${last}`.trim();
  return (
    <div className="flex min-h-[4.5rem] flex-col items-center justify-center gap-1.5 border-r border-border/70 bg-background px-3 py-2.5">
      <Avatar className="size-10 shadow-sm ring-1 ring-border">
        {member.image_path ? <AvatarImage src={staffPhoto(member)} alt={name} /> : null}
        <AvatarFallback className="bg-accent text-[11px] font-semibold tracking-wide text-foreground">
          {staffInitials(member)}
        </AvatarFallback>
      </Avatar>
      <div className="w-full text-center leading-tight">
        <div className="truncate text-[13px] font-medium text-foreground">{first || name}</div>
        {last ? (
          <div className="truncate text-[11px] text-muted-foreground">{last}</div>
        ) : null}
      </div>
    </div>
  );
}

export function DayStaffColumn({
  member,
  events,
  hours,
  currentDate,
  onEventCreate,
  onEventSelect,
}: {
  member: Staff | null;
  events: CalendarEvent[];
  hours: Date[];
  currentDate: Date;
  onEventCreate: (startTime: Date) => void;
  onEventSelect: (event: CalendarEvent) => void;
}) {
  const dayStart = useMemo(() => startOfDay(currentDate), [currentDate]);
  const dayEnd = useMemo(() => endOfDay(currentDate), [currentDate]);
  const { checkTimeSlot } = useStaffAvailability(member?.id ?? null, dayStart, dayEnd);
  const positioned = useMemo(
    () => layoutColumnEvents(events, currentDate),
    [events, currentDate],
  );

  return (
    <div className="relative border-r border-border/70">
      {member && (
        <div aria-hidden className="calendar-unavailable pointer-events-none absolute inset-0" />
      )}
      {positioned.map((item) => (
        <div
          key={item.event.id}
          className="absolute z-10 px-0.5"
          style={{
            top: item.top,
            height: item.height,
            left: `${item.left * 100}%`,
            width: `${item.width * 100}%`,
            zIndex: item.zIndex,
          }}
        >
          <DraggableEvent
            event={item.event}
            view="day"
            showTime
            height={item.height}
            onClick={(event) => {
              event.stopPropagation();
              onEventSelect(item.event);
            }}
          />
        </div>
      ))}
      {hours.map((hour) => {
        const hourValue = getHours(hour);
        return (
          <div
            key={hour.toString()}
            className="relative z-[1] h-[var(--week-cells-height)] border-b border-border/70 last:border-b-0 after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:z-10 after:h-px after:bg-border/70 after:content-[''] last:after:hidden"
          >
            {[0, 1, 2, 3].map((quarter) => {
              const quarterHourTime = hourValue + quarter * 0.25;
              const open = member
                ? checkTimeSlot(currentDate, quarterHourTime).isAvailable
                : false;
              return (
                <DroppableCell
                  key={`${hour.toString()}-${quarter}`}
                  id={`day-cell-${member?.id ?? "all"}-${currentDate.toISOString()}-${quarterHourTime}`}
                  date={currentDate}
                  time={quarterHourTime}
                  className={cn(
                    "absolute h-[calc(var(--week-cells-height)/4)] w-full",
                    open && "bg-background",
                    quarter === 0 && "top-0",
                    quarter === 1 && "top-[calc(var(--week-cells-height)/4)]",
                    quarter === 2 && "top-[calc(var(--week-cells-height)/4*2)]",
                    quarter === 3 && "top-[calc(var(--week-cells-height)/4*3)]",
                  )}
                  onClick={() => {
                    const startTime = new Date(currentDate);
                    startTime.setHours(hourValue);
                    startTime.setMinutes(quarter * 15);
                    onEventCreate(startTime);
                  }}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
