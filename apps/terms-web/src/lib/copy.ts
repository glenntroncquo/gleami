import type { DocId } from "@/content/documents";
import type { Language } from "@/lib/i18n";

export type TermsCopy = {
  skip: string;
  homeLabel: string;
  navLabel: string;
  languageLabel: string;
  forBusiness: string;
  login: string;
  documentsLabel: string;
  overview: string;
  onThisPage: string;
  draft: string;
  footer: {
    description: string;
    marketplace: string;
    company: string;
    legal: string;
    salons: string;
    treatments: string;
    city: string;
    blog: string;
    product: string;
    faq: string;
    rights: string;
  };
  read: Record<DocId, string>;
};

const nl: TermsCopy = {
  skip: "Ga naar de inhoud",
  homeLabel: "Gleami startpagina",
  navLabel: "Hoofdmenu",
  languageLabel: "Taal",
  forBusiness: "Voor bedrijven",
  login: "Inloggen",
  documentsLabel: "Juridische documenten",
  overview: "Overzicht",
  onThisPage: "Op deze pagina",
  draft: "Werkversie · 24 oktober 2026",
  footer: {
    description:
      "Ontdek salons en geef beautyprofessionals één helder platform voor hun dagelijkse werk.",
    marketplace: "Marketplace",
    company: "Gleami voor bedrijven",
    legal: "Juridisch",
    salons: "Alle salons",
    treatments: "Behandelingen",
    city: "Merelbeke",
    blog: "Blog",
    product: "Platform",
    faq: "Veelgestelde vragen",
    rights: "Alle rechten voorbehouden.",
  },
  read: {
    terms: "Lees onze gebruiksvoorwaarden",
    privacy: "Lees ons privacybeleid",
    service: "Lees onze servicevoorwaarden",
    partner: "Lees onze partnervoorwaarden",
    data: "Lees ons beleid gegevensbescherming",
    cookies: "Lees ons cookiebeleid",
  },
};

const fr: TermsCopy = {
  skip: "Aller au contenu",
  homeLabel: "Page d'accueil Gleami",
  navLabel: "Menu principal",
  languageLabel: "Langue",
  forBusiness: "Pour les pros",
  login: "Connexion",
  documentsLabel: "Documents juridiques",
  overview: "Aperçu",
  onThisPage: "Sur cette page",
  draft: "Version de travail · 24 octobre 2026",
  footer: {
    description:
      "Découvrez des salons et offrez aux professionnels de la beauté une plateforme claire pour leur quotidien.",
    marketplace: "Marketplace",
    company: "Gleami pour les pros",
    legal: "Informations",
    salons: "Tous les salons",
    treatments: "Prestations",
    city: "Merelbeke",
    blog: "Blog",
    product: "Plateforme",
    faq: "Questions fréquentes",
    rights: "Tous droits réservés.",
  },
  read: {
    terms: "Lire nos conditions d'utilisation",
    privacy: "Lire notre politique de confidentialité",
    service: "Lire nos conditions de service",
    partner: "Lire nos conditions partenaires",
    data: "Lire notre politique de protection des données",
    cookies: "Lire notre politique cookies",
  },
};

const en: TermsCopy = {
  skip: "Skip to content",
  homeLabel: "Gleami home",
  navLabel: "Main menu",
  languageLabel: "Language",
  forBusiness: "For business",
  login: "Log in",
  documentsLabel: "Legal documents",
  overview: "Overview",
  onThisPage: "On this page",
  draft: "Working draft · 24 October 2026",
  footer: {
    description:
      "Discover salons and give beauty professionals one clear platform for their daily work.",
    marketplace: "Marketplace",
    company: "Gleami for businesses",
    legal: "Legal",
    salons: "All salons",
    treatments: "Treatments",
    city: "Merelbeke",
    blog: "Blog",
    product: "Platform",
    faq: "FAQ",
    rights: "All rights reserved.",
  },
  read: {
    terms: "Read our Terms of Use",
    privacy: "Read our Privacy Policy",
    service: "Read our Service Terms",
    partner: "Read our Partner Terms",
    data: "Read our Data Protection Policy",
    cookies: "Read our Cookie Policy",
  },
};

const dictionaries: Record<Language, TermsCopy> = { nl, fr, en };

export function getCopy(language: Language): TermsCopy {
  return dictionaries[language];
}
