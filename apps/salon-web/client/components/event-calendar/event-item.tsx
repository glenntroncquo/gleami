"use client";

import { useMemo } from "react";
import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import { format, isPast, differenceInMinutes } from "date-fns";

import {
  getBorderRadiusClasses,
  getEventColorClasses,
  type CalendarEvent,
} from "@/components/event-calendar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

// Using date-fns format with custom formatting:
// 'h' - hours (1-12)
// 'a' - am/pm
// ':mm' - minutes with leading zero (only if the token 'mm' is present)
const formatTimeWithOptionalMinutes = (date: Date) => {
  return format(date, "HH:mm");
};

interface EventWrapperProps {
  event: CalendarEvent;
  isFirstDay?: boolean;
  isLastDay?: boolean;
  isDragging?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  children: React.ReactNode;
  currentTime?: Date;
  dndListeners?: SyntheticListenerMap;
  dndAttributes?: DraggableAttributes;
  onMouseDown?: (e: React.MouseEvent) => void;
  onTouchStart?: (e: React.TouchEvent) => void;
}

// Shared wrapper component for event styling
function EventWrapper({
  event,
  isFirstDay = true,
  isLastDay = true,
  isDragging,
  onClick,
  className,
  children,
  currentTime,
  dndListeners,
  dndAttributes,
  onMouseDown,
  onTouchStart,
}: EventWrapperProps) {
  // Always use the currentTime (if provided) to determine if the event is in the past
  const displayEnd = currentTime
    ? new Date(
        new Date(currentTime).getTime() +
          (new Date(event.end).getTime() - new Date(event.start).getTime())
      )
    : new Date(event.end);

  const isEventInPast = isPast(displayEnd);

  return (
    <button
      className={cn(
        "focus-visible:border-ring focus-visible:ring-ring/50 flex h-full w-full overflow-hidden px-1 text-left font-medium backdrop-blur-md transition outline-none select-none focus-visible:ring-[3px] data-dragging:cursor-grabbing data-dragging:shadow-lg sm:px-2",
        getEventColorClasses(event.color),
        getBorderRadiusClasses(isFirstDay, isLastDay),
        className
      )}
      data-dragging={isDragging || undefined}
      data-past-event={isEventInPast || undefined}
      onClick={onClick}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      {...dndListeners}
      {...dndAttributes}
    >
      {children}
    </button>
  );
}

interface EventItemProps {
  event: CalendarEvent;
  view: "month" | "week" | "day" | "agenda";
  isDragging?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  showTime?: boolean;
  currentTime?: Date; // For updating time during drag
  isFirstDay?: boolean;
  isLastDay?: boolean;
  children?: React.ReactNode;
  className?: string;
  dndListeners?: SyntheticListenerMap;
  dndAttributes?: DraggableAttributes;
  onMouseDown?: (e: React.MouseEvent) => void;
  onTouchStart?: (e: React.TouchEvent) => void;
}

