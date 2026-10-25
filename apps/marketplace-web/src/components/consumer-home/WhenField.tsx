"use client";

import { useEffect, useState } from "react";
import { ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { localeConfig, type Locale } from "@/lib/i18n";
import type { HomeCopy } from "./messages";
import { searchFieldClass } from "./search-field";

export type WhenPart = "any" | "morning" | "afternoon" | "evening";

export type WhenValue = {
  date: string | null;
  part: WhenPart;
};

type WhenFieldProps = {
  locale: Locale;
  copy: HomeCopy;
  value: WhenValue;
  compact?: boolean;
  onChange: (value: WhenValue) => void;
};

export function WhenField({ locale, copy, value, compact = false, onChange }: WhenFieldProps) {
  const language = localeConfig[locale].htmlLang;
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [view, setView] = useState(() => monthStart(value.date ? parseIso(value.date) : new Date()));
  const phone = usePhone();

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (phone || !root || root.contains(event.target as Node)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    if (phone) document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, phone, root]);

  function openPicker() {
    const next = value;
    setDraft(next);
    setView(monthStart(next.date ? parseIso(next.date) : new Date()));
    setOpen(true);
  }

  function update(next: WhenValue) {
    setDraft(next);
    if (!phone) onChange(next);
  }

  const panel = (
    <DatePanel
      language={language}
      copy={copy}
      value={phone ? draft : value}
      view={view}
      onView={setView}
      onChange={update}
    />
  );

  const label = whenLabel(value, copy, language);

  return (
    <div ref={setRoot} className={compact ? "relative min-w-0 flex-1" : "relative min-w-0 md:flex-1"}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openPicker())}
        className={
          compact
            ? "block h-10 w-full truncate text-left text-[13px] text-navy sm:text-[14px]"
            : `block w-full text-left ${searchFieldClass}`
        }
      >
        {compact ? (
          label
        ) : (
          <>
            <span className="block text-xs font-semibold text-navy">{copy.when}</span>
            <span className="mt-0.5 block truncate text-base text-navy md:text-[15px]">
              {label}
            </span>
          </>
        )}
      </button>

      {open && !phone ? (
        <div className="panel-in absolute right-0 top-full z-40 mt-3 hidden w-[420px] max-w-[calc(100vw-2.5rem)] rounded-3xl bg-white p-4 shadow-float ring-1 ring-line md:block">
          {panel}
        </div>
      ) : null}

      {open && phone ? (
        <div className="panel-in fixed inset-0 z-40 bg-white md:hidden">
        <div className="flex h-full flex-col">
          <div className="flex h-14 items-center gap-3 px-4">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={copy.pickerDone}
              className="flex h-11 w-8 items-center justify-center text-navy"
            >
              <ArrowLeftIcon className="h-6 w-6" aria-hidden="true" />
            </button>
            <h2 className="text-xl font-semibold tracking-tight text-navy">{copy.dateTitle}</h2>
          </div>
          <div className="flex-1 overflow-y-auto px-5 pb-6">{panel}</div>
          <div className="flex gap-3 border-t border-line px-5 py-4">
            <button
              type="button"
              onClick={() => {
                const cleared = { date: null, part: "any" as const };
                setDraft(cleared);
                onChange(cleared);
                setOpen(false);
              }}
              className="h-12 flex-1 rounded-full border border-line text-[15px] font-semibold text-navy"
            >
              {copy.pickerClear}
            </button>
            <button
              type="button"
              onClick={() => {
                onChange(draft);
                setOpen(false);
              }}
              className="h-12 flex-[1.4] rounded-full bg-navy text-[15px] font-semibold text-white"
            >
              {copy.pickerDone}
            </button>
          </div>
        </div>
        </div>
      ) : null}
    </div>
  );
}

