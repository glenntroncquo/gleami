import { marketplaceImages } from './marketplace';

export const salonSite = {
  name: 'Atelier Noor',
  url: 'gleami.app/atelier-noor',
  headline: 'Hair, colour and nails in the heart of Ghent.',
  intro: 'A calm, light-filled studio for considered cuts, natural colour and quiet care.',
  heroImage: marketplaceImages.stylist,
  gallery: [marketplaceImages.hair, marketplaceImages.nails, marketplaceImages.detail],
  address: 'Example street 12, 9000 Ghent'
};

export const salonSiteTreatments = [
{ name: 'Cut & blow-dry', price: '€58' },
{ name: 'Balayage', price: 'from €145' },
{ name: 'Gloss treatment', price: '€32' },
{ name: 'Gel manicure', price: '€45' }];


export const salonSiteTeam = [
{ name: 'Noor', tone: 'sand' as const },
{ name: 'Emma', tone: 'rose' as const },
{ name: 'Lucas', tone: 'sky' as const },
{ name: 'Sofia', tone: 'sage' as const }];


export const salonSiteHours = [
{ day: 'Mon', hours: 'Closed' },
{ day: 'Tue – Fri', hours: '9:00 – 19:00' },
{ day: 'Sat', hours: '9:00 – 17:00' },
{ day: 'Sun', hours: 'Closed' }];


export const presenceIncludes = [
'Salon information',
'Photos',
'Treatments & prices',
'Your team',
'Opening hours',
'Online booking',
'Marketplace profile'];