/**
 * UI copy for Gleami Marketplace. Dutch (nl-BE) is the only shipped locale.
 * To add English, create an `en` object with this same shape and teach
 * `t()` to read it. Keys stay stable so screens do not change.
 */
const nl = {
  tabs: {
    discover: 'Ontdekken',
    bookings: 'Boekingen',
    favorites: 'Favorieten',
    profile: 'Profiel',
  },
  common: {
    back: 'Terug',
    retry: 'Opnieuw',
    cancel: 'Annuleer',
  },
  discover: {
    searchPlaceholder: 'Zoek een salon of dienst',
    searchHint: 'Salons, diensten, buurten',
    searchThisArea: 'Zoek in dit gebied',
    allCategories: 'Alles',
    exampleBanner: 'Voorbeelddata — deze salons zijn fictief',
    mapUnavailable: 'Kaart niet beschikbaar',
    mapTokenHint: 'Voeg EXPO_PUBLIC_MAPBOX_TOKEN toe om de kaart te laden. De lijst blijft werken.',
    mapWebHint: 'De kaart opent in de iOS- of Android-dev-build.',
    mapDragHint: 'Sleep om het gebied te verplaatsen',
    yourLocation: 'Jouw locatie',
    defaultCity: 'Brussel',
    results: '{{count}} salons',
    photoLabel: '{{name}}, foto {{index}} van {{total}}',
    photoHint: "Veeg horizontaal voor meer foto's.",
    emptyTitle: 'Geen salons in dit gebied',
    emptyBody: 'Verplaats de kaart of pas je zoekopdracht aan.',
    categoriesError: 'Categorieën laden lukt niet.',
  },
  availability: {
    today: 'Vandaag beschikbaar',
    tomorrow: 'Morgen',
    this_week: 'Deze week',
  },
  search: {
    title: 'Zoeken',
    placeholder: 'Kapper, massage, nagels…',
    emptyPrompt: 'Typ om salons, diensten of categorieën te zoeken.',
    noResults: 'Geen suggesties',
    category: 'Categorie',
    service: 'Dienst',
    location: 'Salon',
  },
  favorites: {
    title: 'Favorieten',
    emptyTitle: 'Nog geen favorieten',
    emptyBody: 'Bewaar salons met het hartje.',
    signInTitle: 'Log in om favorieten te bewaren',
    signInBody: 'Je likes blijven aan je account gekoppeld.',
    signIn: 'Inloggen',
    like: 'Bewaar salon',
    unlike: 'Verwijder uit favorieten',
    discover: 'Ontdek salons',
  },
  bookings: {
    title: 'Boekingen',
    emptyTitle: 'Boekingen komen binnenkort',
    emptyBody: 'Je afspraken verschijnen hier zodra je via Gleami boekt.',
  },
  profile: {
    title: 'Profiel',
    signIn: 'Inloggen',
    signUp: 'Account maken',
    signOut: 'Uitloggen',
    email: 'E-mail',
    password: 'Wachtwoord',
    magicLink: 'Stuur een magic link',
    magicSent: 'Check je inbox. We stuurden een inloglink naar {{email}}.',
    apple: 'Log in met Apple',
    appleSoon: 'Inloggen met Apple komt binnenkort.',
    switchToSignUp: 'Nog geen account? Registreren',
    switchToSignIn: 'Al een account? Inloggen',
    signedInAs: 'Ingelogd als',
    confirmEmail: 'Bevestig je e-mail. Daarna kun je inloggen.',
    invalidCredentials: 'E-mail of wachtwoord klopt niet.',
    alreadyRegistered: 'Er bestaat al een account met dit e-mailadres.',
    invalidEmail: 'Vul een geldig e-mailadres in.',
    passwordTooShort: 'Kies een wachtwoord van minstens 6 tekens.',
    mockHint: 'Voorbeeldmodus: elk e-mailadres werkt. Kies een wachtwoord van minstens 6 tekens. Er wordt geen mail verstuurd.',
    missingConfig: 'Stel EXPO_PUBLIC_SUPABASE_URL en EXPO_PUBLIC_SUPABASE_ANON_KEY in, of zet EXPO_PUBLIC_USE_MOCKS=1.',
  },
  salon: {
    book: 'Boek',
    services: 'Diensten',
    about: 'Over deze salon',
    likes: '{{count}} likes',
    emptyServices: 'Deze salon heeft nog geen diensten online.',
    minutes: '{{count}} min',
    notFound: 'Deze salon bestaat niet.',
  },
  states: {
    loading: 'Laden',
    errorTitle: 'Er ging iets mis',
    errorBody: 'Probeer het opnieuw.',
    offlineTitle: 'Je bent offline',
    offlineBody: 'Controleer je verbinding. Wat we al geladen hebben, blijft zichtbaar.',
  },
  booking: {
    failedTitle: 'Boeken lukt niet',
    failedBody: 'De boekingspagina kon niet geopend worden.',
  },
};

export type Dictionary = typeof nl;

/** Shipped catalogs. Add `en: Dictionary` here when English copy is ready. */
export const dictionaries: { nl: Dictionary } = { nl };

type Catalog = Dictionary;

function lookup(path: string): string {
  const parts = path.split('.');
  let node: unknown = dictionaries.nl as Catalog;
  for (const part of parts) {
    if (typeof node !== 'object' || node === null || !(part in node)) {
      return path;
    }
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : path;
}

export function t(path: string, vars?: Record<string, string | number>): string {
  let value = lookup(path);
  if (vars) {
    for (const [key, replacement] of Object.entries(vars)) {
      value = value.replaceAll(`{{${key}}}`, String(replacement));
    }
  }
  return value;
}
