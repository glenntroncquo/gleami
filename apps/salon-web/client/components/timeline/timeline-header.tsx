"use client";

import { useMemo } from "react";
import { addDays, format, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";

interface TimelineHeaderProps {
  startDate: Date;
  days: number;
}

export function TimelineHeader({ startDate, days }: TimelineHeaderProps) {
  const dates = useMemo(() => {
    return Array.from({ length: days }, (_, i) => addDays(startDate, i));
  }, [startDate, days]);

  const today = new Date();

  // Group dates by month for month labels
  const monthGroups = useMemo(() => {
    const groups: { month: string; startIndex: number; count: number }[] = [];
    let currentMonth = "";
    let currentStartIndex = 0;
    let currentCount = 0;

    dates.forEach((date, index) => {
      const monthKey = format(date, "MMMM");
      if (monthKey !== currentMonth) {
        if (currentMonth) {
          groups.push({
            month: currentMonth,
            startIndex: currentStartIndex,
            count: currentCount,
          });
        }
        currentMonth = monthKey;
        currentStartIndex = index;
        currentCount = 1;
      } else {
        currentCount++;
      }
    });

    if (currentMonth) {
      groups.push({
        month: currentMonth,
        startIndex: currentStartIndex,
        count: currentCount,
      });
    }

    return groups;
  }, [dates]);

  return (
    <div className="relative border-b border-border/50">
      {/* Month labels */}
      <div className="flex h-8 items-center border-b border-border/30" style={{ paddingLeft: "60px" }}>
        {monthGroups.map((group, idx) => (
          <div
            key={`${group.month}-${idx}`}
            className="text-sm font-semibold text-foreground/90 uppercase tracking-wide flex-1"
            style={{ paddingLeft: "8px" }}
          >
            {group.month}
          </div>
        ))}
      </div>

      {/* Day labels */}
      <div className="flex h-10 items-end" style={{ paddingLeft: "60px" }}>
        {dates.map((date, index) => {
          const isToday = isSameDay(date, today);
          const dayAbbr = format(date, "EEE").charAt(0);
          const dayNum = format(date, "d");

          return (
            <div
              key={index}
              className={cn(
                "flex-1 flex flex-col items-center justify-center text-xs relative",
                isToday && "font-bold"
              )}
            >
              {/* Indicator dots for special days */}
              <div className="h-3 flex items-center justify-center gap-0.5 mb-0.5">
                {isToday && (
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                )}
              </div>
              <span
                className={cn(
                  "text-muted-foreground/70",
                  isToday && "text-rose-500"
                )}
              >
                {dayAbbr} {dayNum}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
