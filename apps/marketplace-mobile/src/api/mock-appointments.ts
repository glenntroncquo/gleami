import type { MyAppointment } from '@/src/api/appointments';

/** ISO without the trailing Z, matching the database's naive-UTC serialization. */
function naiveUtc(date: Date): string {
  return date.toISOString().slice(0, 19);
}

function sample(offsetDays: number, hour: number, overrides: Partial<MyAppointment> = {}): MyAppointment {
  const start = new Date();
  start.setUTCDate(start.getUTCDate() + offsetDays);
  start.setUTCHours(hour, 0, 0, 0);
  const end = new Date(start.getTime() + 45 * 60_000);
  return {
    id: `mock-${offsetDays}-${hour}`,
    startsAt: naiveUtc(start),
    endsAt: naiveUtc(end),
    status: 'confirmed',
    isCanceled: false,
    price: 45,
    locationId: 'mock-location',
    locationName: 'Salon Lumière',
    locationSlug: 'salon-lumiere',
    locationCity: 'Gent',
    locationImageUrl: null,
    locationTimezone: 'Europe/Brussels',
    services: ['Knippen', 'Brushing'],
    ...overrides,
  };
}

export function mockMyAppointments(): MyAppointment[] {
  return [
    sample(3, 10),
    sample(12, 14, {
      locationName: 'Kapsalon Noor',
      locationSlug: 'kapsalon-noor',
      locationCity: 'Antwerpen',
      services: ['Balayage'],
      price: 85,
    }),
    sample(-9, 9, { services: ['Knippen'], price: 38 }),
    sample(6, 16, { isCanceled: true, services: ['Herenknippen'], price: 28 }),
  ];
}
