import type { Language, TreatmentKey } from "@/lib/i18n";

type TreatmentEditorial = {
  summary: string;
  detail: string;
  duration: string;
  goodToKnow: string;
};

export const treatmentEditorial: Record<
  TreatmentKey,
  Record<Language, TreatmentEditorial>
> = {
  balayage: {
    nl: {
      summary:
        "Balayage is een vrije kleurtechniek waarbij lichtere lokken met de hand worden aangebracht voor een zachte, natuurlijke overgang.",
      detail:
        "De kleur wordt afgestemd op je basiskleur, haarconditie en gewenste onderhoud. Een consult en toner zijn vaak onderdeel van de afspraak.",
      duration: "Reken meestal op 2 tot 4 uur, afhankelijk van lengte en resultaat.",
      goodToKnow:
        "Vraag of toner, drogen en nazorgproducten in de vermelde prijs zijn inbegrepen.",
    },
    fr: {
      summary:
        "Le balayage est une technique de coloration à main levée qui crée des reflets doux et un résultat naturel.",
      detail:
        "La couleur est adaptée à votre base, à l’état du cheveu et au niveau d’entretien souhaité. Un diagnostic et une patine font souvent partie du rendez-vous.",
      duration:
        "Comptez généralement 2 à 4 heures selon la longueur et le résultat.",
      goodToKnow:
        "Demandez si la patine, le coiffage et les soins sont compris dans le prix affiché.",
    },
    de: {
      summary:
        "Balayage ist eine Freihand-Färbetechnik für weiche Übergänge und natürlich wirkende Highlights.",
      detail:
        "Farbe und Platzierung werden an Ausgangsfarbe, Haarzustand und gewünschten Pflegeaufwand angepasst. Beratung und Tönung gehören oft dazu.",
      duration:
        "Je nach Haarlänge und Ergebnis dauert der Termin meist 2 bis 4 Stunden.",
      goodToKnow:
        "Frage nach, ob Tönung, Styling und Pflege im angezeigten Preis enthalten sind.",
    },
  },
  haircut: {
    nl: {
      summary:
        "Een goede knipbeurt begint met een korte bespreking van je haar, dagelijkse routine en gewenste vorm.",
      detail:
        "De dienst kan wassen, knippen, drogen en styling omvatten. Salons bieden vaak verschillende prijzen volgens lengte, techniek of stylist.",
      duration: "De meeste knipbeurten duren ongeveer 30 tot 75 minuten.",
      goodToKnow:
        "Controleer of wassen en brushing inbegrepen zijn en kies de juiste haarlengte bij het boeken.",
    },
    fr: {
      summary:
        "Une bonne coupe commence par un échange sur vos cheveux, votre routine et la forme souhaitée.",
      detail:
        "La prestation peut inclure shampooing, coupe, séchage et coiffage. Le prix varie parfois selon la longueur, la technique ou le professionnel.",
      duration: "La plupart des coupes durent entre 30 et 75 minutes.",
      goodToKnow:
        "Vérifiez si le shampooing et le brushing sont compris et sélectionnez la bonne longueur lors de la réservation.",
    },
    de: {
      summary:
        "Ein guter Haarschnitt beginnt mit einer kurzen Beratung zu Haar, Alltag und gewünschter Form.",
      detail:
        "Die Leistung kann Waschen, Schneiden, Föhnen und Styling umfassen. Preise unterscheiden sich oft nach Länge, Technik oder Stylist.",
      duration: "Die meisten Haarschnitte dauern etwa 30 bis 75 Minuten.",
      goodToKnow:
        "Prüfe, ob Waschen und Föhnen enthalten sind, und wähle bei der Buchung die passende Haarlänge.",
    },
  },
  keratin: {
    nl: {
      summary:
        "Een keratinebehandeling maakt het haar gladder, vermindert pluis en kan het stylen thuis eenvoudiger maken.",
      detail:
        "Het resultaat en de houdbaarheid hangen af van het product, je haartype en de nazorg. Een specialist bespreekt vooraf wat realistisch is.",
      duration:
        "Afhankelijk van de haarlengte duurt een behandeling vaak 2 tot 4 uur.",
      goodToKnow:
        "Vraag welk product wordt gebruikt en hoe lang je na de afspraak moet wachten met wassen.",
    },
    fr: {
      summary:
        "Un soin à la kératine lisse la fibre, réduit les frisottis et peut faciliter le coiffage au quotidien.",
      detail:
        "Le résultat et sa tenue dépendent du produit, du type de cheveu et de l’entretien. Le professionnel doit expliquer ce qui est réaliste.",
      duration:
        "Selon la longueur, la prestation dure généralement entre 2 et 4 heures.",
      goodToKnow:
        "Demandez quel produit est utilisé et combien de temps attendre avant le premier shampooing.",
    },
    de: {
      summary:
        "Eine Keratinbehandlung glättet das Haar, reduziert Frizz und kann das tägliche Styling erleichtern.",
      detail:
        "Ergebnis und Haltbarkeit hängen von Produkt, Haartyp und Nachpflege ab. Ein Profi erklärt vorab, was realistisch ist.",
      duration:
        "Je nach Haarlänge dauert die Behandlung in der Regel 2 bis 4 Stunden.",
      goodToKnow:
        "Frage nach dem verwendeten Produkt und danach, wann du das Haar wieder waschen darfst.",
    },
  },
  nails: {
    nl: {
      summary:
        "Nagelbehandelingen lopen van een klassieke manicure en gellak tot BIAB en nail art.",
      detail:
        "Kies een dienst die past bij je natuurlijke nagel, het gewenste resultaat en hoeveel onderhoud je wilt.",
      duration:
        "Een afspraak duurt meestal 30 tot 90 minuten, afhankelijk van techniek en ontwerp.",
      goodToKnow:
        "Boek verwijdering apart wanneer je al product op de nagels hebt en vermeld eventuele gevoeligheden.",
    },
    fr: {
      summary:
        "Les prestations ongles vont de la manucure classique au vernis semi-permanent, au BIAB et au nail art.",
      detail:
        "Choisissez selon l’état de l’ongle naturel, le résultat voulu et le niveau d’entretien souhaité.",
      duration:
        "Une séance dure généralement de 30 à 90 minutes selon la technique et le décor.",
      goodToKnow:
        "Ajoutez une dépose si vous portez déjà un produit et signalez toute sensibilité.",
    },
    de: {
      summary:
        "Nagelbehandlungen reichen von klassischer Maniküre und Gel-Lack bis zu BIAB und Nail Art.",
      detail:
        "Wähle passend zu Naturnagel, gewünschtem Ergebnis und Pflegeaufwand.",
      duration:
        "Je nach Technik und Design dauert ein Termin meist 30 bis 90 Minuten.",
      goodToKnow:
        "Buche das Entfernen vorhandenen Materials separat und erwähne mögliche Empfindlichkeiten.",
    },
  },
};
