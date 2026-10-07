import { localeConfig, type Language, type Locale } from "@/lib/i18n";

type FaqItem = {
  question: string;
  answer: string;
};

type Feature = {
  title: string;
  description: string;
};

type Copy = {
  skip: string;
  nav: {
    discover: string;
    treatments: string;
    business: string;
    login: string;
    menu: string;
    close: string;
  };
  actions: {
    explore: string;
    start: string;
    demo: string;
    publish: string;
    book: string;
    viewSalon: string;
    viewAll: string;
    search: string;
  };
  consumer: {
    eyebrow: string;
    title: string;
    mutedTitle: string;
    description: string;
    searchPlaceholder: string;
    locationPlaceholder: string;
    popularTitle: string;
    popularDescription: string;
    featuredTitle: string;
    featuredDescription: string;
    categoriesTitle: string;
    businessCalloutTitle: string;
    businessCalloutBody: string;
    salonsCount: (count: number) => string;
    demoNotice: string;
    noResults: string;
  };
  business: {
    eyebrow: string;
    title: string;
    mutedTitle: string;
    description: string;
    reassurance: string;
    overviewTitle: string;
    overviewBody: string;
    features: Feature[];
    marketplaceEyebrow: string;
    marketplaceTitle: string;
    marketplaceBody: string;
    marketplaceSteps: string[];
    mockBooking: string;
    mockBookingTime: string;
    mockReminder: string;
    mockAutomatic: string;
    faqEyebrow: string;
    faqTitle: string;
    faqBody: string;
    faqs: FaqItem[];
    finalTitle: string;
    finalBody: string;
  };
  salon: {
    services: string;
    about: string;
    hours: string;
    team: string;
    reviews: string;
    photos: string;
    location: string;
    nearby: string;
    categories: string;
    from: string;
    minutes: string;
    open: string;
    closed: string;
    unavailable: string;
    noReviews: string;
    illustrative: string;
  };
  treatment: {
    indexTitle: string;
    indexDescription: string;
    findTitle: (name: string) => string;
    findDescription: (name: string) => string;
    localTitle: (treatment: string, city: string) => string;
    localDescription: (treatment: string, city: string) => string;
    guideTitle: string;
    guideBody: string;
    qualityTitle: string;
    qualityItems: string[];
  };
  city: {
    title: (city: string) => string;
    description: (city: string) => string;
    localIntro: (city: string) => string;
  };
  footer: {
    description: string;
    marketplace: string;
    company: string;
    legal: string;
    salons: string;
    cities: string;
    privacy: string;
    terms: string;
    rights: string;
  };
};

