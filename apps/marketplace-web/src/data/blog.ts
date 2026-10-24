import type { BlogPostKey, Language } from "@/lib/i18n";

export type BlogPost = {
  title: string;
  description: string;
  category: string;
  readingTime: string;
  publishedAt: string;
  updatedAt: string;
  intro?: string;
  closing?: string;
  sections: Array<{
    title: string;
    paragraphs: string[];
    bullets?: string[];
  }>;
};

export const blogPosts: Record<BlogPostKey, Record<Language, BlogPost>> = {
  whatIsGleami: {
    nl: {
      title: "Wat is Gleami?",
      description:
        "Gleami is een online platform en alles-in-één-beheersysteem voor kappers, barbers, nagelstudio’s en schoonheidssalons.",
      category: "Gleami",
      readingTime: "2 min leestijd",
      publishedAt: "2026-10-24",
      updatedAt: "2026-10-24",
      closing:
        "Wil je een afspraak boeken, of gebruik je Gleami om je salon te runnen?",
      sections: [
        {
          title: "Wat doet Gleami voor klanten?",
          paragraphs: [],
          bullets: [
            "Online afspraken boeken: je plant zelf een behandeling bij een salon, ook buiten de openingsuren, zonder te bellen.",
            "Zoeken en vergelijken: je zoekt op behandeling en plaats, en vergelijkt aanbod, prijzen en locatie. Beoordelingen staan erbij wanneer die beschikbaar zijn.",
            "Afspraken en favorieten: in je account zie je je geboekte afspraken en de salons die je bewaard hebt.",
          ],
        },
        {
          title: "Wat doet Gleami voor salons?",
          paragraphs: [],
          bullets: [
            "Salonsoftware: agenda, klanten, team en betalingen zitten in één systeem. Per medewerker stel je werkuren, diensten en rechten in.",
            "Online boeken: klanten boeken via je boekingslink, je salonprofiel of de marketplace. De afspraak staat meteen in je agenda.",
            "Zichtbaarheid: na publicatie kunnen mensen in de buurt je salon vinden op plaats en behandeling.",
          ],
        },
      ],
    },
    fr: {
      title: "Qu’est-ce que Gleami ?",
      description:
        "Gleami est une plateforme en ligne et un système de gestion tout-en-un pour coiffeurs, barbiers, instituts d’ongles et salons de beauté.",
      category: "Gleami",
      readingTime: "2 min de lecture",
      publishedAt: "2026-10-24",
      updatedAt: "2026-10-24",
      closing:
        "Vous voulez réserver, ou vous utilisez Gleami pour gérer votre salon ?",
      sections: [
        {
          title: "Que fait Gleami pour les clients ?",
          paragraphs: [],
          bullets: [
            "Réserver en ligne : vous planifiez vous-même une prestation, aussi en dehors des heures d’ouverture, sans appeler.",
            "Chercher et comparer : vous cherchez par prestation et par lieu, et vous comparez l’offre, les prix et l’adresse. Les avis apparaissent lorsqu’ils sont disponibles.",
            "Rendez-vous et favoris : dans votre compte, vous retrouvez vos rendez-vous et les salons que vous avez enregistrés.",
          ],
        },
        {
          title: "Que fait Gleami pour les salons ?",
          paragraphs: [],
          bullets: [
            "Logiciel de salon : agenda, clients, équipe et paiements sont dans un seul système. Pour chaque membre de l’équipe, vous réglez les horaires, les prestations et les droits.",
            "Réservation en ligne : les clients réservent via votre lien, votre profil ou la marketplace. Le rendez-vous arrive directement dans votre agenda.",
            "Visibilité : une fois publié, les gens à proximité trouvent votre salon par lieu et par prestation.",
          ],
        },
      ],
    },
    en: {
      title: "What is Gleami?",
      description:
        "Gleami is an online platform and an all-in-one management system for hairdressers, barbers, nail studios and beauty salons.",
      category: "Gleami",
      readingTime: "2 min read",
      publishedAt: "2026-10-24",
      updatedAt: "2026-10-24",
      closing:
        "Do you want to book an appointment, or do you use Gleami to run your salon?",
      sections: [
        {
          title: "What does Gleami do for clients?",
          paragraphs: [],
          bullets: [
            "Book online: you schedule a treatment yourself, including outside opening hours, without calling.",
            "Search and compare: you search by treatment and place, and compare what is offered, the prices and the location. Reviews appear when they are available.",
            "Appointments and favourites: your account shows the appointments you booked and the salons you saved.",
          ],
        },
        {
          title: "What does Gleami do for salons?",
          paragraphs: [],
          bullets: [
            "Salon software: calendar, clients, team and payments sit in one system. For each team member you set working hours, services and permissions.",
            "Online booking: clients book through your booking link, your salon profile or the marketplace. The appointment lands straight in your calendar.",
            "Visibility: once you publish, people nearby can find your salon by place and treatment.",
          ],
        },
      ],
    },
    de: {
      title: "Was ist Gleami?",
      description:
        "Gleami ist eine Online-Plattform und ein All-in-one-System für Friseure, Barbiere, Nagelstudios und Kosmetiksalons.",
      category: "Gleami",
      readingTime: "2 Min. Lesezeit",
      publishedAt: "2026-10-24",
      updatedAt: "2026-10-24",
      closing:
        "Willst du einen Termin buchen, oder nutzt du Gleami, um deinen Salon zu führen?",
      sections: [
        {
          title: "Was macht Gleami für Kunden?",
          paragraphs: [],
          bullets: [
            "Online buchen: du planst eine Behandlung selbst, auch außerhalb der Öffnungszeiten, ohne anzurufen.",
            "Suchen und vergleichen: du suchst nach Behandlung und Ort und vergleichst Angebot, Preise und Standort. Bewertungen stehen dabei, wenn sie vorhanden sind.",
            "Termine und Favoriten: in deinem Konto siehst du gebuchte Termine und gespeicherte Salons.",
          ],
        },
        {
          title: "Was macht Gleami für Salons?",
          paragraphs: [],
          bullets: [
            "Salonsoftware: Kalender, Kunden, Team und Zahlungen liegen in einem System. Pro Mitarbeiter legst du Arbeitszeiten, Leistungen und Rechte fest.",
            "Online-Buchung: Kunden buchen über deinen Link, dein Salonprofil oder den Marketplace. Der Termin steht sofort im Kalender.",
            "Sichtbarkeit: nach der Veröffentlichung finden Menschen in der Nähe deinen Salon nach Ort und Behandlung.",
          ],
        },
      ],
    },
  },
};
