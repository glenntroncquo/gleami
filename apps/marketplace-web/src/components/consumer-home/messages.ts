import { localeConfig, type Language, type Locale } from "@/lib/i18n";

export type HomeCopy = {
  languageLabel: string;
  languageName: string;
  homeLabel: string;
  navLabel: string;
  forBusiness: string;
  login: string;
  signup: string;
  heroLead: string;
  heroAccent: string;
  pageTitle: string;
  heroBelgium: string;
  heroNear: string;
  treatment: string;
  treatmentPlaceholder: string;
  where: string;
  when: string;
  whenAny: string;
  whenToday: string;
  whenTomorrow: string;
  whenWeekend: string;
  cityPlaceholder: string;
  cityEmpty: string;
  cityError: string;
  cityTitle: string;
  currentLocation: string;
  currentLocationError: string;
  dateTitle: string;
  whenMorning: string;
  whenMorningHint: string;
  whenAfternoon: string;
  whenAfternoonHint: string;
  whenEvening: string;
  whenEveningHint: string;
  pickerClear: string;
  pickerDone: string;
  search: string;
  showMap: string;
  hideMap: string;
  showMapBar: string;
  anyDay: string;
  showList: string;
  priceFrom: string;
  placeBelgium: string;
  placeNear: string;
  allTreatments: string;
  filterCategories: string;
  exploreBelgium: string;
  exploreNear: string;
  exploreResults: (query: string) => string;
  countBelgium: (count: number) => string;
  countNear: (count: number) => string;
  loading: string;
  clearSearch: string;
  seeAll: string;
  emptyTitle: string;
  emptyBody: string;
  showAll: string;
  favorites: string;
  save: (name: string) => string;
  unsave: (name: string) => string;
  businessEyebrow: string;
  businessTitleLead: string;
  businessTitleRest: string;
  businessBody: string;
  businessCta: string;
  businessDemo: string;
  businessQuote: string;
  businessQuoteBy: string;
  mockToday: string;
  mockRevenue: string;
  footerTagline: string;
  footerDiscover: string;
  footerCities: string;
  footerCompany: string;
  footerRights: string;
  footerNote: string;
};

const nl: HomeCopy = {
  languageLabel: "Taal",
  languageName: "Nederlands",
  homeLabel: "Gleami startpagina",
  navLabel: "Hoofdmenu",
  forBusiness: "Voor bedrijven",
  login: "Inloggen",
  signup: "Registreren",
  heroLead: "Vind je salon.",
  heroAccent: "Boek wanneer je wil.",
  pageTitle: "Salon boeken in België",
  heroBelgium:
    "Kapper, nagels en massage in België, met echte beschikbaarheid.",
  heroNear:
    "Kapper, nagels, massage en meer, bij jou in de buurt.",
  treatment: "Behandeling",
  treatmentPlaceholder: "Knippen, massage, nagels…",
  where: "Waar",
  when: "Wanneer",
  whenAny: "Altijd",
  whenToday: "Vandaag",
  whenTomorrow: "Morgen",
  whenWeekend: "Dit weekend",
  cityPlaceholder: "Stad of gemeente",
  cityEmpty: "Geen steden gevonden",
  cityError: "Steden laden lukt niet",
  cityTitle: "Locatie",
  currentLocation: "Huidige locatie",
  currentLocationError: "Locatie toestaan lukt niet",
  dateTitle: "Datum en tijd",
  whenMorning: "Ochtend",
  whenMorningHint: "9–12 u",
  whenAfternoon: "Namiddag",
  whenAfternoonHint: "12–18 u",
  whenEvening: "Avond",
  whenEveningHint: "18–24 u",
  pickerClear: "Wissen",
  pickerDone: "Klaar",
  search: "Zoeken",
  showMap: "Kaart",
  hideMap: "Verberg kaart",
  showMapBar: "Toon kaart",
  anyDay: "Elke dag",
  showList: "Lijst",
  priceFrom: "vanaf",
  placeBelgium: "België",
  placeNear: "Bij jou",
  allTreatments: "Alle behandelingen",
  filterCategories: "Filter op categorie",
  exploreBelgium: "Salons in België",
  exploreNear: "Aanbevolen bij jou in de buurt",
  exploreResults: (query) => `Resultaten voor “${query}”`,
  countBelgium: (count) =>
    `${count} ${count === 1 ? "salon" : "salons"} in België`,
  countNear: (count) =>
    `${count} ${count === 1 ? "salon" : "salons"} bij jou in de buurt`,
  loading: "Salons laden",
  clearSearch: "Zoekopdracht wissen",
  seeAll: "Bekijk alles",
  emptyTitle: "Nog niets gevonden",
  emptyBody: "Probeer een andere behandeling, of bekijk alle salons in België.",
  showAll: "Toon alle salons",
  favorites: "Favorieten",
  save: (name) => `${name} bewaren`,
  unsave: (name) => `${name} uit bewaarde salons halen`,
  businessEyebrow: "Gleami voor bedrijven",
  businessTitleLead: "Een rustiger,",
  businessTitleRest: "voller salon.",
  businessBody:
    "Agenda, betalingen en klantnotities op één rustige plek, plus een marketplace van mensen die je willen boeken.",
  businessCta: "Ontdek voor bedrijven",
  businessDemo: "Boek een demo",
  businessQuote:
    "“In de eerste maand zaten bijna een derde meer stoelen vol, en de telefoon hield eindelijk op met rinkelen.”",
  businessQuoteBy: "Maya Ortiz, eigenaar van Atelier Nord",
  mockToday: "Vandaag",
  mockRevenue: "Omzet deze week",
  footerTagline: "De eenvoudigste manier om beauty en wellness te boeken.",
  footerDiscover: "Ontdekken",
  footerCities: "Steden",
  footerCompany: "Bedrijf",
  footerRights: "© 2026 Gleami. Alle rechten voorbehouden.",
  footerNote: "Gemaakt voor mensen die zich goed willen voelen.",
};

