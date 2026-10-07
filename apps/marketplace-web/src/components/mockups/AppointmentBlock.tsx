import React from 'react';
import { GlobeIcon } from 'lucide-react';
import { toneClasses, type Tone } from '../../utils/tones';
import { addMinutes } from '../../utils/time';
import type { Appointment } from '../../types/calendar';

type AppointmentBlockProps = {
  appointment: Appointment;
  tone: Tone;
  top: number;
  height: number;
  selected?: boolean;
  lifted?: boolean;
};

export function AppointmentBlock({ appointment, tone, top, height, selected = false, lifted = false }: AppointmentBlockProps) {
  const t = toneClasses[tone];
  const { status, client, treatment, start, duration, online } = appointment;
  const style = { top: top + 2, height: height - 4 };

  if (status === 'break') {
    return (
      <div
        className="absolute inset-x-1 flex items-center rounded-lg bg-shell px-2.5 text-[11px] font-medium text-muted"
        style={style}>
        
        {treatment}
      </div>);

  }

  const statusClass =
  status === 'pending' ?
  `bg-white border border-dashed ${t.border}` :
  status === 'completed' ?
  `${t.soft} border-l-[3px] ${t.border} opacity-60` :
  status === 'in-progress' ?
  `${t.solid} border-l-[3px] ${t.border}` :
  `${t.soft} border-l-[3px] ${t.border}`;

  const compact = height < 44;
  const end = addMinutes(start, duration);

  return (
    <div
      className={`absolute inset-x-1 overflow-hidden rounded-lg px-2.5 py-1.5 ${statusClass} ${selected ? 'z-10 ring-2 ring-ink ring-offset-1 ring-offset-white' : ''} ${lifted ? 'z-20 shadow-float' : ''}`}
      style={style}>
      
      {compact ?
      <p className="truncate text-[11px] leading-[18px]">
          <span className="font-semibold text-ink">{client}</span>{' '}
          <span className="text-muted">{start}</span>
        </p> :

      <>
          <div className="flex items-center justify-between gap-1">
            <p className={`text-[10.5px] font-medium ${t.text}`}>
              {start}–{end}
            </p>
            <span className="flex items-center gap-1">
              {online && <GlobeIcon className={`h-3 w-3 ${t.text}`} />}
              {status === 'in-progress' && <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />}
            </span>
          </div>
          <p className="mt-0.5 truncate text-[12px] font-semibold text-ink">{client}</p>
          {height >= 64 && <p className="truncate text-[11px] text-muted">{treatment}</p>}
        </>
      }
    </div>);

}