export function EventItem({
  event,
  view,
  isDragging,
  onClick,
  showTime,
  currentTime,
  isFirstDay = true,
  isLastDay = true,
  children,
  className,
  dndListeners,
  dndAttributes,
  onMouseDown,
  onTouchStart,
}: EventItemProps) {
  const eventColor = event.color;

  // Use the provided currentTime (for dragging) or the event's actual time
  const displayStart = useMemo(() => {
    return currentTime || new Date(event.start);
  }, [currentTime, event.start]);

  const displayEnd = useMemo(() => {
    return currentTime
      ? new Date(
          new Date(currentTime).getTime() +
            (new Date(event.end).getTime() - new Date(event.start).getTime())
        )
      : new Date(event.end);
  }, [currentTime, event.start, event.end]);

  // Calculate event duration in minutes
  // Duration calculation removed as we now always show full time range

  const getEventTime = () => {
    if (event.allDay) return "All day";

    // Always show both start and end time for consistency
    return `${formatTimeWithOptionalMinutes(
      displayStart
    )} - ${formatTimeWithOptionalMinutes(displayEnd)}`;
  };

  if (view === "month") {
    return (
      <EventWrapper
        event={event}
        isFirstDay={isFirstDay}
        isLastDay={isLastDay}
        isDragging={isDragging}
        onClick={onClick}
        className={cn(
          "mt-[var(--event-gap)] h-[var(--event-height)] items-center text-[10px] sm:text-[13px]",
          className
        )}
        currentTime={currentTime}
        dndListeners={dndListeners}
        dndAttributes={dndAttributes}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
      >
        {children || (
          <span className="truncate">
            {!event.allDay && (
              <span className="truncate sm:text-xs font-normal opacity-70 uppercase">
                {formatTimeWithOptionalMinutes(displayStart)}{" "}
              </span>
            )}
            {event.title}
          </span>
        )}
      </EventWrapper>
    );
  }

  if (view === "week" || view === "day") {
    const getInitials = (firstName: string, lastName: string) => {
      const first = firstName?.charAt(0).toUpperCase() || "";
      const last = lastName?.charAt(0).toUpperCase() || "";
      return `${first}${last}`;
    };

    const staffName = event.staff
      ? `${event.staff.first_name} ${event.staff.last_name}`
      : "";

    const staffInitials = event.staff
      ? getInitials(event.staff.first_name, event.staff.last_name)
      : "";

    // Calculate event duration in minutes
    const durationInMinutes = differenceInMinutes(displayEnd, displayStart);

    // Use compact layout for short appointments (less than 45 minutes)
    const isShortAppointment = durationInMinutes < 45;

    return (
      <EventWrapper
        event={event}
        isFirstDay={isFirstDay}
        isLastDay={isLastDay}
        isDragging={isDragging}
        onClick={onClick}
        className={cn(
          "py-1 flex-col relative",
          view === "week" ? "text-[10px] sm:text-[11px]" : "text-[11px]",
          className
        )}
        currentTime={currentTime}
        dndListeners={dndListeners}
        dndAttributes={dndAttributes}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
      >
        {isShortAppointment ? (
          // Compact layout for short appointments
          <div className="flex flex-col h-full relative overflow-hidden">
            {/* Start hour and treatment name side by side */}
            <div className="flex items-baseline gap-1.5 min-h-0">
              <div className="font-normal opacity-70 text-[9px] uppercase whitespace-nowrap leading-none flex-shrink-0">
                {formatTimeWithOptionalMinutes(displayStart)}
              </div>
              <div className="truncate font-medium text-[10px] leading-tight min-w-0">
                {event.service?.name || event.title}
              </div>
            </div>

            {/* Client name underneath */}
            {event.client && (
              <div className="truncate text-[9px] opacity-80 min-h-0">
                {event.client.first_name} {event.client.last_name}
              </div>
            )}

            {/* Staff image in bottom left corner */}
            {event.staff && (
              <div className="absolute bottom-0.5 left-0.5">
                <Avatar className="w-4 h-4 border border-white/20">
                  {event.staff.image_path && (
                    <AvatarImage
                      src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/company/${event.staff.image_path}`}
                      alt={staffName}
                    />
                  )}
                  <AvatarFallback className="text-[8px] font-medium">
                    {staffInitials}
                  </AvatarFallback>
                </Avatar>
              </div>
            )}
          </div>
        ) : (
          // Full layout for longer appointments
          <div className="flex flex-col h-full relative">
            {/* Treatment name */}
            <div className="truncate font-medium text-xs">
              {event.service?.name || event.title}
            </div>

            {/* Client name */}
            {event.client && (
              <div className="truncate text-[10px] opacity-80">
                {event.client.first_name} {event.client.last_name}
              </div>
            )}

            {/* Price option */}
            {event.service?.serviceVariant && (
              <div className="truncate text-[10px] opacity-80">
                {event.service.serviceVariant.name}
              </div>
            )}

            {/* Time */}
            {showTime && (
              <div className="truncate font-normal opacity-70 text-[10px] uppercase">
                {getEventTime()}
              </div>
            )}

            {/* Staff name */}
            {staffName && (
              <div className="truncate text-[10px] opacity-80">{staffName}</div>
            )}

            {/* Staff image in bottom left corner */}
            {event.staff && (
              <div className="absolute bottom-1 left-1">
                <Avatar className="w-5 h-5 border border-white/20">
                  {event.staff.image_path && (
                    <AvatarImage
                      src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/company/${event.staff.image_path}`}
                      alt={staffName}
                    />
                  )}
                  <AvatarFallback className="text-[9px] font-medium">
                    {staffInitials}
                  </AvatarFallback>
                </Avatar>
              </div>
            )}
          </div>
        )}
      </EventWrapper>
    );
  }

  // Agenda view - kept separate since it's significantly different
  return (
    <button
      className={cn(
        "focus-visible:border-ring focus-visible:ring-ring/50 flex w-full flex-col gap-1 rounded p-2 text-left transition outline-none focus-visible:ring-[3px] data-past-event:opacity-90",
        getEventColorClasses(event.color),
        className
      )}
      data-past-event={isPast(new Date(event.end)) || undefined}
      onClick={onClick}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      {...dndListeners}
      {...dndAttributes}
    >
      <div className="text-sm font-medium">{event.title}</div>
      <div className="text-xs opacity-70">
        {event.allDay ? (
          <span>All day</span>
        ) : (
          <span className="uppercase">
            {formatTimeWithOptionalMinutes(displayStart)} -{" "}
            {formatTimeWithOptionalMinutes(displayEnd)}
          </span>
        )}
        {event.location && (
          <>
            <span className="px-1 opacity-35"> · </span>
            <span>{event.location}</span>
          </>
        )}
      </div>
      {event.description && (
        <div className="my-1 text-xs opacity-90">{event.description}</div>
      )}
    </button>
  );
}