const fr: HomeCopy = {
  languageLabel: "Langue",
  languageName: "Français",
  homeLabel: "Accueil Gleami",
  navLabel: "Navigation principale",
  forBusiness: "Pour les pros",
  login: "Se connecter",
  signup: "S’inscrire",
  heroLead: "Trouvez votre salon.",
  heroAccent: "Réservez à votre rythme.",
  pageTitle: "Réserver un salon en Belgique",
  heroBelgium:
    "Coiffeur, ongles et massage en Belgique, avec de vraies disponibilités.",
  heroNear: "Coiffeur, ongles, massage et plus, près de chez vous.",
  treatment: "Prestation",
  treatmentPlaceholder: "Coupe, massage, ongles…",
  where: "Où",
  when: "Quand",
  whenAny: "À tout moment",
  whenToday: "Aujourd’hui",
  whenTomorrow: "Demain",
  whenWeekend: "Ce week-end",
  cityPlaceholder: "Ville ou commune",
  cityEmpty: "Aucune ville trouvée",
  cityError: "Impossible de charger les villes",
  cityTitle: "Lieu",
  currentLocation: "Position actuelle",
  currentLocationError: "Impossible d’utiliser votre position",
  dateTitle: "Date et heure",
  whenMorning: "Matin",
  whenMorningHint: "9 h – 12 h",
  whenAfternoon: "Après-midi",
  whenAfternoonHint: "12 h – 18 h",
  whenEvening: "Soir",
  whenEveningHint: "18 h – minuit",
  pickerClear: "Effacer",
  pickerDone: "OK",
  search: "Rechercher",
  showMap: "Carte",
  hideMap: "Masquer la carte",
  showMapBar: "Afficher la carte",
  anyDay: "Tous les jours",
  showList: "Liste",
  priceFrom: "dès",
  placeBelgium: "Belgique",
  placeNear: "Près de vous",
  allTreatments: "Toutes les prestations",
  filterCategories: "Filtrer par catégorie",
  exploreBelgium: "Salons en Belgique",
  exploreNear: "Recommandés près de chez vous",
  exploreResults: (query) => `Résultats pour « ${query} »`,
  countBelgium: (count) =>
    `${count} ${count === 1 ? "salon" : "salons"} en Belgique`,
  countNear: (count) =>
    `${count} ${count === 1 ? "salon" : "salons"} près de chez vous`,
  loading: "Chargement des salons",
  clearSearch: "Effacer la recherche",
  seeAll: "Tout voir",
  emptyTitle: "Aucun résultat pour le moment",
  emptyBody:
    "Essayez une autre prestation, ou parcourez tous les salons en Belgique.",
  showAll: "Voir tous les salons",
  favorites: "Favoris",
  save: (name) => `Enregistrer ${name}`,
  unsave: (name) => `Retirer ${name} des favoris`,
  businessEyebrow: "Gleami pour les pros",
  businessTitleLead: "Un salon plus calme,",
  businessTitleRest: "et plus rempli.",
  businessBody:
    "Agenda, paiements et notes clients au même endroit, plus une marketplace de personnes prêtes à vous réserver.",
  businessCta: "Découvrir pour les pros",
  businessDemo: "Réserver une démo",
  businessQuote:
    "« Dès le premier mois, presque un tiers de chaises en plus étaient occupées, et le téléphone a enfin cessé de sonner. »",
  businessQuoteBy: "Maya Ortiz, propriétaire d’Atelier Nord",
  mockToday: "Aujourd’hui",
  mockRevenue: "Chiffre de la semaine",
  footerTagline:
    "La façon la plus simple de réserver beauté et bien-être.",
  footerDiscover: "Découvrir",
  footerCities: "Villes",
  footerCompany: "Entreprise",
  footerRights: "© 2026 Gleami. Tous droits réservés.",
  footerNote: "Conçu pour les personnes qui aiment se sentir bien.",
};

