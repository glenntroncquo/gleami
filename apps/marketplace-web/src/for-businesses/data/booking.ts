export const bookingSalon = { name: 'Atelier Noor', location: 'Ghent' };

export const bookingCategories = ['Hair', 'Colour', 'Nails', 'Lashes & brows'];

export const bookingTreatments = [
{ name: 'Cut & blow-dry', duration: '60 min', price: '€58', selected: true },
{ name: 'Blow-dry', duration: '45 min', price: '€38' },
{ name: 'Balayage', duration: '150 min', price: 'from €145' },
{ name: 'Gloss treatment', duration: '30 min', price: '€32' }];


export const bookingProfessionals = [
{ name: 'Emma', role: 'Senior stylist', next: 'Next free: today 15:30', tone: 'rose' as const, selected: true },
{ name: 'Lucas', role: 'Stylist & barber', next: 'Next free: today 16:15', tone: 'sky' as const }];


export const bookingDays = [
{ day: 'Mon', date: 28, disabled: true },
{ day: 'Tue', date: 29, selected: true },
{ day: 'Wed', date: 30 },
{ day: 'Thu', date: 1 },
{ day: 'Fri', date: 2 }];


export const bookingSlots = {
  afternoon: [
  { time: '13:15' },
  { time: '14:00', taken: true },
  { time: '15:30', selected: true },
  { time: '16:15' },
  { time: '17:00' },
  { time: '17:45' }],

  evening: [{ time: '18:15' }, { time: '18:45', taken: true }]
};

export const bookingSteps = ['Choose treatment', 'Choose professional', 'Select a time', 'Confirm booking'];

export const bookingBenefits = [
{
  title: 'Open 24/7',
  body: 'Clients book whenever it suits them — evenings, weekends, or between their own appointments.'
},
{
  title: 'Real-time availability',
  body: 'Only genuinely free times appear, based on your team’s schedules and treatment durations.'
},
{
  title: 'Guest booking',
  body: 'No account needed. Clients book with just their name and contact details.'
},
{
  title: 'Automatic confirmations',
  body: 'Every booking is confirmed straight away, without you lifting a finger.'
},
{
  title: 'Fewer calls and messages',
  body: 'Less time on the phone and in your inbox. More time for the client in your chair.'
}];


export const bookingLink = 'gleami.app/atelier-noor';