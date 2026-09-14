"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { TimelineTask } from "./types";

const colorStyles = {
  pink: "bg-rose-400/90 text-white shadow-rose-400/30",
  purple: "bg-violet-400/90 text-white shadow-violet-400/30",
  green: "bg-emerald-400/90 text-white shadow-emerald-400/30",
  blue: "bg-sky-400/90 text-white shadow-sky-400/30",
  orange: "bg-amber-400/90 text-white shadow-amber-400/30",
  teal: "bg-teal-400/90 text-white shadow-teal-400/30",
};

interface TaskBarProps {
  task: TimelineTask;
  index: number;
  totalInSlot: number;
}

export function TaskBar({ task, index, totalInSlot }: TaskBarProps) {
  const timeRange = useMemo(() => {
    const start = format(task.startTime, "HH:mm");
    const end = format(task.endTime, "HH:mm");
    return `${start} - ${end}`;
  }, [task]);

  return (
    <div
      className={cn(
        "rounded-lg px-2 py-1.5 cursor-pointer transition-all",
        "hover:shadow-md hover:scale-[1.02]",
        "flex flex-col justify-center min-h-[48px] shadow-sm",
        colorStyles[task.color]
      )}
      title={`${task.title}\n${timeRange}`}
    >
      <span className="text-xs font-semibold truncate leading-tight">
        {task.title}
      </span>
      <span className="text-[10px] opacity-90 truncate leading-tight">
        {timeRange}
      </span>
    </div>
  );
}
