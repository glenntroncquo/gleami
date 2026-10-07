import type { BlogPostKey, Language } from "@/lib/i18n";

export type BlogPost = {
  title: string;
  description: string;
  category: string;
  readingTime: string;
  publishedAt: string;
  updatedAt: string;
  intro: string;
  sections: Array<{
    title: string;
    paragraphs: string[];
    bullets?: string[];
  }>;
};

export const blogPosts: Record<BlogPostKey, Record<Language, BlogPost>> = {
  onlineBooking: {
    nl: {
      title: "Online boeken voor je salon: een rustige start",
      description:
        "Praktische stappen om online afspraken in te voeren zonder je salonplanning ingewikkelder te maken.",
      category: "Salonbeheer",
      readingTime: "5 min leestijd",
      publishedAt: "2026-10-05",
      updatedAt: "2026-10-05",
      intro:
        "Online boeken werkt pas echt wanneer het aansluit op de manier waarop je salon al werkt. Begin daarom niet bij een knop op je website, maar bij een duidelijke agenda, correcte diensten en realistische beschikbaarheid.",
      sections: [
        {
          title: "Begin met je diensten",
          paragraphs: [
            "Geef elke dienst een herkenbare naam, een correcte duur en een prijs die de klant begrijpt. Vermijd interne afkortingen. Beschrijf wat inbegrepen is, zeker bij kleurbehandelingen en diensten die afhangen van haarlengte.",
          ],
          bullets: [
            "Maak varianten alleen wanneer ze de keuze echt verduidelijken.",
            "Voorzie tijd voor voorbereiding en afwerking.",
            "Koppel alleen medewerkers die de dienst uitvoeren.",
          ],
        },
        {
          title: "Publiceer beschikbaarheid die klopt",
          paragraphs: [
            "Een klant verwacht dat een zichtbaar tijdstip ook echt beschikbaar is. Werkuren, pauzes, verlof en bestaande afspraken moeten daarom uit dezelfde planning komen.",
            "Start eventueel met een beperkt boekbaar venster en breid uit zodra je team vertrouwd is met de nieuwe werkwijze.",
          ],
        },
        {
          title: "Maak de volgende stap duidelijk",
          paragraphs: [
            "Laat na de boeking meteen zien wat er is vastgelegd, waar de afspraak doorgaat en hoe de klant contact kan opnemen. Een duidelijke bevestiging voorkomt losse berichten en onzekerheid.",
          ],
        },
      ],
    },
    fr: {
      title: "Réservation en ligne pour votre salon : bien démarrer",
      description:
        "Des étapes concrètes pour proposer la réservation en ligne sans compliquer l’organisation du salon.",
      category: "Gestion du salon",
      readingTime: "5 min de lecture",
      publishedAt: "2026-10-05",
      updatedAt: "2026-10-05",
      intro:
        "La réservation en ligne fonctionne lorsqu’elle suit la réalité du salon. Commencez donc par un agenda fiable, des prestations claires et des disponibilités réalistes plutôt que par un simple bouton sur le site.",
      sections: [
        {
          title: "Commencez par les prestations",
          paragraphs: [
            "Donnez à chaque prestation un nom compréhensible, une durée correcte et un prix clair. Évitez les abréviations internes et précisez ce qui est compris, surtout pour la coloration et les services liés à la longueur.",
          ],
          bullets: [
            "Créez des variantes uniquement lorsqu’elles facilitent le choix.",
            "Prévoyez le temps de préparation et de finition.",
            "Associez seulement les professionnels qui réalisent la prestation.",
          ],
        },
        {
          title: "Publiez des créneaux fiables",
          paragraphs: [
            "Un client s’attend à ce qu’un horaire visible soit réellement disponible. Heures de travail, pauses, congés et rendez-vous existants doivent venir du même planning.",
            "Vous pouvez commencer avec une fenêtre de réservation limitée, puis l’élargir lorsque l’équipe maîtrise le nouveau fonctionnement.",
          ],
        },
        {
          title: "Clarifiez la suite",
          paragraphs: [
            "Après la réservation, confirmez immédiatement la prestation, l’heure, l’adresse et la façon de contacter le salon. Une confirmation claire évite les messages dispersés.",
          ],
        },
      ],
    },
    de: {
      title: "Online-Buchung für deinen Salon: ruhig starten",
      description:
        "Praktische Schritte für Online-Termine, ohne die Salonplanung komplizierter zu machen.",
      category: "Salonmanagement",
      readingTime: "5 Min. Lesezeit",
      publishedAt: "2026-10-05",
      updatedAt: "2026-10-05",
      intro:
        "Online-Buchung funktioniert dann gut, wenn sie zum echten Salonalltag passt. Starte deshalb mit einem verlässlichen Kalender, klaren Leistungen und realistischen Verfügbarkeiten.",
      sections: [
        {
          title: "Beginne mit deinen Leistungen",
          paragraphs: [
            "Gib jeder Leistung einen verständlichen Namen, eine passende Dauer und einen klaren Preis. Erkläre, was enthalten ist, besonders bei Farbe und längenabhängigen Leistungen.",
          ],
          bullets: [
            "Nutze Varianten nur, wenn sie die Auswahl erleichtern.",
            "Plane Zeit für Vorbereitung und Abschluss ein.",
            "Ordne nur Mitarbeitende zu, die die Leistung anbieten.",
          ],
        },
        {
          title: "Zeige verlässliche Verfügbarkeit",
          paragraphs: [
            "Kunden erwarten, dass sichtbare Zeiten wirklich frei sind. Arbeitszeiten, Pausen, Urlaub und bestehende Termine sollten deshalb aus derselben Planung stammen.",
            "Du kannst mit einem kurzen Buchungszeitraum beginnen und ihn später erweitern.",
          ],
        },
        {
          title: "Erkläre den nächsten Schritt",
          paragraphs: [
            "Bestätige nach der Buchung Leistung, Zeit, Adresse und Kontaktweg. Eine klare Bestätigung verhindert Rückfragen und verstreute Nachrichten.",
          ],
        },
      ],
    },
  },
};
