import type { Appointment, StaffMember } from '../types/calendar';

export const calendarDateLabel = 'Tuesday, 29 September';

export const calendarStaff: StaffMember[] = [
{ id: 'emma', name: 'Emma', role: 'Senior stylist', tone: 'rose', hours: '9:00–18:00' },
{ id: 'lucas', name: 'Lucas', role: 'Barber', tone: 'sky', hours: '9:00–17:30' },
{ id: 'sofia', name: 'Sofia', role: 'Nail artist', tone: 'sage', hours: '9:00–17:00' },
{ id: 'mila', name: 'Mila', role: 'Lash & brow artist', tone: 'lilac', hours: '9:30–16:30' }];


export const calendarSummary = ['19 appointments', '5 booked online', '86% booked', '€1,284 taken today'];

export const selectedAppointmentId = 'a2';

export const calendarNow = '11:40';

export const calendarAppointments: Appointment[] = [
{ id: 'a1', staffId: 'emma', client: 'Lea Martens', treatment: 'Cut & blow-dry', start: '09:00', duration: 60, status: 'completed' },
{ id: 'a2', staffId: 'emma', client: 'Charlotte De Smet', treatment: 'Balayage', start: '10:15', duration: 105, status: 'in-progress' },
{ id: 'a3', staffId: 'emma', client: 'Julie Peeters', treatment: 'Blow-dry', start: '12:30', duration: 45, status: 'confirmed', online: true },
{ id: 'a4', staffId: 'emma', client: 'Sarah Janssens', treatment: 'Colour & cut', start: '14:00', duration: 90, status: 'confirmed' },
{ id: 'a5', staffId: 'emma', client: 'Anna Claes', treatment: 'Cut', start: '16:00', duration: 60, status: 'pending', online: true },

{ id: 'b1', staffId: 'lucas', client: 'Tom Wouters', treatment: 'Skin fade', start: '09:15', duration: 30, status: 'completed' },
{ id: 'b2', staffId: 'lucas', client: 'Jonas Maes', treatment: 'Cut & beard', start: '09:45', duration: 45, status: 'completed' },
{ id: 'b3', staffId: 'lucas', client: 'Arne Jacobs', treatment: 'Beard trim', start: '11:15', duration: 30, status: 'in-progress' },
{ id: 'b4', staffId: 'lucas', client: 'Victor Dubois', treatment: 'Classic cut', start: '13:00', duration: 45, status: 'confirmed', online: true },
{ id: 'b5', staffId: 'lucas', client: 'Milan Leroy', treatment: 'Skin fade', start: '14:15', duration: 30, status: 'confirmed' },
{ id: 'b6', staffId: 'lucas', client: 'Kobe Willems', treatment: 'Cut & hot towel', start: '15:30', duration: 60, status: 'confirmed' },

{ id: 'c1', staffId: 'sofia', client: 'Nina Hermans', treatment: 'Gel manicure', start: '09:00', duration: 75, status: 'completed' },
{ id: 'c2', staffId: 'sofia', client: 'Eva Lambert', treatment: 'Pedicure', start: '10:45', duration: 60, status: 'in-progress' },
{ id: 'c3', staffId: 'sofia', client: 'Laura Goossens', treatment: 'Nail art set', start: '13:30', duration: 90, status: 'confirmed', online: true },
{ id: 'c4', staffId: 'sofia', client: 'Marie Dupont', treatment: 'Gel removal & manicure', start: '15:30', duration: 60, status: 'pending' },

{ id: 'd1', staffId: 'mila', client: 'Hanne Vos', treatment: 'Lash lift', start: '09:30', duration: 60, status: 'completed' },
{ id: 'd2', staffId: 'mila', client: 'Elise Smets', treatment: 'Brow lamination', start: '11:00', duration: 45, status: 'in-progress' },
{ id: 'd3', staffId: 'mila', client: '', treatment: 'Lunch break', start: '12:00', duration: 45, status: 'break' },
{ id: 'd4', staffId: 'mila', client: 'Fien Aerts', treatment: 'Lash extensions', start: '13:00', duration: 90, status: 'confirmed', online: true },
{ id: 'd5', staffId: 'mila', client: 'Lotte Mertens', treatment: 'Brow shape & tint', start: '15:00', duration: 45, status: 'confirmed' }];


export const selectedAppointmentDetail = {
  client: 'Charlotte De Smet',
  clientMeta: 'Regular · 14 visits',
  treatment: 'Balayage',
  time: '10:15 – 12:00',
  durationLabel: '105 min',
  professional: 'Emma',
  note: 'Sensitive scalp — use the low-ammonia colour line. Likes an oat flat white.',
  price: '€145.00'
};