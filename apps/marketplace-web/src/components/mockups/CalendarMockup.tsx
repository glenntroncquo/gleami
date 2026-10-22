import React from "react";
import {
  CalendarIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MailIcon,
  PencilIcon,
  PhoneIcon,
  Trash2Icon,
  UserRoundIcon,
  WalletIcon,
  XIcon,
} from "lucide-react";
import type { Locale } from "@/lib/i18n";
import { AppSidebar } from "./AppSidebar";
import { AppointmentBlock } from "./AppointmentBlock";
import { platformChrome, translateTreatment } from "./platform-chrome";
import {
  calendarAppointments,
  calendarNow,
  calendarStaff,
  selectedAppointmentDetail,
  selectedAppointmentId,
} from "../../data/calendar";
import { toMinutes } from "../../utils/time";

const START_MINUTES = 9 * 60;
const END_MINUTES = 17 * 60;
const SPAN = END_MINUTES - START_MINUTES;
const HOURS = [9, 10, 11, 12, 13, 14, 15, 16];

type CalendarMockupProps = {
  locale?: Locale;
  showDetail?: boolean;
};

function offset(minutes: number) {
  return `${((minutes - START_MINUTES) / SPAN) * 100}%`;
}

export function CalendarMockup({ locale = "nl-be", showDetail = true }: CalendarMockupProps) {
  const copy = platformChrome(locale);
  const detail = selectedAppointmentDetail;
  const nowTop = offset(toMinutes(calendarNow));

  return (
    <div
      role="img"
      aria-label="Gleami agenda with a salon day and an open appointment"
      className="flex h-[680px] w-full overflow-hidden bg-white text-ink"
    >
      <AppSidebar locale={locale} />

      <div className="relative flex min-w-0 flex-1 flex-col">
        <div className="flex h-[52px] shrink-0 items-center gap-2 border-b border-line px-4">
          <h2 className="min-w-0 truncate text-[18px] font-semibold tracking-tight">{copy.dateTitle}</h2>
          <div className="ml-auto flex items-center gap-1.5">
            <div className="mr-1 flex -space-x-1">
              {calendarStaff.map((member) => (
                <span
                  key={member.id}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-shell text-[9px] font-semibold ring-2 ring-white"
                >
                  {member.firstName[0]}
                  {member.lastName[0]}
                </span>
              ))}
            </div>
            <span className="flex h-8 items-center rounded-md bg-ink px-3 text-[12px] font-medium text-white">
              {copy.today}
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-md text-muted">
              <ChevronLeftIcon className="h-4 w-4" />
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-md text-muted">
              <ChevronRightIcon className="h-4 w-4" />
            </span>
            <span className="ml-1 flex h-8 max-w-[148px] items-center rounded-md px-3 text-[12px] font-medium ring-1 ring-line">
              <span className="truncate">{copy.newAppointment}</span>
            </span>
            <span className="flex h-8 items-center gap-1 rounded-md px-2.5 text-[12px] font-medium capitalize ring-1 ring-line">
              {copy.view}
              <ChevronDownIcon className="h-3.5 w-3.5 text-muted" />
            </span>
          </div>
        </div>

        <div className="grid shrink-0 border-b border-line" style={{ gridTemplateColumns: "2.75rem repeat(4, minmax(0, 1fr))" }}>
          <div className="border-r border-line" />
          {calendarStaff.map((member) => (
            <div
              key={member.id}
              className="flex min-h-[68px] flex-col items-center justify-center gap-1 border-r border-line px-2 py-2 last:border-r-0"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-shell text-[11px] font-semibold shadow-soft ring-1 ring-line">
                {member.firstName[0]}
                {member.lastName[0]}
              </span>
              <div className="w-full text-center leading-tight">
                <p className="truncate text-[12px] font-medium">{member.firstName}</p>
                <p className="truncate text-[10px] text-muted">{member.lastName}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="relative min-h-0 flex-1">
          <div className="absolute inset-0 grid" style={{ gridTemplateColumns: "2.75rem repeat(4, minmax(0, 1fr))" }}>
            <div className="relative border-r border-line bg-white">
              {HOURS.map((hour, index) => (
                <div key={hour} className="relative border-b border-line/80" style={{ height: `${100 / HOURS.length}%` }}>
                  {index > 0 ? (
                    <span className="absolute -top-2 right-0 bg-white pe-1 text-[10px] text-subtle">
                      {String(hour).padStart(2, "0")}
                    </span>
                  ) : null}
                </div>
              ))}
              <span className="absolute right-0 z-20 h-2 w-2 -translate-y-1/2 rounded-full bg-red-500" style={{ top: nowTop }} />
            </div>
            {calendarStaff.map((member) => (
              <div key={member.id} className="relative border-r border-line last:border-r-0">
                {HOURS.map((hour) => (
                  <div key={hour} className="border-b border-line/80" style={{ height: `${100 / HOURS.length}%` }} />
                ))}
                {calendarAppointments
                  .filter((appointment) => appointment.staffId === member.id)
                  .map((appointment) => (
                    <AppointmentBlock
                      key={appointment.id}
                      appointment={appointment}
                      color={member.color}
                      label={translateTreatment(locale, appointment.treatment)}
                      top={offset(toMinutes(appointment.start))}
                      height={`${(appointment.duration / SPAN) * 100}%`}
                      selected={appointment.id === selectedAppointmentId}
                    />
                  ))}
              </div>
            ))}
          </div>
          <div className="pointer-events-none absolute left-11 right-0 z-20 h-0.5 bg-red-500" style={{ top: nowTop }} />
        </div>

        {showDetail ? (
          <aside className="absolute bottom-3 right-3 top-[60px] z-30 flex w-[300px] flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-float">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <p className="text-[16px] font-semibold">{copy.sheetTitle}</p>
              <span className="flex items-center gap-1 text-muted">
                <WalletIcon className="h-4 w-4" />
                <XIcon className="h-4 w-4" />
              </span>
            </div>
            <div className="min-h-0 flex-1 space-y-5 overflow-hidden px-5 py-4">
              <div className="flex items-start gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-shell text-[15px] font-semibold text-ink">
                  CD
                </span>
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold">{detail.client}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-[12px] text-muted">
                    <PhoneIcon className="h-3.5 w-3.5" />
                    {detail.phone}
                    <span className="text-line-strong">•</span>
                    <MailIcon className="h-3.5 w-3.5" />
                    <span className="truncate">{detail.email}</span>
                  </p>
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-[11px] font-medium text-muted">{copy.treatment}</p>
                <div className="rounded-lg border border-line bg-canvas px-3 py-2.5 text-[13px]">
                  <p className="font-medium">{translateTreatment(locale, detail.treatment)}</p>
                  <p className="mt-0.5 text-[12px] text-muted">{copy.variant}</p>
                  <p className="mt-1 text-[11px] text-subtle">{detail.professional}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-2.5">
                  <CalendarIcon className="mt-0.5 h-4 w-4 text-subtle" />
                  <div>
                    <p className="text-[13px] font-semibold">{copy.sheetDate}</p>
                    <p className="text-[12px] text-muted">{detail.time}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <UserRoundIcon className="h-4 w-4 text-subtle" />
                  <p className="text-[13px] font-semibold">{detail.professional}</p>
                </div>
              </div>
              <div>
                <p className="mb-1 text-[11px] font-medium text-muted">{copy.clientNotes}</p>
                <p className="text-[12px] leading-relaxed text-ink/80">{copy.note}</p>
              </div>
              <div className="border-t border-line pt-4">
                <p className="text-[14px] font-semibold">{copy.history}</p>
                <div className="mt-3 flex gap-2.5">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-sage-500" />
                  <div>
                    <p className="text-[12px] font-medium">{copy.historyItem}</p>
                    <p className="text-[11px] text-muted">{copy.historyDate}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-line px-4 py-3">
              <span className="flex items-center gap-1.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-md ring-1 ring-line">
                  <Trash2Icon className="h-3.5 w-3.5" />
                </span>
                <span className="flex h-8 w-8 items-center justify-center rounded-md ring-1 ring-line">
                  <PencilIcon className="h-3.5 w-3.5" />
                </span>
              </span>
              <span className="flex h-8 items-center rounded-md px-3 text-[12px] font-medium ring-1 ring-line">
                {copy.close}
              </span>
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
