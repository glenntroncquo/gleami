import type { Tone } from '../utils/tones';

export type AppointmentStatus = 'completed' | 'in-progress' | 'confirmed' | 'pending' | 'break';

export type StaffMember = {
  id: string;
  name: string;
  role: string;
  tone: Tone;
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