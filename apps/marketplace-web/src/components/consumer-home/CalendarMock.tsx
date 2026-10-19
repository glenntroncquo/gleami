import { localeConfig, type Locale } from "@/lib/i18n";
import { appointments, staff, weeklyRevenue } from "./data";
import type { HomeCopy } from "./messages";
import type { Tone } from "./types";

const HOUR = 52;
const START = 9;
const HOURS = [9, 10, 11, 12, 13];

const toneBlock: Record<Tone, string> = {
  teal: "bg-teal-light border-teal",
  green: "bg-green-light border-green",
  orchid: "bg-orchid-light border-orchid",
  amber: "bg-amber-light border-amber",
};

const toneDot: Record<Tone, string> = {
  teal: "bg-teal",
  green: "bg-green",
  orchid: "bg-orchid",
  amber: "bg-amber",
};

const toneText: Record<Tone, string> = {
  teal: "text-teal",
  green: "text-green",
  orchid: "text-orchid",
  amber: "text-amber",
};

function timeLabel(hour: number): string {
  const hours = Math.floor(hour);
  const minutes = hour % 1 ? "30" : "00";
  return `${hours}:${minutes}`;
}

type CalendarMockProps = {
  locale: Locale;
  copy: HomeCopy;
};

export function CalendarMock({ locale, copy }: CalendarMockProps) {
  const max = Math.max(...weeklyRevenue);
  const dateLabel = new Intl.DateTimeFormat(localeConfig[locale].htmlLang, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(2026, 9, 8));
  const revenueLabel = new Intl.NumberFormat(localeConfig[locale].htmlLang, {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(8420);

  return (
    <div className="relative" aria-hidden="true">
      <div className="rounded-[28px] bg-surface p-3 sm:p-4">
        <div className="overflow-hidden rounded-[20px] bg-white">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <div>
              <p className="text-xs text-ink-faint">Atelier Nord</p>
              <p className="font-semibold text-navy">{dateLabel}</p>
            </div>
            <span className="rounded-full bg-peri-tint px-3 py-1 text-xs font-semibold text-peri-dark">{copy.mockToday}</span>
          </div>

          <div className="grid grid-cols-[44px_repeat(3,1fr)] border-b border-line text-sm">
            <span />
            {staff.map((person) => (
              <span key={person.name} className="flex items-center gap-2 border-l border-line px-3 py-2.5 font-medium text-navy">
                <span className={`h-2 w-2 rounded-full ${toneDot[person.tone]}`} />
                {person.name}
              </span>
            ))}
          </div>

          <div className="relative grid grid-cols-[44px_repeat(3,1fr)]" style={{ height: HOUR * HOURS.length }}>
            <div>
              {HOURS.map((hour) => (
                <div key={hour} className="pr-2 pt-1 text-right text-[11px] text-ink-faint" style={{ height: HOUR }}>
                  {hour}:00
                </div>
              ))}
            </div>
            {staff.map((person, column) => (
              <div key={person.name} className="relative border-l border-line">
                {HOURS.map((hour) => (
                  <div key={hour} className="border-b border-line/70" style={{ height: HOUR }} />
                ))}
                {appointments
                  .filter((appointment) => appointment.staff === column)
                  .map((appointment) => (
                    <div
                      key={appointment.id}
                      className={`absolute inset-x-1.5 overflow-hidden rounded-lg border-l-[3px] px-2 py-1.5 ${toneBlock[appointment.tone]}`}
                      style={{ top: (appointment.start - START) * HOUR + 2, height: appointment.duration * HOUR - 4 }}
                    >
                      <p className={`text-[11px] font-semibold ${toneText[appointment.tone]}`}>{timeLabel(appointment.start)}</p>
                      <p className="truncate text-xs font-semibold text-navy">{appointment.title}</p>
                      {appointment.duration >= 1 ? <p className="truncate text-[11px] text-ink-muted">{appointment.client}</p> : null}
                    </div>
                  ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-white p-4 shadow-float sm:absolute sm:-bottom-10 sm:-left-8 sm:mt-0 sm:w-[240px]">
        <p className="text-xs text-ink-faint">{copy.mockRevenue}</p>
        <div className="mt-1 flex items-baseline gap-2">
          <p className="text-2xl font-semibold tracking-tight text-navy">{revenueLabel}</p>
          <span className="text-xs font-semibold text-green">+12%</span>
        </div>
        <div className="mt-3 flex h-14 items-end gap-1.5">
          {weeklyRevenue.map((value, index) => (
            <span
              key={index}
              className={`flex-1 rounded-[4px] ${index === 5 ? "bg-peri" : "bg-peri-soft"}`}
              style={{ height: `${(value / max) * 100}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
