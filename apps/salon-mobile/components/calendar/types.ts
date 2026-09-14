export type CalendarDay = {
  date: number;
  inMonth: boolean;
  isSunday?: boolean;
  dateKey: string;
};

export type CalendarWeek = {
  weekNumber: number;
  days: CalendarDay[];
};

export type EventPhase = {
  id: string;
  phase_type: 'busy' | 'free';
  minutes: number;
};

export type EventItem = {
  /** Appointment id — one calendar event per visit. */
  id: string;
  appointmentId: string;
  label: string;
  /** Saturated accent color — used for thin bars/dots. */
  color: string;
  /** Pastel chip background, paired with textColor. */
  bgColor: string;
  /** Readable text color on top of bgColor. */
  textColor: string;
  clientName: string;
  clientId: string | null;
  staffName: string;
  staffId: string | null;
  staffIds: string[];
  startTime: string;
  endTime: string;
  /** Naive salon wall-clock `appointment.start`. */
  startISO: string;
  /** Naive salon wall-clock `appointment.end`. */
  endISO: string;
  /** Client-facing busy+free phases, scaled onto start/end. Buffer is omitted. */
  phases: EventPhase[];
  canceled: boolean;
};

export type MonthData = {
  key: string;
  label: string;
  year: number;
  monthIndex: number;
  weeks: CalendarWeek[];
  events: Record<string, EventItem[]>;
  inMonthKeys: Set<string>;
  firstDateKey: string;
};

export type WeekDayData = {
  dateKey: string;
  date: number;
  weekday: string;
  isSunday: boolean;
  appointments: EventItem[];
};

export type ListFlatItem =
  | { kind: 'header'; key: string; dateKey: string; title: string; isToday: boolean }
  | { kind: 'row'; key: string; dateKey: string; event: EventItem };