const en: HomeCopy = {
  languageLabel: "Language",
  languageName: "English",
  homeLabel: "Gleami home",
  navLabel: "Main",
  forBusiness: "For business",
  login: "Log in",
  signup: "Sign up",
  heroLead: "Find your salon.",
  heroAccent: "Book when you want.",
  pageTitle: "Book a salon in Belgium",
  heroBelgium: "Hair, nails and massage in Belgium, with real availability.",
  heroNear: "Hair, nails, massage and more, near you.",
  treatment: "Treatment",
  treatmentPlaceholder: "Haircut, massage, nails…",
  where: "Where",
  when: "When",
  whenAny: "Any time",
  whenToday: "Today",
  whenTomorrow: "Tomorrow",
  whenWeekend: "This weekend",
  cityPlaceholder: "City or town",
  cityEmpty: "No cities found",
  cityError: "Couldn’t load cities",
  cityTitle: "Location",
  currentLocation: "Current location",
  currentLocationError: "Couldn’t use your location",
  dateTitle: "Date and time",
  whenMorning: "Morning",
  whenMorningHint: "9am – 12pm",
  whenAfternoon: "Afternoon",
  whenAfternoonHint: "12pm – 6pm",
  whenEvening: "Evening",
  whenEveningHint: "6pm – 12am",
  pickerClear: "Clear",
  pickerDone: "Done",
  search: "Search",
  showMap: "Map",
  hideMap: "Hide map",
  showMapBar: "Show map",
  anyDay: "Any day",
  showList: "List",
  priceFrom: "from",
  placeBelgium: "Belgium",
  placeNear: "Near you",
  allTreatments: "All treatments",
  filterCategories: "Filter by category",
  exploreBelgium: "Salons in Belgium",
  exploreNear: "Recommended near you",
  exploreResults: (query) => `Results for “${query}”`,
  countBelgium: (count) =>
    `${count} ${count === 1 ? "salon" : "salons"} in Belgium`,
  countNear: (count) =>
    `${count} ${count === 1 ? "salon" : "salons"} near you`,
  loading: "Loading salons",
  clearSearch: "Clear search",
  seeAll: "See all",
  emptyTitle: "Nothing matches that just yet",
  emptyBody: "Try a different treatment, or browse every salon in Belgium.",
  showAll: "Show all salons",
  favorites: "Favourites",
  save: (name) => `Save ${name}`,
  unsave: (name) => `Remove ${name} from saved`,
  businessEyebrow: "Gleami for business",
  businessTitleLead: "Run a calmer,",
  businessTitleRest: "fuller salon.",
  businessBody:
    "Calendar, payments and client notes in one quiet place, plus a marketplace of people looking to book you.",
  businessCta: "Explore for business",
  businessDemo: "Book a demo",
  businessQuote:
    "“We filled almost a third more chairs in our first month, and the phone finally stopped ringing.”",
  businessQuoteBy: "Maya Ortiz, owner of Atelier Nord",
  mockToday: "Today",
  mockRevenue: "Revenue this week",
  footerTagline: "The easiest way to book beauty and wellness.",
  footerDiscover: "Discover",
  footerCities: "Cities",
  footerCompany: "Company",
  footerRights: "© 2026 Gleami. All rights reserved.",
  footerNote: "Made for people who like to feel good.",
};