const nl: Copy = {
  skip: "Ga naar de inhoud",
  nav: {
    discover: "Ontdek salons",
    treatments: "Behandelingen",
    business: "Voor bedrijven",
    login: "Inloggen",
    menu: "Menu openen",
    close: "Menu sluiten",
  },
  actions: {
    explore: "Ontdek salons",
    start: "Start met Gleami",
    demo: "Boek een demo",
    publish: "Publiceer je salon",
    book: "Boek een afspraak",
    viewSalon: "Bekijk salon",
    viewAll: "Bekijk alles",
    search: "Zoeken",
  },
  consumer: {
    eyebrow: "Beauty, bij jou in de buurt",
    title: "Vind jouw volgende",
    mutedTitle: "favoriete salon.",
    description:
      "Ontdek salons, vergelijk behandelingen en prijzen, en boek een moment dat voor jou past.",
    searchPlaceholder: "Salon of behandeling",
    locationPlaceholder: "Stad of postcode",
    popularTitle: "Ontdek per stad",
    popularDescription:
      "Van een snelle knipbeurt tot een volledige glow-up. Vind vakmensen dichtbij.",
    featuredTitle: "Salons om te ontdekken",
    featuredDescription:
      "Bekijk het aanbod, de locatie en beschikbare behandelingen voor je kiest.",
    categoriesTitle: "Waar heb je zin in?",
    businessCalloutTitle: "Laat je salon groeien met Gleami.",
    businessCalloutBody:
      "Beheer je agenda, klanten, team en betalingen, en word gevonden door nieuwe klanten.",
    salonsCount: (count) => `${count} ${count === 1 ? "salon" : "salons"}`,
    demoNotice:
      "Voorbeeldweergave. Koppel Supabase om gepubliceerde salons te tonen.",
    noResults: "Hier zijn nog geen salons gepubliceerd.",
  },
  business: {
    eyebrow: "Salonsoftware van Gleami",
    title: "Alles wat je salon nodig heeft.",
    mutedTitle: "Op één plek.",
    description:
      "Beheer afspraken, klanten, medewerkers, betalingen en meer met één helder platform.",
    reassurance: "Snel opgezet · Geen kredietkaart nodig",
    overviewTitle: "Eén platform. Je hele salon.",
    overviewBody:
      "Geen losse agenda, klantenspreadsheet en betaaltool meer. Gleami brengt je dagelijkse werking samen in één rustige werkplek.",
    features: [
      {
        title: "Slimme agenda",
        description:
          "Plan het hele team met behandelingsduur, pauzes en beschikbaarheid in één overzicht.",
      },
      {
        title: "Online boeken",
        description:
          "Klanten boeken 24/7 via je boekingslink, salonprofiel of de marketplace.",
      },
      {
        title: "Klantenbeheer",
        description:
          "Houd bezoekhistoriek, voorkeuren en notities veilig bij voor elk bezoek.",
      },
      {
        title: "Team en planning",
        description:
          "Beheer werkuren, behandelingen en toegangsrechten per medewerker.",
      },
      {
        title: "Betalingen",
        description:
          "Reken vlot af en houd transacties in een duidelijk overzicht.",
      },
      {
        title: "Inzichten",
        description:
          "Volg omzet, bezetting en terugkerende klanten zonder spreadsheets.",
      },
    ],
    marketplaceEyebrow: "Gleami marketplace",
    marketplaceTitle: "Word gevonden door nieuwe klanten.",
    marketplaceBody:
      "Publiceer je salon op Gleami. Mensen in de buurt ontdekken je aanbod, vergelijken behandelingen en boeken beschikbare momenten.",
    marketplaceSteps: [
      "Beheer je salon",
      "Publiceer je profiel",
      "Word ontdekt",
      "Ontvang boekingen",
      "Alles staat meteen in je agenda",
    ],
    mockBooking: "Nieuwe boeking",
    mockBookingTime: "Vandaag · 12:30",
    mockReminder: "Reminder verzonden",
    mockAutomatic: "Automatisch en op tijd",
    faqEyebrow: "Veelgestelde vragen",
    faqTitle: "Vragen, beantwoord.",
    faqBody:
      "Wil je liever persoonlijk ontdekken hoe Gleami bij je salon past? Plan dan een korte demo.",
    faqs: [
      {
        question: "Wat is Gleami?",
        answer:
          "Gleami brengt agenda, online boekingen, klanten, team, diensten en betalingen samen. Je salon kan daarnaast zichtbaar worden op de Gleami marketplace.",
      },
      {
        question: "Voor wie is Gleami bedoeld?",
        answer:
          "Voor zelfstandige beautyprofessionals en kleine tot middelgrote salons, waaronder kappers, barbers, nagelstudio’s en schoonheidssalons.",
      },
      {
        question: "Kunnen klanten zelf online boeken?",
        answer:
          "Ja. Klanten zien beschikbare momenten en kunnen boeken via je eigen boekingslink of je publieke salonprofiel.",
      },
      {
        question: "Kan ik mijn team beheren?",
        answer:
          "Ja. Je kunt per medewerker werkuren, diensten en toegangsrechten beheren.",
      },
      {
        question: "Hoe werkt de marketplace?",
        answer:
          "Na het publiceren kunnen klanten je salon vinden op locatie en behandeling. Een boeking komt rechtstreeks in je Gleami-agenda terecht.",
      },
    ],
    finalTitle: "Klaar om je salon anders te runnen?",
    finalBody:
      "Besteed minder tijd aan losse tools en meer tijd aan je klanten en je zaak.",
  },
  salon: {
    services: "Behandelingen en prijzen",
    about: "Over deze salon",
    hours: "Openingsuren",
    team: "Team",
    reviews: "Reviews",
    photos: "Foto’s",
    location: "Locatie",
    nearby: "In de buurt",
    categories: "Categorieën",
    from: "vanaf",
    minutes: "min",
    open: "Open",
    closed: "Gesloten",
    unavailable: "Niet opgegeven",
    noReviews: "Nog geen geverifieerde reviews",
    illustrative:
      "Dit is illustratieve voorbeeldinhoud en geen echte salonvermelding.",
  },
  treatment: {
    indexTitle: "Vind de juiste behandeling voor jou.",
    indexDescription:
      "Ontdek populaire beautybehandelingen, lees wat je kunt verwachten en vergelijk salons.",
    findTitle: (name) => `${name}: salons, prijzen en informatie`,
    findDescription: (name) =>
      `Lees wat je van ${name.toLowerCase()} kunt verwachten en ontdek salons die deze behandeling aanbieden.`,
    localTitle: (treatment, city) => `${treatment} in ${city}`,
    localDescription: (treatment, city) =>
      `Vergelijk salons voor ${treatment.toLowerCase()} in ${city}, bekijk prijzen en kies een salon die bij je past.`,
    guideTitle: "Wat kun je verwachten?",
    guideBody:
      "Een goede salon bespreekt vooraf je wensen, de verwachte duur, het resultaat en de prijs. Bekijk altijd de volledige dienstbeschrijving voordat je boekt.",
    qualityTitle: "Zo kies je een salon",
    qualityItems: [
      "Bekijk duidelijke behandelingsinformatie en prijzen.",
      "Lees recente, geverifieerde beoordelingen wanneer die beschikbaar zijn.",
      "Controleer locatie, duur en eventuele nazorg.",
    ],
  },
  city: {
    title: (city) => `Salons in ${city}`,
    description: (city) =>
      `Ontdek kappers en beautyprofessionals in ${city}. Vergelijk behandelingen, prijzen en locaties.`,
    localIntro: (city) =>
      `Vind een salon in ${city} die past bij je behandeling, planning en budget.`,
  },
  footer: {
    description:
      "Ontdek salons en geef beautyprofessionals één helder platform voor hun dagelijkse werk.",
    marketplace: "Marketplace",
    company: "Gleami voor bedrijven",
    legal: "Juridisch",
    salons: "Alle salons",
    cities: "Populaire steden",
    privacy: "Privacy",
    terms: "Voorwaarden",
    rights: "Alle rechten voorbehouden.",
  },
};

