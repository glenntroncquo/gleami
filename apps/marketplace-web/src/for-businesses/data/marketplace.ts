export const marketplaceImages = {
  hair: "/c22595c4-33c0-4e1b-9d3b-228dabf74ef8.jpg",
  nails: "/7dffc13d-fe3b-49a8-b10d-0ab518d31b7a.jpg",
  barber: "/bffac2f4-5acb-4c67-b55f-1909523c2416.jpg",
  stylist: "/8ac9a3fa-97f7-4191-ab3a-0564c2356ee1.jpg",
  detail: "/b23af3a5-f1bd-4962-b0c7-fb3d1f6aaeb0.jpg"
};

export const marketplaceCategories = ['All', 'Hair', 'Barber', 'Nails', 'Lashes & brows', 'Massage'];

export const marketplaceSalons = [
{ name: 'Atelier Noor', category: 'Hair salon', rating: '4.9', reviews: 128, distance: '0.8 km', next: 'Today 15:30', image: marketplaceImages.hair, favourite: true },
{ name: 'Studio Lune', category: 'Nail studio', rating: '4.8', reviews: 86, distance: '1.2 km', next: 'Today 17:00', image: marketplaceImages.nails },
{ name: 'Maison Fade', category: 'Barber', rating: '4.7', reviews: 204, distance: '1.9 km', next: 'Tomorrow 09:30', image: marketplaceImages.barber }];


export const mapPins = [
{ x: 34, y: 42, label: '€58', active: true },
{ x: 62, y: 28, label: '€45' },
{ x: 74, y: 60, label: '€32' },
{ x: 20, y: 70, label: '€40' },
{ x: 50, y: 74, label: '€65' }];


export const salonDetailTreatments = [
{ name: 'Cut & blow-dry', duration: '60 min', price: '€58', slots: ['15:30', '16:15', '17:00'] },
{ name: 'Balayage', duration: '150 min', price: 'from €145', slots: ['Thu 10:00'] },
{ name: 'Gel manicure', duration: '60 min', price: '€45', slots: ['16:00', '17:30'] }];


export const flywheelSteps = [
{ title: 'Manage your salon', body: 'Run your calendar, team and treatments in Gleami.' },
{ title: 'Publish your profile', body: 'Go live on the marketplace in a few clicks.' },
{ title: 'Get discovered', body: 'Nearby clients find you by treatment and location.' },
{ title: 'Receive bookings', body: 'They book your real, available times.' },
{ title: 'Handled automatically', body: 'Bookings land in your calendar, ready to go.' }];