const de: HomeCopy = {
  languageLabel: "Sprache",
  languageName: "Deutsch",
  homeLabel: "Gleami Startseite",
  navLabel: "Hauptnavigation",
  forBusiness: "Für Betriebe",
  login: "Anmelden",
  signup: "Registrieren",
  heroLead: "Finde deinen Salon.",
  heroAccent: "Buche, wann du willst.",
  pageTitle: "Salon buchen in Belgien",
  heroBelgium: "Friseur, Nägel und Massage in Belgien, mit echter Verfügbarkeit.",
  heroNear: "Friseur, Nägel, Massage und mehr, in deiner Nähe.",
  treatment: "Behandlung",
  treatmentPlaceholder: "Haarschnitt, Massage, Nägel…",
  where: "Wo",
  when: "Wann",
  whenAny: "Jederzeit",
  whenToday: "Heute",
  whenTomorrow: "Morgen",
  whenWeekend: "Dieses Wochenende",
  cityPlaceholder: "Stadt oder Ort",
  cityEmpty: "Keine Städte gefunden",
  cityError: "Städte konnten nicht geladen werden",
  cityTitle: "Ort",
  currentLocation: "Aktueller Standort",
  currentLocationError: "Standort konnte nicht verwendet werden",
  dateTitle: "Datum und Uhrzeit",
  whenMorning: "Morgens",
  whenMorningHint: "9–12 Uhr",
  whenAfternoon: "Nachmittags",
  whenAfternoonHint: "12–18 Uhr",
  whenEvening: "Abends",
  whenEveningHint: "18–24 Uhr",
  pickerClear: "Löschen",
  pickerDone: "Fertig",
  search: "Suchen",
  showMap: "Karte",
  hideMap: "Karte ausblenden",
  showMapBar: "Karte zeigen",
  anyDay: "Jeder Tag",
  showList: "Liste",
  priceFrom: "ab",
  placeBelgium: "Belgien",
  placeNear: "In deiner Nähe",
  allTreatments: "Alle Behandlungen",
  filterCategories: "Nach Kategorie filtern",
  exploreBelgium: "Salons in Belgien",
  exploreNear: "Empfohlen in deiner Nähe",
  exploreResults: (query) => `Ergebnisse für „${query}“`,
  countBelgium: (count) =>
    `${count} ${count === 1 ? "Salon" : "Salons"} in Belgien`,
  countNear: (count) =>
    `${count} ${count === 1 ? "Salon" : "Salons"} in deiner Nähe`,
  loading: "Salons werden geladen",
  clearSearch: "Suche löschen",
  seeAll: "Alle ansehen",
  emptyTitle: "Dazu gibt es noch nichts",
  emptyBody:
    "Versuch eine andere Behandlung, oder sieh dir alle Salons in Belgien an.",
  showAll: "Alle Salons zeigen",
  favorites: "Favoriten",
  save: (name) => `${name} speichern`,
  unsave: (name) => `${name} aus Favoriten entfernen`,
  businessEyebrow: "Gleami für Betriebe",
  businessTitleLead: "Ein ruhigerer,",
  businessTitleRest: "vollerer Salon.",
  businessBody:
    "Kalender, Zahlungen und Kundennotizen an einem ruhigen Ort, plus ein Marketplace mit Menschen, die dich buchen möchten.",
  businessCta: "Für Betriebe entdecken",
  businessDemo: "Demo buchen",
  businessQuote:
    "„Im ersten Monat waren fast ein Drittel mehr Stühle belegt, und das Telefon hat endlich aufgehört zu klingeln.“",
  businessQuoteBy: "Maya Ortiz, Inhaberin von Atelier Nord",
  mockToday: "Heute",
  mockRevenue: "Umsatz diese Woche",
  footerTagline: "Der einfachste Weg, Beauty und Wellness zu buchen.",
  footerDiscover: "Entdecken",
  footerCities: "Städte",
  footerCompany: "Unternehmen",
  footerRights: "© 2026 Gleami. Alle Rechte vorbehalten.",
  footerNote: "Für Menschen, die sich gut fühlen möchten.",
};

const messages: Record<Language, HomeCopy> = { nl, fr, en, de };

export function homeCopy(locale: Locale): HomeCopy {
  return messages[localeConfig[locale].language];
}