const fr: Copy = {
  skip: "Aller au contenu",
  nav: {
    discover: "Découvrir les salons",
    treatments: "Prestations",
    business: "Pour les pros",
    login: "Se connecter",
    menu: "Ouvrir le menu",
    close: "Fermer le menu",
  },
  actions: {
    explore: "Découvrir les salons",
    start: "Commencer avec Gleami",
    demo: "Réserver une démo",
    publish: "Publier votre salon",
    book: "Prendre rendez-vous",
    viewSalon: "Voir le salon",
    viewAll: "Tout voir",
    search: "Rechercher",
  },
  consumer: {
    eyebrow: "La beauté près de chez vous",
    title: "Trouvez votre prochain",
    mutedTitle: "salon préféré.",
    description:
      "Découvrez des salons, comparez les prestations et les prix, puis choisissez le moment qui vous convient.",
    searchPlaceholder: "Salon ou prestation",
    locationPlaceholder: "Ville ou code postal",
    popularTitle: "Découvrir par ville",
    popularDescription:
      "D’une coupe rapide à un nouveau look complet, trouvez le bon professionnel près de chez vous.",
    featuredTitle: "Salons à découvrir",
    featuredDescription:
      "Consultez les prestations, l’adresse et les prix avant de faire votre choix.",
    categoriesTitle: "De quoi avez-vous envie ?",
    businessCalloutTitle: "Faites grandir votre salon avec Gleami.",
    businessCalloutBody:
      "Gérez votre agenda, vos clients, votre équipe et vos paiements, tout en attirant de nouveaux clients.",
    salonsCount: (count) => `${count} salon${count > 1 ? "s" : ""}`,
    demoNotice:
      "Aperçu illustratif. Connectez Supabase pour afficher les salons publiés.",
    noResults: "Aucun salon n’est encore publié ici.",
  },
  business: {
    eyebrow: "Le logiciel salon par Gleami",
    title: "Tout ce dont votre salon a besoin.",
    mutedTitle: "Au même endroit.",
    description:
      "Gérez rendez-vous, clients, équipe, paiements et bien plus dans une seule plateforme claire.",
    reassurance: "Installation rapide · Aucune carte bancaire requise",
    overviewTitle: "Une plateforme. Tout votre salon.",
    overviewBody:
      "Fini l’agenda, le fichier clients et l’outil de paiement séparés. Gleami rassemble votre activité dans un espace calme et connecté.",
    features: [
      {
        title: "Agenda intelligent",
        description:
          "Planifiez toute l’équipe en tenant compte des durées, pauses et disponibilités.",
      },
      {
        title: "Réservation en ligne",
        description:
          "Vos clients réservent 24 h/24 via votre lien, votre profil ou la marketplace.",
      },
      {
        title: "Gestion des clients",
        description:
          "Retrouvez l’historique, les préférences et les notes utiles avant chaque visite.",
      },
      {
        title: "Équipe et horaires",
        description:
          "Gérez les heures, les prestations et les accès de chaque membre.",
      },
      {
        title: "Paiements",
        description:
          "Encaissez simplement et suivez chaque transaction dans un aperçu clair.",
      },
      {
        title: "Analyses",
        description:
          "Suivez chiffre d’affaires, occupation et fidélité sans feuille de calcul.",
      },
    ],
    marketplaceEyebrow: "Marketplace Gleami",
    marketplaceTitle: "Faites-vous découvrir par de nouveaux clients.",
    marketplaceBody:
      "Publiez votre salon sur Gleami. Les personnes à proximité découvrent vos prestations et réservent vos créneaux disponibles.",
    marketplaceSteps: [
      "Gérez votre salon",
      "Publiez votre profil",
      "Soyez découvert",
      "Recevez des réservations",
      "Tout arrive dans votre agenda",
    ],
    mockBooking: "Nouvelle réservation",
    mockBookingTime: "Aujourd’hui · 12:30",
    mockReminder: "Rappel envoyé",
    mockAutomatic: "Automatiquement et à temps",
    faqEyebrow: "Questions fréquentes",
    faqTitle: "Vos questions, nos réponses.",
    faqBody:
      "Vous préférez découvrir Gleami avec nous ? Réservez une courte démonstration.",
    faqs: [
      {
        question: "Qu’est-ce que Gleami ?",
        answer:
          "Gleami réunit agenda, réservations en ligne, clients, équipe, prestations et paiements. Votre salon peut aussi être visible sur la marketplace Gleami.",
      },
      {
        question: "À qui s’adresse Gleami ?",
        answer:
          "Aux indépendants de la beauté et aux salons de petite ou moyenne taille : coiffure, barber, onglerie et institut de beauté.",
      },
      {
        question: "Les clients peuvent-ils réserver en ligne ?",
        answer:
          "Oui. Ils voient vos créneaux disponibles et réservent depuis votre lien ou votre profil public.",
      },
      {
        question: "Puis-je gérer mon équipe ?",
        answer:
          "Oui. Vous gérez les horaires, les prestations et les droits d’accès de chaque collaborateur.",
      },
      {
        question: "Comment fonctionne la marketplace ?",
        answer:
          "Une fois publié, votre salon peut être trouvé par lieu et par prestation. La réservation arrive directement dans votre agenda Gleami.",
      },
    ],
    finalTitle: "Prêt à gérer votre salon autrement ?",
    finalBody:
      "Passez moins de temps dans des outils séparés et plus de temps avec vos clients.",
  },
  salon: {
    services: "Prestations et tarifs",
    about: "À propos du salon",
    hours: "Horaires",
    team: "Équipe",
    reviews: "Avis",
    photos: "Photos",
    location: "Adresse",
    nearby: "À proximité",
    categories: "Catégories",
    from: "à partir de",
    minutes: "min",
    open: "Ouvert",
    closed: "Fermé",
    unavailable: "Non renseigné",
    noReviews: "Pas encore d’avis vérifiés",
    illustrative:
      "Ce contenu est illustratif et ne correspond pas à un véritable établissement.",
  },
  treatment: {
    indexTitle: "Trouvez la prestation qui vous correspond.",
    indexDescription:
      "Découvrez les soins populaires, comprenez chaque prestation et comparez les salons.",
    findTitle: (name) => `${name} : salons, prix et conseils`,
    findDescription: (name) =>
      `Découvrez à quoi vous attendre pour une prestation de ${name.toLowerCase()} et trouvez les salons qui la proposent.`,
    localTitle: (treatment, city) => `${treatment} à ${city}`,
    localDescription: (treatment, city) =>
      `Comparez les salons proposant ${treatment.toLowerCase()} à ${city}, consultez les prix et choisissez sereinement.`,
    guideTitle: "À quoi s’attendre ?",
    guideBody:
      "Un bon professionnel discute de vos attentes, de la durée, du résultat et du prix avant de commencer. Consultez toujours la description complète avant de réserver.",
    qualityTitle: "Bien choisir son salon",
    qualityItems: [
      "Vérifiez la description et le tarif de la prestation.",
      "Consultez les avis récents et vérifiés lorsqu’ils sont disponibles.",
      "Contrôlez l’adresse, la durée et les éventuels soins après la visite.",
    ],
  },
  city: {
    title: (city) => `Salons à ${city}`,
    description: (city) =>
      `Découvrez les coiffeurs et professionnels de la beauté à ${city}. Comparez prestations, prix et adresses.`,
    localIntro: (city) =>
      `Trouvez à ${city} un salon adapté à votre prestation, votre agenda et votre budget.`,
  },
  footer: {
    description:
      "Découvrez des salons et offrez aux professionnels de la beauté une plateforme claire pour leur quotidien.",
    marketplace: "Marketplace",
    company: "Gleami pour les pros",
    legal: "Informations",
    salons: "Tous les salons",
    cities: "Villes populaires",
    privacy: "Confidentialité",
    terms: "Conditions",
    rights: "Tous droits réservés.",
  },
};

