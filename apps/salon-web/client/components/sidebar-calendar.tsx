"use client";

import * as React from "react";
import { useCalendarContext } from "@/components/event-calendar/calendar-context";
import { Calendar } from "@/components/ui/calendar";

export default function SidebarCalendar() {
  const { currentDate, setCurrentDate } = useCalendarContext();

  return (
    <div className="group-data-[collapsible=icon]:hidden">
      <Calendar
        mode="single"
        selected={currentDate}
        onSelect={(date) => {
          if (date) {
            setCurrentDate(date);
          }
        }}
        className="rounded-md border-0"
      />
    </div>
  );
}
