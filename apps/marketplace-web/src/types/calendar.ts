import type { Tone } from '../utils/tones';

export type AppointmentStatus = 'completed' | 'in-progress' | 'confirmed' | 'pending' | 'break';

export type EventColor = 'blue' | 'violet' | 'emerald' | 'orange' | 'pink';

export type StaffMember = {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  role: string;
  tone: Tone;
  color: EventColor;
  hours: string;
};

export type Appointment = {
  id: string;
  staffId: string;
  client: string;
  treatment: string;
  start: string;
  duration: number;
  status: AppointmentStatus;
  online?: boolean;
};