export type AutomationKind = 'confirmation' | 'reminder' | 'cancellation' | 'staff' | 'message' | 'reschedule';

export const automationEvents: {id: number;kind: AutomationKind;title: string;detail: string;}[] = [
{ id: 1, kind: 'confirmation', title: 'Booking confirmed', detail: 'Confirmation sent to Julie Peeters · Blow-dry, Tue 12:30' },
{ id: 2, kind: 'reminder', title: 'Reminder sent', detail: 'Fien Aerts · Lash extensions tomorrow at 13:00' },
{ id: 3, kind: 'cancellation', title: 'Cancellation handled', detail: 'The 15:30 slot with Sofia is open for online booking again' },
{ id: 4, kind: 'staff', title: 'Team notified', detail: 'Emma was told about a new booking at 16:00' },
{ id: 5, kind: 'reschedule', title: 'Appointment moved', detail: 'Anna Claes moved to 15:45 · client and Emma updated' },
{ id: 6, kind: 'message', title: 'Follow-up sent', detail: 'Thank-you message sent to Lea Martens' },
{ id: 7, kind: 'reminder', title: 'Reminder scheduled', detail: 'Sarah Janssens will be reminded the day before' }];


export const automationTasks = [
'Booking confirmations',
'Appointment reminders',
'Cancellations and freed-up slots',
'Staff notifications',
'Client communication'];