function DatePanel({
  language,
  copy,
  value,
  view,
  onView,
  onChange,
}: {
  language: string;
  copy: HomeCopy;
  value: WhenValue;
  view: Date;
  onView: (date: Date) => void;
  onChange: (value: WhenValue) => void;
}) {
  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  const days = monthDays(view);
  const weekday = new Intl.DateTimeFormat(language, { weekday: "short" });
  const weekdays = Array.from({ length: 7 }, (_, index) =>
    weekday.format(new Date(2024, 0, 1 + index)),
  );
  const monthLabel = new Intl.DateTimeFormat(language, {
    month: "short",
    year: "numeric",
  }).format(view);
  const partOptions: { id: WhenPart; label: string; hint: string | null }[] = [
    { id: "any", label: copy.whenAny, hint: null },
    { id: "morning", label: copy.whenMorning, hint: copy.whenMorningHint },
    { id: "afternoon", label: copy.whenAfternoon, hint: copy.whenAfternoonHint },
    { id: "evening", label: copy.whenEvening, hint: copy.whenEveningHint },
  ];
  const canGoBack = view > monthStart(today);

  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <Shortcut
          title={copy.whenToday}
          detail={formatDay(today, language)}
          selected={value.date === iso(today)}
          onClick={() => onChange({ ...value, date: iso(today) })}
        />
        <Shortcut
          title={copy.whenTomorrow}
          detail={formatDay(tomorrow, language)}
          selected={value.date === iso(tomorrow)}
          onClick={() => onChange({ ...value, date: iso(tomorrow) })}
        />
      </div>

      <div className="mt-5 flex items-center justify-between px-1">
        <button
          type="button"
          disabled={!canGoBack}
          onClick={() => onView(addMonths(view, -1))}
          className="flex h-9 w-9 items-center justify-center rounded-full text-navy disabled:text-ink-faint"
          aria-label={copy.when}
        >
          <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
        </button>
        <p className="text-[15px] font-semibold text-navy">{monthLabel}</p>
        <button
          type="button"
          onClick={() => onView(addMonths(view, 1))}
          className="flex h-9 w-9 items-center justify-center rounded-full text-navy"
          aria-label={copy.when}
        >
          <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 text-center text-xs font-medium text-ink-faint">
        {weekdays.map((label) => (
          <span key={label} className="py-2">
            {label}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 text-center">
        {days.map((day) => {
          const key = iso(day);
          const outside = day.getMonth() !== view.getMonth();
          const past = day < today;
          const selected = value.date === key;
          const isToday = key === iso(today);
          return (
            <button
              key={key}
              type="button"
              disabled={past}
              onClick={() => {
                onView(monthStart(day));
                onChange({ ...value, date: key });
              }}
              className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full text-[15px] ${
                selected
                  ? "bg-navy font-semibold text-white"
                  : past
                    ? "text-ink-faint"
                    : isToday
                      ? "font-semibold text-navy ring-1 ring-peri"
                      : outside
                        ? "text-ink-muted"
                        : "text-navy hover:bg-peri-tint"
              }`}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-sm font-semibold text-navy">{copy.when}</p>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {partOptions.map((part) => {
          const selected = value.part === part.id;
          return (
            <button
              key={part.id}
              type="button"
              onClick={() => onChange({ ...value, part: part.id })}
              className={`shrink-0 rounded-2xl border px-4 py-2.5 text-left ${
                selected ? "border-peri bg-peri-tint" : "border-line bg-white"
              }`}
            >
              <span className="block text-[14px] font-semibold text-navy">{part.label}</span>
              {part.hint ? <span className="block text-xs text-ink-muted">{part.hint}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Shortcut({
  title,
  detail,
  selected,
  onClick,
}: {
  title: string;
  detail: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border px-3 py-4 text-center ${
        selected ? "border-peri bg-peri-tint" : "border-line"
      }`}
    >
      <span className="block text-[15px] font-semibold text-navy">{title}</span>
      <span className="mt-0.5 block text-sm text-ink-muted">{detail}</span>
    </button>
  );
}

function whenLabel(value: WhenValue, copy: HomeCopy, language: string) {
  const today = iso(startOfDay(new Date()));
  const tomorrow = iso(addDays(startOfDay(new Date()), 1));
  const day =
    value.date === today
      ? copy.whenToday
      : value.date === tomorrow
        ? copy.whenTomorrow
        : value.date
          ? formatDay(parseIso(value.date), language)
          : null;
  const part =
    value.part === "morning"
      ? copy.whenMorning
      : value.part === "afternoon"
        ? copy.whenAfternoon
        : value.part === "evening"
          ? copy.whenEvening
          : null;
  if (day && part) return `${day} · ${part}`;
  return day ?? part ?? copy.whenAny;
}

function usePhone() {
  const [phone, setPhone] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const update = () => setPhone(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return phone;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function monthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function monthDays(view: Date) {
  const first = monthStart(view);
  const offset = (first.getDay() + 6) % 7;
  const start = addDays(first, -offset);
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

function iso(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function parseIso(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDay(date: Date, language: string) {
  return new Intl.DateTimeFormat(language, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}
