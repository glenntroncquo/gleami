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
    signIn: 'Inloggen of registreren',
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
    signedOutTitle: 'Jouw afspraken, op één plek',
    signedOutBody: 'Log in om te boeken, je afspraken te bekijken en je favoriete salons te bewaren.',
    signIn: 'Inloggen of registreren',
    finishTitle: 'Maak je account af',
    finishBody: 'We hebben nog een paar gegevens van je nodig.',
    linkedAccounts: 'Gekoppelde accounts',
    signOut: 'Uitloggen',
    deleteAccount: 'Account verwijderen',
    deleteTitle: 'Account verwijderen?',
    deleteBody: 'Je favorieten en inloggegevens worden gewist. Salons behouden je afspraakgeschiedenis. Dit kan niet ongedaan worden.',
    deleteConfirm: 'Verwijderen',
    deleteSalonAccount: 'Dit account hoort bij een salon. Verwijder het via Gleami voor salons.',
    missingConfig: 'Stel EXPO_PUBLIC_SUPABASE_URL en EXPO_PUBLIC_SUPABASE_ANON_KEY in, of zet EXPO_PUBLIC_USE_MOCKS=1.',
  },
  auth: {
    close: 'Sluiten',
    welcomeTitle: 'Inloggen of registreren',
    welcomeBody: 'Maak een account aan of log in om afspraken te boeken en te beheren.',
    continueWithApple: 'Doorgaan met Apple',
    continueWithGoogle: 'Doorgaan met Google',
    or: 'of',
    email: 'E-mail',
    emailPlaceholder: 'naam@voorbeeld.be',
    continue: 'Doorgaan',
    passwordTitle: 'Welkom terug',
    passwordBody: 'Voer je wachtwoord in om in te loggen als',
    password: 'Wachtwoord',
    showPassword: 'Toon wachtwoord',
    hidePassword: 'Verberg wachtwoord',
    forgotPassword: 'Wachtwoord vergeten?',
    signIn: 'Inloggen',
    verifyTitle: 'Bevestig je e-mailadres',
    verifyBody: 'We hebben een code naar je gestuurd op',
    codeLabel: 'Verificatiecode, 6 cijfers',
    noCode: 'Geen code ontvangen?',
    resend: 'Opnieuw verzenden',
    resendIn: 'Opnieuw verzenden over {{seconds}}s',
    resent: 'Nieuwe code verstuurd',
    completeTitle: 'Aanmelding voltooien',
    completeBody: 'We hebben nog een paar gegevens van je nodig',
    firstName: 'Voornaam',
    lastName: 'Achternaam',
    phone: 'Mobielnummer',
    countryCode: 'Landcode {{code}}',
    chooseCountry: 'Kies je land',
    clear: 'Wis',
    passwordHint: 'Minstens 8 tekens',
    resetTitle: 'Nieuw wachtwoord',
    resetBody: 'Kies een nieuw wachtwoord voor',
    savePassword: 'Wachtwoord opslaan',
    errors: {
      invalidEmail: 'Vul een geldig e-mailadres in.',
      invalidCredentials: 'Dit wachtwoord klopt niet.',
      invalidCode: 'Deze code klopt niet of is verlopen.',
      rateLimited: 'Even geduld. Probeer het over een minuutje opnieuw.',
      passwordTooShort: 'Kies een wachtwoord van minstens 8 tekens.',
      weakPassword: 'Kies een sterker wachtwoord.',
      invalidPhone: 'Vul een geldig mobielnummer in.',
      identityInUse: 'Dit account is al gekoppeld aan een ander Gleami-account.',
      linkingDisabled: 'Accounts koppelen is nog niet ingeschakeld.',
      socialUnavailable: 'Inloggen met {{provider}} is niet beschikbaar in deze build.',
      network: 'Geen verbinding. Controleer je internet en probeer opnieuw.',
      generic: 'Er ging iets mis. Probeer het opnieuw.',
    },
  },
  account: {
    linkedTitle: 'Gekoppelde accounts',
    linkedBody: 'Log sneller in met Apple of Google. Je account, favorieten en afspraken blijven hetzelfde.',
    emailPassword: 'E-mail en wachtwoord',
    linked: 'Gekoppeld',
    notLinked: 'Niet gekoppeld',
    link: 'Koppelen',
    unlink: 'Ontkoppelen',
    unlinkTitle: '{{provider}} ontkoppelen?',
    unlinkBody: 'Je kunt daarna niet meer inloggen met {{provider}}.',
    lastMethod: 'Je hebt minstens één inlogmethode nodig.',
    linkedToast: '{{provider}} is gekoppeld',
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
