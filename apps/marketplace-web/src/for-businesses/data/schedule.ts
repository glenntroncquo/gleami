import type { Appointment, StaffMember } from '../types/calendar';

export const scheduleStaff: StaffMember[] = [
{ id: 'emma', name: 'Emma', role: 'Senior stylist', tone: 'rose', hours: '9:00–18:00' },
{ id: 'lucas', name: 'Lucas', role: 'Barber', tone: 'sky', hours: '9:00–17:30' },
{ id: 'sofia', name: 'Sofia', role: 'Nail artist', tone: 'sage', hours: '9:00–17:00' }];


export const scheduleAppointments: Appointment[] = [
{ id: 's1', staffId: 'emma', client: 'Julie Peeters', treatment: 'Blow-dry', start: '12:00', duration: 45, status: 'confirmed', online: true },
{ id: 's3', staffId: 'emma', client: 'Sarah Janssens', treatment: 'Colour & cut', start: '14:15', duration: 75, status: 'confirmed' },
{ id: 's4', staffId: 'lucas', client: 'Tom Wouters', treatment: 'Skin fade', start: '12:00', duration: 30, status: 'completed' },
{ id: 's5', staffId: 'lucas', client: 'Victor Dubois', treatment: 'Classic cut', start: '13:00', duration: 45, status: 'confirmed', online: true },
{ id: 's6', staffId: 'lucas', client: 'Milan Leroy', treatment: 'Skin fade', start: '14:00', duration: 30, status: 'pending' },
{ id: 's7', staffId: 'lucas', client: 'Kobe Willems', treatment: 'Cut & hot towel', start: '15:00', duration: 60, status: 'confirmed' },
{ id: 's8', staffId: 'sofia', client: 'Laura Goossens', treatment: 'Nail art set', start: '12:00', duration: 90, status: 'in-progress' },
{ id: 's9', staffId: 'sofia', client: 'Marie Dupont', treatment: 'Gel manicure', start: '14:00', duration: 60, status: 'confirmed' },
{ id: 's10', staffId: 'sofia', client: 'Nina Hermans', treatment: 'Pedicure', start: '15:30', duration: 75, status: 'pending' }];


export const movingAppointment: Appointment = {
  id: 's2',
  staffId: 'emma',
  client: 'Anna Claes',
  treatment: 'Cut & blow-dry',
  start: '13:00',
  duration: 60,
  status: 'confirmed'
};

export const movingTarget = '15:45';

export const popoverAppointment = {
  id: 's9',
  client: 'Marie Dupont',
  phone: '+32 ··· ·· ·· 41',
  treatment: 'Gel manicure',
  time: '14:00 – 15:00',
  duration: '60 min',
  visits: '6 visits · last on 18 Aug',
  note: 'Prefers almond shape, neutral tones.'
};

export const weekOverview = [
{ day: 'Mon', date: 28, count: 21, load: 0.74 },
{ day: 'Tue', date: 29, count: 19, load: 0.86, today: true },
{ day: 'Wed', date: 30, count: 16, load: 0.62 },
{ day: 'Thu', date: 1, count: 23, load: 0.9 },
{ day: 'Fri', date: 2, count: 25, load: 0.95 },
{ day: 'Sat', date: 3, count: 18, load: 0.8 },
{ day: 'Sun', date: 4, count: 0, load: 0, closed: true }];


export const calendarCapabilities = [
{ title: 'Day and week views', body: 'Zoom into today or plan the week ahead across your whole team.' },
{ title: 'Drag to reschedule', body: 'Move an appointment to a new time or colleague in one gesture.' },
{ title: 'Status at a glance', body: 'Confirmed, checked in, in progress or completed — colour-coded and clear.' },
{ title: 'Everything on the appointment', body: 'Treatment, duration, client details and notes, one click away.' }];