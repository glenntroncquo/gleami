import type { Language, TreatmentKey } from "@/lib/i18n";
import type { CategoryIconKey } from "@/components/marketplace/category-icons";

export const recoveryTreatments: readonly { treatment: TreatmentKey; icon: CategoryIconKey }[] = [
  { treatment: "haircut", icon: "haar-en-styling" },
  { treatment: "nails", icon: "nagels" },
  { treatment: "balayage", icon: "vrouwenkapper" },
  { treatment: "keratin", icon: "keratine" },
];

type RecoveryMessage = {
  eyebrow: string;
  title: string;
  accent: string;
  body: string;
};

type RecoveryCopy = {
  empty: RecoveryMessage;
  notFound: RecoveryMessage;
  discover: string;
  reset: string;
  home: string;
  map: string;
  suggestions: string;
  surprise: string;
  surpriseHint: string;
  caption: string;
  footer: string;
  footerLink: string;
};

export const recoveryMessages: Record<Language, RecoveryCopy> = {
  nl: {
    empty: {
      eyebrow: "Een klein omwegje",
      title: "Geen match.",
      accent: "Nog genoeg moois.",
      body: "Deze zoekopdracht levert geen salons op. Probeer iets anders, of ontdek waar jouw volgende verwenmoment op je wacht.",
    },
    notFound: {
      eyebrow: "404 · Even niet hier",
      title: "Deze pagina neemt",
      accent: "een beautybreak.",
      body: "De pagina die je zoekt bestaat niet (meer). Gelukkig is je volgende verwenmoment wél te vinden. We helpen je op weg.",
    },
    discover: "Ontdek salons",
    reset: "Toon alle salons",
    home: "Naar de startpagina",
    map: "Ontdek de kaart",
    suggestions: "Waar heb je zin in?",
    surprise: "Verras me",
    surpriseHint: "Ontdek een willekeurige behandeling",
    caption: "Zelfs sterren hebben af en toe me-time nodig.",
    footer: "Een omweg kan ook iets moois opleveren.",
    footerLink: "Vind jouw volgende salon",
  },
  en: {
    empty: {
      eyebrow: "A little detour",
      title: "No matches.",
      accent: "Still plenty of glow.",
      body: "No salons match this search just yet. Try something different, or discover where your next feel-good moment is waiting.",
    },
    notFound: {
      eyebrow: "404 · A little off-track",
      title: "This page is taking",
      accent: "a beauty break.",
      body: "The page you’re looking for isn’t here anymore. Your next feel-good moment still is. Let’s get you there.",
    },
    discover: "Discover salons",
    reset: "Show all salons",
    home: "Back to home",
    map: "Explore the map",
    suggestions: "What are you in the mood for?",
    surprise: "Surprise me",
    surpriseHint: "Discover a random treatment",
    caption: "Even stars need a little me-time.",
    footer: "A little detour can lead to something lovely.",
    footerLink: "Find your next salon",
  },
  fr: {
    empty: {
      eyebrow: "Un petit détour",
      title: "Pas de résultat.",
      accent: "Encore plein d’envies.",
      body: "Aucun salon ne correspond à cette recherche. Essayez autre chose, ou découvrez où vous attend votre prochain moment de bien-être.",
    },
    notFound: {
      eyebrow: "404 · Un petit détour",
      title: "Cette page s’offre",
      accent: "une pause beauté.",
      body: "La page que vous cherchez n’est plus ici. Votre prochain moment de bien-être, lui, vous attend toujours. On vous guide.",
    },
    discover: "Découvrir les salons",
    reset: "Voir tous les salons",
    home: "Retour à l’accueil",
    map: "Explorer la carte",
    suggestions: "De quoi avez-vous envie ?",
    surprise: "Surprenez-moi",
    surpriseHint: "Découvrir une prestation au hasard",
    caption: "Même les étoiles ont besoin d’une pause.",
    footer: "Un petit détour réserve parfois de belles surprises.",
    footerLink: "Trouvez votre prochain salon",
  },
  de: {
    empty: {
      eyebrow: "Ein kleiner Umweg",
      title: "Kein Treffer.",
      accent: "Noch viel zu entdecken.",
      body: "Zu dieser Suche gibt es noch keine Salons. Versuche etwas anderes oder entdecke, wo dein nächster Wohlfühlmoment wartet.",
    },
    notFound: {
      eyebrow: "404 · Kurz vom Weg abgekommen",
      title: "Diese Seite macht",
      accent: "eine Beauty-Pause.",
      body: "Die gesuchte Seite ist nicht mehr hier. Dein nächster Wohlfühlmoment wartet aber noch auf dich. Wir zeigen dir den Weg.",
    },
    discover: "Salons entdecken",
    reset: "Alle Salons anzeigen",
    home: "Zur Startseite",
    map: "Karte entdecken",
    suggestions: "Worauf hast du Lust?",
    surprise: "Überrasch mich",
    surpriseHint: "Eine zufällige Behandlung entdecken",
    caption: "Auch Sterne brauchen mal eine Auszeit.",
    footer: "Manchmal führen kleine Umwege zu schönen Entdeckungen.",
    footerLink: "Finde deinen nächsten Salon",
  },
};

export function surpriseTreatment(random: number): TreatmentKey {
  const index = Math.min(recoveryTreatments.length - 1, Math.max(0, Math.floor(random * recoveryTreatments.length)));
  return recoveryTreatments[Number.isFinite(index) ? index : 0].treatment;
}
