import type { Tone } from '../utils/tones';

export type FeatureRow = {
  primary: string;
  secondary: string;
  meta?: string;
  badge?: {label: string;tone: Tone;};
  tone?: Tone;
  progress?: number;
};

export type Feature = {
  id: 'calendar' | 'booking' | 'clients' | 'staff' | 'treatments' | 'payments' | 'inventory' | 'insights';
  name: string;
  description: string;
  panelTitle: string;
  panelMeta: string;
  highlight: {value: string;label: string;};
  rowStyle: 'avatar' | 'plain';
  rows: FeatureRow[];
};

export const features: Feature[] = [
{
  id: 'calendar',
  name: 'Smart calendar',
  description: 'Plan the whole team’s day in one view that understands treatment durations, breaks and availability.',
  panelTitle: 'Today',
  panelMeta: 'Tuesday 29 September',
  highlight: { value: '19', label: 'appointments across 4 professionals' },
  rowStyle: 'avatar',
  rows: [
  { primary: 'Charlotte De Smet', secondary: 'Balayage · Emma', meta: '10:15', tone: 'rose', badge: { label: 'In progress', tone: 'rose' } },
  { primary: 'Arne Jacobs', secondary: 'Beard trim · Lucas', meta: '11:15', tone: 'sky', badge: { label: 'Checked in', tone: 'sky' } },
  { primary: 'Julie Peeters', secondary: 'Blow-dry · Emma', meta: '12:30', tone: 'rose', badge: { label: 'Booked online', tone: 'lilac' } },
  { primary: 'Laura Goossens', secondary: 'Nail art set · Sofia', meta: '13:30', tone: 'sage', badge: { label: 'Confirmed', tone: 'neutral' } }]

},
{
  id: 'booking',
  name: 'Online booking',
  description: 'Clients book 24/7 from your booking link, your profile or the marketplace — straight into your calendar.',
  panelTitle: 'New bookings',
  panelMeta: 'Since yesterday',
  highlight: { value: '5', label: 'appointments booked online today' },
  rowStyle: 'avatar',
  rows: [
  { primary: 'Julie Peeters', secondary: 'Blow-dry · Tue 12:30', meta: '2 min ago', tone: 'lilac', badge: { label: 'Marketplace', tone: 'lilac' } },
  { primary: 'Fien Aerts', secondary: 'Lash extensions · Tue 13:00', meta: '1 h ago', tone: 'sky', badge: { label: 'Website', tone: 'sky' } },
  { primary: 'Victor Dubois', secondary: 'Classic cut · Tue 13:00', meta: '3 h ago', tone: 'rose', badge: { label: 'Booking link', tone: 'rose' } },
  { primary: 'Anna Claes', secondary: 'Cut · Tue 16:00', meta: 'Yesterday', tone: 'neutral', badge: { label: 'Guest', tone: 'neutral' } }]

},
{
  id: 'clients',
  name: 'Client management',
  description: 'Every client’s history, preferences and notes — ready before they sit down in the chair.',
  panelTitle: 'Clients',
  panelMeta: 'Sorted by last visit',
  highlight: { value: '412', label: 'clients in your salon' },
  rowStyle: 'avatar',
  rows: [
  { primary: 'Charlotte De Smet', secondary: '14 visits · Balayage', meta: '€1,120', tone: 'rose', badge: { label: 'Regular', tone: 'rose' } },
  { primary: 'Tom Wouters', secondary: '22 visits · Skin fade', meta: '€594', tone: 'sky', badge: { label: 'Regular', tone: 'rose' } },
  { primary: 'Lea Martens', secondary: '9 visits · Cut & blow-dry', meta: '€486', tone: 'sand' },
  { primary: 'Eva Lambert', secondary: 'First visit · Pedicure', meta: '€48', tone: 'sage', badge: { label: 'New', tone: 'sage' } }]

},
{
  id: 'staff',
  name: 'Staff management',
  description: 'Schedules, treatments and access rights for every team member, managed from one place.',
  panelTitle: 'Team today',
  panelMeta: '4 of 5 working',
  highlight: { value: '86%', label: 'of today’s available time booked' },
  rowStyle: 'avatar',
  rows: [
  { primary: 'Emma Vermeulen', secondary: 'Senior stylist', meta: '9:00–18:00', tone: 'rose', badge: { label: '5 appointments', tone: 'neutral' } },
  { primary: 'Lucas Bogaert', secondary: 'Barber', meta: '9:00–17:30', tone: 'sky', badge: { label: '6 appointments', tone: 'neutral' } },
  { primary: 'Sofia Mertens', secondary: 'Nail artist', meta: '9:00–17:00', tone: 'sage', badge: { label: '4 appointments', tone: 'neutral' } },
  { primary: 'Mila Claessens', secondary: 'Lash & brow artist', meta: '9:30–16:30', tone: 'lilac', badge: { label: '4 appointments', tone: 'neutral' } }]

},
{
  id: 'treatments',
  name: 'Treatments & pricing',
  description: 'Your full menu with durations, prices and who performs what — always in sync with online booking.',
  panelTitle: 'Treatment menu',
  panelMeta: '6 categories',
  highlight: { value: '38', label: 'treatments on your menu' },
  rowStyle: 'plain',
  rows: [
  { primary: 'Cut & blow-dry', secondary: 'Hair · 60 min', meta: '€58' },
  { primary: 'Balayage', secondary: 'Colour · 150 min', meta: 'from €145' },
  { primary: 'Gel manicure', secondary: 'Nails · 60 min', meta: '€45' },
  { primary: 'Brow lamination', secondary: 'Lashes & brows · 45 min', meta: '€55' }]

},
{
  id: 'payments',
  name: 'Payments & checkout',
  description: 'Check clients out right after their appointment and keep every transaction in one clear overview.',
  panelTitle: 'Transactions',
  panelMeta: 'Today',
  highlight: { value: '€1,284', label: 'taken today' },
  rowStyle: 'avatar',
  rows: [
  { primary: 'Lea Martens', secondary: 'Cut & blow-dry · 09:58', meta: '€58.00', tone: 'sand', badge: { label: 'Paid', tone: 'sage' } },
  { primary: 'Tom Wouters', secondary: 'Skin fade · 09:46', meta: '€28.00', tone: 'sky', badge: { label: 'Paid', tone: 'sage' } },
  { primary: 'Hanne Vos', secondary: 'Lash lift · 10:32', meta: '€65.00', tone: 'lilac', badge: { label: 'Paid', tone: 'sage' } },
  { primary: 'Jonas Maes', secondary: 'Beard oil · 10:40', meta: '€18.00', tone: 'neutral', badge: { label: 'Refunded', tone: 'neutral' } }]

},
{
  id: 'inventory',
  name: 'Inventory',
  description: 'Track professional and retail products, and see what’s running low before it runs out.',
  panelTitle: 'Stock',
  panelMeta: 'Retail & professional',
  highlight: { value: '3', label: 'products running low' },
  rowStyle: 'plain',
  rows: [
  { primary: 'Repair shampoo 250 ml', secondary: 'Retail · 4 left', progress: 0.15, badge: { label: 'Low', tone: 'rose' } },
  { primary: 'Colour gloss 7.1', secondary: 'Professional · 6 left', progress: 0.3, badge: { label: 'Low', tone: 'rose' } },
  { primary: 'Gel top coat', secondary: 'Professional · 18 left', progress: 0.7 },
  { primary: 'Styling cream', secondary: 'Retail · 24 left', progress: 0.85 }]

},
{
  id: 'insights',
  name: 'Business insights',
  description: 'Revenue, occupancy and returning clients at a glance — no spreadsheets required.',
  panelTitle: 'This month',
  panelMeta: 'September',
  highlight: { value: '€18,420', label: 'revenue this month' },
  rowStyle: 'plain',
  rows: [
  { primary: 'Occupancy', secondary: 'Across all professionals', meta: '81%', progress: 0.81 },
  { primary: 'Returning clients', secondary: 'Visited before', meta: '68%', progress: 0.68 },
  { primary: 'Booked online', secondary: 'Share of all bookings', meta: '44%', progress: 0.44 },
  { primary: 'Average ticket', secondary: 'Per appointment', meta: '€62' }]

}];