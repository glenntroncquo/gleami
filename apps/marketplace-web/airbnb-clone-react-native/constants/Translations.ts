export const translations = {
  // Common
  close: "Sluiten",
  back: "Terug",
  continue: "Doorgaan",
  confirm: "Bevestigen",
  cancel: "Annuleren",
  save: "Opslaan",
  edit: "Bewerken",
  delete: "Verwijderen",
  loading: "Laden...",
  error: "Fout",
  success: "Succes",
  retry: "Opnieuw proberen",

  // Booking
  selectDateAndTime: "Selecteer datum & tijd",
  confirmBooking: "Bevestig boeking",
  chooseDate: "Kies een datum",
  availableTimes: "Beschikbare tijden",
  yourServices: "Jouw diensten",
  total: "Totaal",
  appointmentDetails: "Afspraakdetails",
  location: "Locatie",
  date: "Datum",
  dates: "Datums",
  time: "Tijd",
  services: "Diensten",
  priceDetails: "Prijsoverzicht",
  cancellationPolicy: "Annuleringsbeleid",
  freeCancellation: "Gratis annuleren",
  cancelBefore: "Annuleer vóór",
  forFullRefund: "voor een volledige terugbetaling",
  fullTerms: "Volledige voorwaarden",
  bookSelected: "Boek geselecteerde",
  bookAppointment: "Boek afspraak",
  confirmBookingButton: "Bevestig boeking",
  startingFrom: "Vanaf",
  servicesSelected: "{count} dienst{plural} geselecteerd",
  noServicesAvailable: "Geen diensten beschikbaar",
  servicesWillBeAddedSoon: "Diensten worden binnenkort toegevoegd",
  failedToLoadServices: "Kon diensten niet laden",
  failedToLoadTimes: "Kon beschikbare tijden niet laden",
  change: "Wijzigen",

  // Calendar
  january: "januari",
  february: "februari",
  march: "maart",
  april: "april",
  may: "mei",
  june: "juni",
  july: "juli",
  august: "augustus",
  september: "september",
  october: "oktober",
  november: "december",
  december: "december",

  // Days of week
  monday: "Maandag",
  tuesday: "Dinsdag",
  wednesday: "Woensdag",
  thursday: "Donderdag",
  friday: "Vrijdag",
  saturday: "Zaterdag",
  sunday: "Zondag",

  // Salon details
  about: "Over",
  servicesAndPricing: "Diensten & prijzen",
  hours: "Openingstijden",
  contact: "Contact",
  reviews: "Recensies",
  rating: "Beoordeling",
  reviewCount: "({count} recensies)",
  from: "Vanaf",
  selected: "Geselecteerd",
  remove: "Verwijderen",

  // Time formats
  minutes: "minuten",
  hour: "uur",

  // Status messages
  bookingConfirmed: "Boeking bevestigd!",
  bookingConfirmedMessage: "Je afspraak is geboekt voor {date} om {time}.",
  noServicesSelected: "Geen diensten geselecteerd",
  noServicesSelectedMessage: "Selecteer minimaal één dienst voordat je boekt.",

  // Cancellation policy text
  cancellationPolicyText:
    "Gratis annuleren tot 24 uur voor je afspraak. Annuleer daarna en je wordt 50% van de dienstprijs in rekening gebracht.",

  // Common actions
  share: "Delen",
  favorite: "Favoriet",
  call: "Bellen",
  website: "Website",

  // Navigation
  home: "Home",
  search: "Zoeken",
  favorites: "Favorieten",
  profile: "Profiel",
  inbox: "Inbox",
  wishlists: "Verlanglijsten",
} as const;

export type TranslationKey = keyof typeof translations;
