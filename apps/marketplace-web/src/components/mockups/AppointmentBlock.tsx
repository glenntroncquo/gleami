import React from "react";
import { addMinutes } from "../../utils/time";
import type { Appointment, EventColor } from "../../types/calendar";

const colorClasses: Record<EventColor, string> = {
  blue: "bg-blue-200/60 text-blue-950",
  violet: "bg-violet-200/60 text-violet-950",
  emerald: "bg-emerald-200/60 text-emerald-950",
  orange: "bg-orange-200/60 text-orange-950",
  pink: "bg-pink-200/60 text-pink-950",
};

type AppointmentBlockProps = {
  appointment: Appointment;
  color: EventColor;
  label: string;
  top: string;
  height: string;
  selected?: boolean;
};

export function AppointmentBlock({
  appointment,
  color,
  label,
  top,
  height,
  selected = false,
}: AppointmentBlockProps) {
  const { status, client, start, duration } = appointment;
  const style = { top, height };

  if (status === "break") {
    return (
      <div
        className="absolute inset-x-1 flex items-center overflow-hidden rounded bg-shell px-2 text-[11px] font-medium text-muted"
        style={style}
      >
        {label}
      </div>
    );
  }

  const end = addMinutes(start, duration);
  const compact = duration < 45;

  return (
    <div
      className={`absolute inset-x-1 overflow-hidden rounded px-2 py-1 text-[11px] ${colorClasses[color]} ${
        selected ? "z-10 ring-2 ring-blue-700/50" : ""
      }`}
      style={style}
    >
      {compact ? (
        <div className="min-w-0">
          <p className="truncate leading-tight">
            <span className="text-[9px] font-normal uppercase opacity-70">{start}</span>{" "}
            <span className="font-medium">{label}</span>
          </p>
          {client ? <p className="truncate text-[10px] leading-tight opacity-80">{client}</p> : null}
        </div>
      ) : (
        <div className="min-w-0">
          <p className="truncate text-[12px] font-medium leading-tight">{label}</p>
          {client ? <p className="truncate text-[10px] leading-tight opacity-80">{client}</p> : null}
          <p className="truncate text-[10px] font-normal uppercase leading-tight opacity-70">
            {start} - {end}
          </p>
        </div>
      )}
    </div>
  );
}
