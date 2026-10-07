import React from 'react';
import { ChevronLeftIcon, ChevronRightIcon, SearchIcon, PlusIcon, XIcon, StickyNoteIcon } from 'lucide-react';
import { AppSidebar } from './AppSidebar';
import { AppointmentBlock } from './AppointmentBlock';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import {
  calendarAppointments,
  calendarDateLabel,
  calendarNow,
  calendarStaff,
  calendarSummary,
  selectedAppointmentDetail,
  selectedAppointmentId } from
'../../data/calendar';
import { toMinutes } from '../../utils/time';

const HOUR = 64;
const START_HOUR = 9;
const HOURS = 9;

type CalendarMockupProps = {
  showDetail?: boolean;
};

export function CalendarMockup({ showDetail = true }: CalendarMockupProps) {
  const hours = Array.from({ length: HOURS }, (_, i) => START_HOUR + i);
  const nowTop = (toMinutes(calendarNow) - START_HOUR * 60) / 60 * HOUR;
  const d = selectedAppointmentDetail;

  return (
    <div
      role="img"
      aria-label="Gleami calendar showing a salon's day with appointments for four professionals"
      className="flex w-full bg-white text-ink">
      
      <AppSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-16 items-center gap-3 border-b border-line px-5">
          <span className="rounded-lg px-3 py-1.5 text-[12px] font-medium ring-1 ring-line">Today</span>
          <span className="flex items-center gap-1 text-muted">
            <ChevronLeftIcon className="h-4 w-4" />
            <ChevronRightIcon className="h-4 w-4" />
          </span>
          <p className="text-[15px] font-semibold tracking-tight">{calendarDateLabel}</p>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex rounded-lg bg-shell p-0.5 text-[12px] font-medium">
              <span className="rounded-md bg-white px-3 py-1 shadow-soft">Day</span>
              <span className="px-3 py-1 text-muted">Week</span>
            </div>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg ring-1 ring-line">
              <SearchIcon className="h-4 w-4 text-muted" />
            </span>
            <span className="flex h-8 items-center gap-1.5 rounded-lg bg-ink px-3 text-[12px] font-medium text-white">
              <PlusIcon className="h-3.5 w-3.5" />
              New appointment
            </span>
          </div>
        </div>

        <div className="flex items-center gap-5 border-b border-line px-5 py-2.5 text-[12px] text-muted">
          {calendarSummary.map((item, i) =>
          <span key={item} className="flex items-center gap-5">
              {i > 0 && <span className="h-1 w-1 rounded-full bg-line-strong" />}
              {item}
            </span>
          )}
        </div>

        <div
          className="grid border-b border-line"
          style={{ gridTemplateColumns: `56px repeat(${calendarStaff.length}, minmax(0, 1fr))` }}>
          
          <div />
          {calendarStaff.map((s) =>
          <div key={s.id} className="flex items-center gap-2.5 border-l border-line px-3 py-3">
              <Avatar name={s.name} tone={s.tone} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold">{s.name}</p>
                <p className="truncate text-[11px] text-muted">{s.role}</p>
              </div>
            </div>
          )}
        </div>

        <div
          className="relative grid"
          style={{
            gridTemplateColumns: `56px repeat(${calendarStaff.length}, minmax(0, 1fr))`,
            height: HOURS * HOUR
          }}>
          
          {hours.map((h, i) =>
          <div key={h} className="pointer-events-none absolute inset-x-0" style={{ top: i * HOUR }}>
              <div className="border-t border-line" />
              <span className="absolute left-3 top-1 text-[11px] text-subtle">{h}:00</span>
              <div className="absolute left-14 right-0 border-t border-dashed border-line/70" style={{ top: HOUR / 2 }} />
            </div>
          )}
          <div />
          {calendarStaff.map((s) =>
          <div key={s.id} className="relative border-l border-line">
              {calendarAppointments.
            filter((a) => a.staffId === s.id).
            map((a) =>
            <AppointmentBlock
              key={a.id}
              appointment={a}
              tone={s.tone}
              top={(toMinutes(a.start) - START_HOUR * 60) / 60 * HOUR}
              height={a.duration / 60 * HOUR}
              selected={a.id === selectedAppointmentId} />

            )}
            </div>
          )}
          <div className="pointer-events-none absolute left-[52px] right-0 z-20" style={{ top: nowTop }}>
            <div className="relative border-t-2 border-rose-500">
              <span className="absolute -left-1 -top-[5px] h-2 w-2 rounded-full bg-rose-500" />
            </div>
          </div>
        </div>
      </div>

      {showDetail &&
      <aside className="flex w-[288px] shrink-0 flex-col border-l border-line bg-canvas p-5">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold">Appointment</p>
            <XIcon className="h-4 w-4 text-muted" />
          </div>
          <div className="mt-5 flex items-center gap-3">
            <Avatar name={d.client} tone="rose" size="lg" />
            <div>
              <p className="text-[15px] font-semibold">{d.client}</p>
              <p className="text-[12px] text-muted">{d.clientMeta}</p>
            </div>
          </div>
          <dl className="mt-5 divide-y divide-line rounded-xl bg-white text-[12px] ring-1 ring-line">
            {[
          ['Treatment', d.treatment],
          ['Time', d.time],
          ['Duration', d.durationLabel],
          ['Professional', d.professional]].
          map(([k, v]) =>
          <div key={k} className="flex items-center justify-between px-3.5 py-2.5">
                <dt className="text-muted">{k}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
          )}
            <div className="flex items-center justify-between px-3.5 py-2.5">
              <dt className="text-muted">Status</dt>
              <dd>
                <Badge tone="rose" dot>
                  In progress
                </Badge>
              </dd>
            </div>
          </dl>
          <div className="mt-4 rounded-xl bg-sand-50 p-3.5 ring-1 ring-sand-100">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-sand-700">
              <StickyNoteIcon className="h-3.5 w-3.5" />
              Client note
            </p>
            <p className="mt-1.5 text-[12px] leading-relaxed text-ink/80">{d.note}</p>
          </div>
          <div className="mt-auto pt-5">
            <div className="flex items-baseline justify-between">
              <span className="text-[12px] text-muted">Total</span>
              <span className="text-[20px] font-semibold tracking-tight">{d.price}</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[12px] font-medium">
              <span className="flex h-9 items-center justify-center rounded-lg bg-white ring-1 ring-line">Reschedule</span>
              <span className="flex h-9 items-center justify-center rounded-lg bg-ink text-white">Checkout</span>
            </div>
          </div>
        </aside>
      }
    </div>);

}