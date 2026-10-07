import type { Tone } from '../utils/tones';

export const teamMembers: {name: string;role: string;tone: Tone;status: string;working: boolean;selected?: boolean;}[] = [
{ name: 'Emma Vermeulen', role: 'Senior stylist', tone: 'rose', status: 'Working today', working: true, selected: true },
{ name: 'Lucas Bogaert', role: 'Barber', tone: 'sky', status: 'Working today', working: true },
{ name: 'Sofia Mertens', role: 'Nail artist', tone: 'sage', status: 'Working today', working: true },
{ name: 'Mila Claessens', role: 'Lash & brow artist', tone: 'lilac', status: 'Working today', working: true },
{ name: 'Noor El Idrissi', role: 'Owner', tone: 'sand', status: 'Day off', working: false }];


// Hours on an 8:00–20:00 track
export const teamWeek = [
{ day: 'Mon', start: 9, end: 18 },
{ day: 'Tue', start: 9, end: 18 },
{ day: 'Wed', start: 0, end: 0 },
{ day: 'Thu', start: 11, end: 20 },
{ day: 'Fri', start: 9, end: 18 },
{ day: 'Sat', start: 9, end: 16 },
{ day: 'Sun', start: 0, end: 0 }];


export const teamTreatments = ['Cut & blow-dry', 'Balayage', 'Colour & cut', 'Gloss treatment', 'Blow-dry', 'Bridal styling'];

export const teamPermissions = [
{ label: 'See own calendar', on: true },
{ label: 'See full team calendar', on: true },
{ label: 'Check out clients', on: true },
{ label: 'Edit treatment prices', on: false },
{ label: 'View business reports', on: false }];


export const teamPerformance = [
{ label: 'Appointments', value: '96' },
{ label: 'Occupancy', value: '84%' },
{ label: 'Rebooked', value: '72%' }];


export const teamAudiences = [
{
  title: 'Owners stay in control',
  body: 'Set roles, access and working hours, decide who sees what, and keep an eye on how every chair is doing.'
},
{
  title: 'Your team gets what they need',
  body: 'Each professional sees their own day, their clients and what’s next — without the admin they don’t need.'
}];