"use client";

import { useMemo } from "react";
import { addDays, format, isSameDay, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TimelineStaff, TimelineTask, TimelineUnavailability } from "./types";
import { TaskBar } from "./task-bar";

interface TimelineRowProps {
  staff: TimelineStaff;
  startDate: Date;
  days: number;
}

export function TimelineRow({ staff, startDate, days }: TimelineRowProps) {
  const today = new Date();

  const initials = useMemo(() => {
    const parts = staff.name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
    }
    return staff.name.substring(0, 2).toUpperCase();
  }, [staff.name]);

  const dates = useMemo(() => {
    return Array.from({ length: days }, (_, i) => addDays(startDate, i));
  }, [startDate, days]);

  // Group tasks by day
  const tasksByDay = useMemo(() => {
    const grouped: Map<string, TimelineTask[]> = new Map();

    dates.forEach((date) => {
      const dayKey = startOfDay(date).toISOString();
      grouped.set(dayKey, []);
    });

    staff.tasks.forEach((task) => {
      const taskDay = startOfDay(task.startTime);
      const dayKey = taskDay.toISOString();
      if (grouped.has(dayKey)) {
        grouped.get(dayKey)!.push(task);
      }
    });

    // Sort tasks by start time within each day
    grouped.forEach((tasks) => {
      tasks.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    });

    return grouped;
  }, [staff.tasks, dates]);

  // Group unavailabilities by day
  const unavailabilitiesByDay = useMemo(() => {
    const grouped: Map<string, TimelineUnavailability[]> = new Map();

    dates.forEach((date) => {
      const dayKey = startOfDay(date).toISOString();
      grouped.set(dayKey, []);
    });

    if (staff.unavailabilities) {
      staff.unavailabilities.forEach((unavailability) => {
        const unavailabilityDay = startOfDay(unavailability.startTime);
        const dayKey = unavailabilityDay.toISOString();
        if (grouped.has(dayKey)) {
          grouped.get(dayKey)!.push(unavailability);
        }
      });
    }

    return grouped;
  }, [staff.unavailabilities, dates]);

  return (
    <div className="flex border-b border-border/30 hover:bg-muted/10 transition-colors">
      {/* Staff info column */}
      <div className="w-[60px] flex-shrink-0 flex items-center justify-center py-2 border-r border-border/30">
        <Avatar className="h-9 w-9 ring-2 ring-background shadow-sm">
          <AvatarImage src={staff.avatar} alt={staff.name} />
          <AvatarFallback className="text-xs font-medium bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600">
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Days columns */}
      <div className="flex-1 flex min-w-0">
        {dates.map((date, index) => {
          const isToday = isSameDay(date, today);
          const dayKey = startOfDay(date).toISOString();
          const dayTasks = tasksByDay.get(dayKey) || [];
          const dayUnavailabilities = unavailabilitiesByDay.get(dayKey) || [];
          const hasUnavailability = dayUnavailabilities.length > 0;

          return (
            <div
              key={index}
              className={cn(
                "flex-1 min-w-0 border-r border-border/20 last:border-r-0 p-1.5",
                isToday && !hasUnavailability && "bg-rose-50/30",
                hasUnavailability && "bg-red-50/50"
              )}
            >
              <div className="flex flex-col gap-1">
                {/* Unavailabilities */}
                {dayUnavailabilities.map((unavailability) => (
                  <div
                    key={unavailability.id}
                    className="rounded-lg px-2 py-1.5 bg-red-100/80 border border-red-200/50 min-h-[48px] flex flex-col justify-center"
                  >
                    <span className="text-xs font-semibold text-red-700 truncate leading-tight">
                      Unavailable
                    </span>
                    <span className="text-[10px] text-red-600/80 truncate leading-tight">
                      {format(unavailability.startTime, "HH:mm")} -{" "}
                      {format(unavailability.endTime, "HH:mm")}
                    </span>
                    {unavailability.reason && (
                      <span className="text-[9px] text-red-600/70 truncate leading-tight mt-0.5">
                        {unavailability.reason}
                      </span>
                    )}
                  </div>
                ))}

                {/* Tasks */}
                {dayTasks.map((task, taskIndex) => (
                  <TaskBar
                    key={task.id}
                    task={task}
                    index={taskIndex}
                    totalInSlot={dayTasks.length}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
