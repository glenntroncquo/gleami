import i18n from '@/lib/i18n';

import { BASE_MONTH_INDEX, BASE_YEAR } from './constants';

function weekdaysLong(): string[] {
  return i18n.t('calendar.weekdaysLong', { returnObjects: true }) as string[];
}

function weekdaysShort(): string[] {
  return i18n.t('calendar.weekdaysShort', { returnObjects: true }) as string[];
}

function monthsLong(): string[] {
  return i18n.t('calendar.monthsLong', { returnObjects: true }) as string[];
}

function monthsShort(): string[] {
  return i18n.t('calendar.monthsShort', { returnObjects: true }) as string[];
}

export function getMonthShortLabel(monthIndex: number) {
  return monthsShort()[monthIndex];
}

export function toDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getISOWeekNumber(date: Date) {
  const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  return Math.ceil((((tmp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export function addMonths(baseYear: number, baseMonth: number, offset: number) {
  const total = baseYear * 12 + baseMonth + offset;
  const year = Math.floor(total / 12);
  const monthIndex = total % 12;
  return { year, monthIndex };
}

export function getOffsetForDate(date: Date) {
  const year = date.getFullYear();
  const monthIndex = date.getMonth();
  return year * 12 + monthIndex - (BASE_YEAR * 12 + BASE_MONTH_INDEX);
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(date.getDate() + days);
  return next;
}

export function getWeekStartMonday(date: Date) {
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  return addDays(new Date(date.getFullYear(), date.getMonth(), date.getDate()), mondayOffset);
}

export function getWeekOffsetFromBase(baseWeekStart: Date, dateKey: string) {
  const target = getWeekStartMonday(new Date(dateKey));
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  return Math.round((target.getTime() - baseWeekStart.getTime()) / msPerWeek);
}

export function getFullDateLabel(dateKey: string) {
  const date = new Date(dateKey);
  return `${weekdaysLong()[date.getDay()]}, ${date.getDate()} ${monthsLong()[date.getMonth()]} ${date.getFullYear()}`;
}

export function getListHeaderLabel(dateKey: string) {
  const date = new Date(dateKey);
  return `${weekdaysShort()[date.getDay()]}, ${date.getDate()} ${monthsShort()[date.getMonth()]} ${date.getFullYear()}`;
}

export function getWeekdayLong(date: Date) {
  return weekdaysLong()[date.getDay()];
}

export function formatTime(iso: string) {
  const date = new Date(iso);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/** Naive salon wall-clock: `2026-09-06T14:00:00Z` means 14:00 at the salon, not UTC. */
const NAIVE_WALL_CLOCK = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/;

export function parseSalonWallClock(value: string): Date {
  const match = value.match(NAIVE_WALL_CLOCK);
  if (!match) return new Date(value);
  return new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    Number(match[6] ?? 0)
  );
}

export function formatSalonWallClock(value: string): string {
  const match = value.match(NAIVE_WALL_CLOCK);
  if (match) return `${match[4]}:${match[5]}`;
  return formatTime(value);
}

export function toDateKeyFromSalonClock(value: string): string {
  const match = value.match(NAIVE_WALL_CLOCK);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  return toDateKey(parseSalonWallClock(value));
}

export function minutesBetweenWallClock(start: string, end: string): number {
  const ms = parseSalonWallClock(end).getTime() - parseSalonWallClock(start).getTime();
  return Math.max(0, Math.round(ms / 60000));
}

/**
 * Builds the appointment `start`/`end` string format the backend still expects:
 * local wall-clock date/time parts with a literal "Z" suffix (not a real UTC conversion).
 */
export function toFakeUtcISOString(date: Date, hours: number, minutes: number) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  return `${y}-${m}-${d}T${hh}:${mm}:00Z`;
}