const de: Copy = {
  ...nl,
  skip: "Zum Inhalt springen",
  nav: {
    discover: "Salons entdecken",
    treatments: "Behandlungen",
    business: "Für Betriebe",
    login: "Anmelden",
    menu: "Menü öffnen",
    close: "Menü schließen",
  },
  actions: {
    explore: "Salons entdecken",
    start: "Mit Gleami starten",
    demo: "Demo buchen",
    publish: "Salon veröffentlichen",
    book: "Termin buchen",
    viewSalon: "Salon ansehen",
    viewAll: "Alle ansehen",
    search: "Suchen",
  },
  consumer: {
    ...nl.consumer,
    eyebrow: "Beauty in deiner Nähe",
    title: "Finde deinen nächsten",
    mutedTitle: "Lieblingssalon.",
    description:
      "Entdecke Salons, vergleiche Behandlungen und Preise und wähle einen passenden Termin.",
    searchPlaceholder: "Salon oder Behandlung",
    locationPlaceholder: "Stadt oder Postleitzahl",
    popularTitle: "Nach Stadt entdecken",
    popularDescription:
      "Vom schnellen Haarschnitt bis zum neuen Look. Finde Profis in deiner Nähe.",
    featuredTitle: "Salons entdecken",
    featuredDescription:
      "Sieh dir Angebot, Standort und Preise an, bevor du dich entscheidest.",
    categoriesTitle: "Was darf es sein?",
    businessCalloutTitle: "Lass deinen Salon mit Gleami wachsen.",
    businessCalloutBody:
      "Verwalte Kalender, Kundschaft, Team und Zahlungen und werde von neuen Kunden gefunden.",
    salonsCount: (count) => `${count} Salon${count === 1 ? "" : "s"}`,
    demoNotice:
      "Beispielansicht. Verbinde Supabase, um veröffentlichte Salons anzuzeigen.",
    noResults: "Hier sind noch keine Salons veröffentlicht.",
  },
  business: {
    ...nl.business,
    eyebrow: "Salonsoftware von Gleami",
    title: "Alles, was dein Salon braucht.",
    mutedTitle: "An einem Ort.",
    description:
      "Verwalte Termine, Kunden, Team, Zahlungen und mehr auf einer klaren Plattform.",
    reassurance: "Schnell eingerichtet · Keine Kreditkarte erforderlich",
    overviewTitle: "Eine Plattform. Dein ganzer Salon.",
    overviewBody:
      "Kein Wechsel mehr zwischen Kalender, Kundenliste und Zahlungssoftware. Gleami verbindet deinen Salonalltag.",
    marketplaceEyebrow: "Gleami Marketplace",
    marketplaceTitle: "Werde von neuen Kunden entdeckt.",
    marketplaceBody:
      "Veröffentliche deinen Salon auf Gleami. Menschen in deiner Nähe entdecken dein Angebot und buchen freie Termine.",
    mockBooking: "Neue Buchung",
    mockBookingTime: "Heute · 12:30",
    mockReminder: "Erinnerung gesendet",
    mockAutomatic: "Automatisch und pünktlich",
    faqEyebrow: "Häufige Fragen",
    faqTitle: "Fragen, beantwortet.",
    faqBody:
      "Du möchtest Gleami persönlich kennenlernen? Buche eine kurze Demo.",
    finalTitle: "Bereit, deinen Salon anders zu führen?",
    finalBody:
      "Verbringe weniger Zeit in einzelnen Tools und mehr Zeit mit deinen Kunden.",
  },
  salon: {
    services: "Behandlungen und Preise",
    about: "Über diesen Salon",
    hours: "Öffnungszeiten",
    team: "Team",
    reviews: "Bewertungen",
    photos: "Fotos",
    location: "Standort",
    nearby: "In der Nähe",
    categories: "Kategorien",
    from: "ab",
    minutes: "Min.",
    open: "Geöffnet",
    closed: "Geschlossen",
    unavailable: "Nicht angegeben",
    noReviews: "Noch keine verifizierten Bewertungen",
    illustrative:
      "Dieser Inhalt ist nur ein Beispiel und kein echter Saloneintrag.",
  },
  treatment: {
    indexTitle: "Finde die passende Behandlung.",
    indexDescription:
      "Entdecke beliebte Beauty-Behandlungen, erfahre, was dich erwartet, und vergleiche Salons.",
    findTitle: (name) => `${name}: Salons, Preise und Informationen`,
    findDescription: (name) =>
      `Erfahre mehr über ${name} und entdecke Salons, die diese Behandlung anbieten.`,
    localTitle: (treatment, city) => `${treatment} in ${city}`,
    localDescription: (treatment, city) =>
      `Vergleiche Salons für ${treatment} in ${city}, prüfe Preise und finde den passenden Salon.`,
    guideTitle: "Was erwartet dich?",
    guideBody:
      "Ein guter Salon klärt Wünsche, Dauer, Ergebnis und Preis vor der Behandlung. Lies vor der Buchung die vollständige Beschreibung.",
    qualityTitle: "So wählst du einen Salon",
    qualityItems: [
      "Achte auf klare Leistungsbeschreibungen und Preise.",
      "Lies aktuelle, verifizierte Bewertungen, wenn sie verfügbar sind.",
      "Prüfe Standort, Dauer und mögliche Nachpflege.",
    ],
  },
  city: {
    title: (city) => `Salons in ${city}`,
    description: (city) =>
      `Entdecke Friseure und Beauty-Profis in ${city}. Vergleiche Behandlungen, Preise und Standorte.`,
    localIntro: (city) =>
      `Finde in ${city} einen Salon, der zu Behandlung, Zeitplan und Budget passt.`,
  },
  footer: {
    description:
      "Entdecke Salons und gib Beauty-Profis eine klare Plattform für ihren Alltag.",
    marketplace: "Marketplace",
    company: "Gleami für Betriebe",
    legal: "Rechtliches",
    salons: "Alle Salons",
    cities: "Beliebte Städte",
    privacy: "Datenschutz",
    terms: "Bedingungen",
    rights: "Alle Rechte vorbehalten.",
  },
};

const dictionaries: Record<Language, Copy> = { nl, fr, de };

export function getCopy(locale: Locale): Copy {
  return dictionaries[localeConfig[locale].language];
}
