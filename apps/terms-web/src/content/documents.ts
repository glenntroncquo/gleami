import { languageOf, type Language, type Locale } from "@/lib/i18n";

export const docIds = ["terms", "privacy", "service", "partner", "data", "cookies"] as const;

export type DocId = (typeof docIds)[number];

export type Block = string | string[];

export type Section = {
  id: string;
  title: string;
  body: Block[];
};

export type LegalDocument = {
  id: DocId;
  slug: Record<Language, string>;
  nav: Record<Language, string>;
  title: Record<Language, string>;
  summary: Record<Language, string>;
  sections: Record<Language, Section[]>;
};

function section(id: string, title: string, ...body: Block[]): Section {
  return { id, title, body };
}

/**
 * Original Gleami drafts. They describe the product as it exists and are not
 * a counsel-reviewed contract. Do not replace these with another company's terms.
 */
export const documents: LegalDocument[] = [
  {
    id: "terms",
    slug: {
      nl: "gebruiksvoorwaarden",
      fr: "conditions-dutilisation",
      en: "terms-of-use",
    },
    nav: {
      nl: "Gebruiksvoorwaarden",
      fr: "Conditions d'utilisation",
      en: "Terms of use",
    },
    title: {
      nl: "Gebruiksvoorwaarden van Gleami",
      fr: "Conditions d'utilisation de Gleami",
      en: "Gleami terms of use",
    },
    summary: {
      nl: "Lees de gebruiksvoorwaarden voordat je de website of de apps gebruikt, en voordat je een afspraak boekt bij een salon.",
      fr: "Lisez les conditions d'utilisation avant d'utiliser le site ou les applications, et avant de réserver un rendez-vous dans un salon.",
      en: "Please read the Terms of Use before you use the website or apps, and before you book an appointment with a salon.",
    },
    sections: {
      nl: [
        section(
          "introduction",
          "Inleiding",
          "Deze gebruiksvoorwaarden gelden voor gleami.eu en de Gleami-apps waarmee je salons ontdekt en afspraken boekt. Gleami stelt het platform ter beschikking. Het salon dat je kiest, voert de behandeling uit.",
          "Dit is een werkversie. De tekst is nog niet nagekeken door een jurist en kan nog wijzigen. Door het platform te gebruiken, aanvaard je de versie die op dat moment op de site staat.",
        ),
        section(
          "marketplace",
          "De marketplace",
          "Op Gleami vergelijk je salons, behandelingen en prijzen, en boek je een moment dat het salon beschikbaar heeft. Informatie op een salonpagina komt van dat salon. Controleer altijd de beschrijving, de duur en de prijs voordat je bevestigt.",
          "Een boeking is een afspraak met het salon, niet met Gleami. Vragen over de behandeling, een wijziging of een no-show regel je met het salon, tenzij het platform zelf een stap niet correct heeft uitgevoerd.",
        ),
        section(
          "account",
          "Account",
          "Voor een account geef je juiste gegevens en hou je je aanmelding voor jezelf. Je bent verantwoordelijk voor wat er via je account gebeurt. We kunnen een account sluiten als het wordt misbruikt of als de gegevens niet kloppen.",
        ),
        section(
          "use",
          "Toegestaan gebruik",
          "Je gebruikt Gleami voor jezelf, om een salon te vinden en te boeken. Je mag het platform niet schaden, geen accounts of inhoud overnemen, en het niet inzetten voor onrechtmatige of misleidende doeleinden.",
          [
            "Geen toegang proberen te krijgen tot accounts, systemen of gegevens die niet van jou zijn.",
            "Geen geautomatiseerd verzamelen van salon- of gebruikersgegevens.",
            "Geen inhoud plaatsen die misleidend, onrechtmatig of schadelijk is.",
          ],
        ),
        section(
          "changes",
          "Wijzigingen",
          "We kunnen deze voorwaarden aanpassen door een nieuwe versie op deze site te publiceren. Als je Gleami daarna blijft gebruiken, geldt de bijgewerkte versie. De datum bovenaan de pagina toont wanneer deze werkversie voor het laatst is aangepast.",
        ),
        section(
          "contact",
          "Contact",
          "Vragen over deze voorwaarden kan je sturen naar {mail}. Lees ook het {privacy}.",
        ),
      ],
      fr: [
        section(
          "introduction",
          "Introduction",
          "Ces conditions d'utilisation s'appliquent à gleami.eu et aux applications Gleami qui permettent de découvrir des salons et de réserver un rendez-vous. Gleami fournit la plateforme. Le salon que vous choisissez réalise la prestation.",
          "Ceci est une version de travail. Le texte n'a pas encore été relu par un juriste et peut encore changer. En utilisant la plateforme, vous acceptez la version publiée à ce moment-là.",
        ),
        section(
          "marketplace",
          "La marketplace",
          "Sur Gleami, vous comparez des salons, des prestations et des prix, puis vous réservez un moment que le salon a rendu disponible. Les informations d'une page salon viennent de ce salon. Vérifiez toujours la description, la durée et le prix avant de confirmer.",
          "Une réservation est un rendez-vous avec le salon, pas avec Gleami. Les questions sur la prestation, un changement ou une absence se règlent avec le salon, sauf si la plateforme elle-même a mal exécuté une étape.",
        ),
        section(
          "account",
          "Compte",
          "Pour un compte, vous fournissez des informations exactes et vous gardez votre accès pour vous. Vous êtes responsable de ce qui se passe via votre compte. Nous pouvons fermer un compte en cas d'usage abusif ou de données inexactes.",
        ),
        section(
          "use",
          "Usage autorisé",
          "Vous utilisez Gleami pour vous-même, afin de trouver un salon et de réserver. Vous ne pouvez pas nuire à la plateforme, reprendre des comptes ou des contenus, ni l'utiliser à des fins illicites ou trompeuses.",
          [
            "Ne tentez pas d'accéder à des comptes, des systèmes ou des données qui ne sont pas les vôtres.",
            "Ne collectez pas automatiquement des données de salons ou d'utilisateurs.",
            "Ne publiez pas de contenu trompeur, illicite ou nuisible.",
          ],
        ),
        section(
          "changes",
          "Modifications",
          "Nous pouvons adapter ces conditions en publiant une nouvelle version sur ce site. Si vous continuez à utiliser Gleami ensuite, la version mise à jour s'applique. La date en haut de page indique la dernière modification de cette version de travail.",
        ),
        section(
          "contact",
          "Contact",
          "Les questions sur ces conditions peuvent être envoyées à {mail}. Lisez aussi la {privacy}.",
        ),
      ],
      en: [
        section(
          "introduction",
          "Introduction",
          "These terms of use apply to gleami.eu and the Gleami apps you use to discover salons and book appointments. Gleami provides the platform. The salon you choose carries out the treatment.",
          "This is a working draft. It has not been reviewed by counsel and may still change. By using the platform, you accept the version published at that time.",
        ),
        section(
          "marketplace",
          "The marketplace",
          "On Gleami you compare salons, treatments and prices, and you book a time the salon has made available. Information on a salon page comes from that salon. Always check the description, duration and price before you confirm.",
          "A booking is an appointment with the salon, not with Gleami. Questions about the treatment, a change or a no-show are handled with the salon, unless the platform itself failed to complete a step correctly.",
        ),
        section(
          "account",
          "Your account",
          "For an account you provide accurate details and you keep your sign-in to yourself. You are responsible for activity on your account. We may close an account that is misused or based on inaccurate details.",
        ),
        section(
          "use",
          "Acceptable use",
          "You use Gleami for yourself, to find a salon and book. You may not harm the platform, take over accounts or content, or use it for unlawful or misleading purposes.",
          [
            "Do not try to access accounts, systems or data that are not yours.",
            "Do not automatically collect salon or user data.",
            "Do not post content that is misleading, unlawful or harmful.",
          ],
        ),
        section(
          "changes",
          "Changes",
          "We may update these terms by publishing a new version on this site. If you keep using Gleami afterwards, the updated version applies. The date at the top of the page shows when this draft was last changed.",
        ),
        section(
          "contact",
          "Contact",
          "Questions about these terms can be sent to {mail}. Also read the {privacy}.",
        ),
      ],
    },
  },
  {
    id: "privacy",
    slug: {
      nl: "privacybeleid",
      fr: "politique-de-confidentialite",
      en: "privacy-policy",
    },
    nav: {
      nl: "Privacybeleid",
      fr: "Politique de confidentialité",
      en: "Privacy policy",
    },
    title: {
      nl: "Privacybeleid van Gleami",
      fr: "Politique de confidentialité de Gleami",
      en: "Gleami privacy policy",
    },
    summary: {
      nl: "Lees hoe we gegevens verzamelen, bewaren en gebruiken wanneer je Gleami bezoekt, een account maakt of een afspraak boekt.",
      fr: "Découvrez comment nous collectons, conservons et utilisons des données lorsque vous visitez Gleami, créez un compte ou réservez un rendez-vous.",
      en: "Read how we collect, store and use information when you visit Gleami, create an account or book an appointment.",
    },
    sections: {
      nl: [
        section(
          "who",
          "Wie we zijn",
          "Gleami is de uitgever van de marketplace op gleami.eu en van de bijbehorende apps. Voor je marketplace-account en je gebruik van de site zijn wij verwerkingsverantwoordelijke.",
          "Boek je bij een salon, dan krijgt dat salon de gegevens die nodig zijn om de afspraak uit te voeren. Voor het klantdossier van het salon is het salon zelf verantwoordelijk. Meer daarover staat in {data}.",
          "Dit is een werkversie en nog geen definitief privacybeleid.",
        ),
        section(
          "data",
          "Welke gegevens",
          "Afhankelijk van wat je doet, kunnen we deze gegevens verwerken:",
          [
            "Accountgegevens, zoals je naam, e-mailadres en telefoonnummer.",
            "Boekingsgegevens, zoals salon, behandeling, tijdstip en berichten die bij de afspraak horen.",
            "Technische gegevens, zoals taalvoorkeur, apparaat en loggegevens die nodig zijn om de site te laten werken.",
            "Berichten die je ons stuurt, bijvoorbeeld via {mail}.",
          ],
        ),
        section(
          "why",
          "Waarom",
          "We gebruiken die gegevens om je account te beheren, een boeking door te geven aan het salon, de marketplace te beveiligen en je vragen te beantwoorden. We verkopen je gegevens niet.",
        ),
        section(
          "sharing",
          "Met wie we delen",
          "We delen boekingsgegevens met het salon dat je hebt gekozen. We werken ook met verwerkers die hosting, e-mail of een vergelijkbare technische dienst leveren, en alleen voor die opdracht. Als de wet het vraagt, kunnen we gegevens meedelen aan een bevoegde instantie.",
        ),
        section(
          "rights",
          "Je rechten",
          "Je kan inzage, verbetering of wissing vragen, en bezwaar maken tegen een verwerking die op ons gerechtvaardigd belang steunt. Stuur je vraag naar {mail}. Je kan ook een klacht indienen bij de Gegevensbeschermingsautoriteit.",
        ),
        section(
          "cookies",
          "Cookies",
          "Hoe we cookies gebruiken, staat in {cookies}.",
        ),
      ],
      fr: [
        section(
          "who",
          "Qui nous sommes",
          "Gleami édite la marketplace sur gleami.eu et les applications associées. Pour votre compte marketplace et votre usage du site, nous sommes responsable du traitement.",
          "Quand vous réservez dans un salon, ce salon reçoit les données nécessaires pour honorer le rendez-vous. Pour le dossier client du salon, le salon est responsable. Le détail se trouve dans la {data}.",
          "Ceci est une version de travail, pas encore une politique de confidentialité définitive.",
        ),
        section(
          "data",
          "Quelles données",
          "Selon ce que vous faites, nous pouvons traiter ces données :",
          [
            "Données de compte, comme votre nom, votre e-mail et votre numéro de téléphone.",
            "Données de réservation, comme le salon, la prestation, l'horaire et les messages liés au rendez-vous.",
            "Données techniques, comme la langue, l'appareil et les journaux nécessaires au fonctionnement du site.",
            "Messages que vous nous envoyez, par exemple via {mail}.",
          ],
        ),
        section(
          "why",
          "Pourquoi",
          "Nous utilisons ces données pour gérer votre compte, transmettre une réservation au salon, sécuriser la marketplace et répondre à vos questions. Nous ne vendons pas vos données.",
        ),
        section(
          "sharing",
          "Avec qui nous partageons",
          "Nous partageons les données de réservation avec le salon que vous avez choisi. Nous travaillons aussi avec des sous-traitants qui fournissent l'hébergement, l'e-mail ou un service technique comparable, uniquement pour cette mission. Si la loi l'exige, nous pouvons communiquer des données à une autorité compétente.",
        ),
        section(
          "rights",
          "Vos droits",
          "Vous pouvez demander l'accès, la rectification ou l'effacement, et vous opposer à un traitement fondé sur notre intérêt légitime. Envoyez votre demande à {mail}. Vous pouvez aussi introduire une plainte auprès de l'Autorité de protection des données.",
        ),
        section(
          "cookies",
          "Cookies",
          "L'usage des cookies est décrit dans les {cookies}.",
        ),
      ],
      en: [
        section(
          "who",
          "Who we are",
          "Gleami publishes the marketplace on gleami.eu and the related apps. For your marketplace account and your use of the site, we are the controller.",
          "When you book with a salon, that salon receives the details it needs to carry out the appointment. The salon is responsible for its own client record. More on that is in {data}.",
          "This is a working draft, not yet a final privacy policy.",
        ),
        section(
          "data",
          "Which data",
          "Depending on what you do, we may process:",
          [
            "Account details, such as your name, email address and phone number.",
            "Booking details, such as the salon, treatment, time and messages that belong to the appointment.",
            "Technical details, such as language, device and logs needed to run the site.",
            "Messages you send us, for example through {mail}.",
          ],
        ),
        section(
          "why",
          "Why",
          "We use that information to run your account, pass a booking to the salon, keep the marketplace secure and answer your questions. We do not sell your data.",
        ),
        section(
          "sharing",
          "Who we share it with",
          "We share booking details with the salon you chose. We also use processors that provide hosting, email or a similar technical service, and only for that task. Where the law requires it, we may disclose information to a competent authority.",
        ),
        section(
          "rights",
          "Your rights",
          "You can ask for access, correction or deletion, and you can object to processing that relies on our legitimate interest. Send your request to {mail}. You can also lodge a complaint with the Belgian Data Protection Authority.",
        ),
        section(
          "cookies",
          "Cookies",
          "How we use cookies is described in {cookies}.",
        ),
      ],
    },
  },
  {
    id: "service",
    slug: {
      nl: "servicevoorwaarden",
      fr: "conditions-de-service",
      en: "terms-of-service",
    },
    nav: {
      nl: "Servicevoorwaarden",
      fr: "Conditions de service",
      en: "Terms of service",
    },
    title: {
      nl: "Servicevoorwaarden van Gleami",
      fr: "Conditions de service de Gleami",
      en: "Gleami terms of service",
    },
    summary: {
      nl: "Een samenvatting van de voorwaarden voor salons die Gleami gebruiken om hun agenda, klanten en online boekingen te beheren.",
      fr: "Un résumé des conditions pour les salons qui utilisent Gleami afin de gérer leur agenda, leurs clients et les réservations en ligne.",
      en: "A summary of the terms for salons that use Gleami to run their calendar, clients and online bookings.",
    },
    sections: {
      nl: [
        section(
          "service",
          "De dienst",
          "Deze servicevoorwaarden gelden voor salons en hun team die de Gleami-software gebruiken: de agenda, het klantenbestand, de kassa en de online boekingspagina. Ze gelden niet voor een bezoeker die alleen een afspraak boekt. Daarvoor zijn de {terms}.",
          "Dit is een werkversie. Prijzen, facturatie en een definitieve overeenkomst worden apart vastgelegd en staan nog niet in deze tekst.",
        ),
        section(
          "account",
          "Je salonaccount",
          "Je houdt de gegevens van je salon juist: naam, locatie, team, openingstijden en behandelingen. Iedereen met toegang tot het account handelt namens het salon. Je kan toegang intrekken wanneer iemand het team verlaat.",
        ),
        section(
          "clients",
          "Gegevens van klanten",
          "Klantgegevens die je in Gleami bijhoudt, blijven gegevens van jouw salon. Je zorgt voor een geldige grondslag om ze te bewaren. Gleami verwerkt ze om de software te leveren. De rolverdeling staat in {data}.",
        ),
        section(
          "availability",
          "Beschikbaarheid",
          "We houden de software beschikbaar en beveiligd, en we mogen functies wijzigen om het product te verbeteren. Een onderbreking voor onderhoud of een storing geeft geen automatisch recht op schadevergoeding in deze werkversie.",
        ),
        section(
          "contact",
          "Contact",
          "Vragen over de software of deze voorwaarden: {mail}.",
        ),
      ],
      fr: [
        section(
          "service",
          "Le service",
          "Ces conditions de service s'appliquent aux salons et à leur équipe qui utilisent le logiciel Gleami : l'agenda, le fichier clients, la caisse et la page de réservation en ligne. Elles ne s'appliquent pas à un visiteur qui réserve seulement un rendez-vous. Pour cela, voir les {terms}.",
          "Ceci est une version de travail. Les prix, la facturation et un contrat définitif seront fixés à part et ne figurent pas encore dans ce texte.",
        ),
        section(
          "account",
          "Le compte du salon",
          "Vous gardez les informations du salon exactes : nom, adresse, équipe, horaires et prestations. Toute personne qui a accès au compte agit pour le salon. Vous pouvez retirer un accès quand quelqu'un quitte l'équipe.",
        ),
        section(
          "clients",
          "Données des clients",
          "Les données clients que vous tenez dans Gleami restent celles de votre salon. Vous veillez à avoir une base valable pour les conserver. Gleami les traite pour fournir le logiciel. La répartition des rôles est dans la {data}.",
        ),
        section(
          "availability",
          "Disponibilité",
          "Nous maintenons le logiciel disponible et sécurisé, et nous pouvons modifier des fonctions pour améliorer le produit. Une interruption pour maintenance ou un incident n'ouvre pas, dans cette version de travail, un droit automatique à des dommages et intérêts.",
        ),
        section(
          "contact",
          "Contact",
          "Questions sur le logiciel ou ces conditions : {mail}.",
        ),
      ],
      en: [
        section(
          "service",
          "The service",
          "These terms of service apply to salons and their teams that use the Gleami software: the calendar, client records, checkout and the online booking page. They do not apply to a visitor who only books an appointment. That is covered by the {terms}.",
          "This is a working draft. Pricing, billing and a final agreement will be set out separately and are not in this text yet.",
        ),
        section(
          "account",
          "Your salon account",
          "You keep the salon details accurate: name, location, team, opening hours and treatments. Anyone with access to the account acts for the salon. You can remove access when someone leaves the team.",
        ),
        section(
          "clients",
          "Client data",
          "Client data you keep in Gleami remains your salon's data. You need a valid basis to store it. Gleami processes it to provide the software. How the roles are split is in {data}.",
        ),
        section(
          "availability",
          "Availability",
          "We keep the software available and secure, and we may change features to improve the product. In this draft, maintenance or an outage does not by itself create a right to damages.",
        ),
        section(
          "contact",
          "Contact",
          "Questions about the software or these terms: {mail}.",
        ),
      ],
    },
  },
  {
    id: "partner",
    slug: {
      nl: "partnervoorwaarden",
      fr: "conditions-partenaires",
      en: "partner-terms",
    },
    nav: {
      nl: "Partnervoorwaarden",
      fr: "Conditions partenaires",
      en: "Partner terms",
    },
    title: {
      nl: "Partnervoorwaarden van Gleami",
      fr: "Conditions partenaires de Gleami",
      en: "Gleami partner terms",
    },
    summary: {
      nl: "Wat het betekent om je salon op de Gleami-marketplace te tonen en boekingen via het platform te ontvangen.",
      fr: "Ce que signifie présenter votre salon sur la marketplace Gleami et recevoir des réservations via la plateforme.",
      en: "What it means to list your salon on the Gleami marketplace and receive bookings through the platform.",
    },
    sections: {
      nl: [
        section(
          "listing",
          "Je salon op Gleami",
          "Als partner verschijnt je salon op de marketplace met de naam, de locatie, de behandelingen en de prijzen die je zelf bijhoudt. Je zorgt dat die informatie klopt en actueel blijft.",
          "Dit is een werkversie. Een commissie, een zichtbaarheidspakket of een andere commerciële afspraak staat hier niet in en wordt alleen van kracht als we die apart overeenkomen.",
        ),
        section(
          "bookings",
          "Boekingen",
          "Een klant boekt een moment dat jij beschikbaar zet. Jij voert de afspraak uit volgens je eigen aanbod. Gleami bezorgt de boeking, maar is geen partij bij de behandeling.",
          "Annuleren, verplaatsen of een voorwaarde voor een no-show communiceer je duidelijk op je salonpagina of rechtstreeks met de klant.",
        ),
        section(
          "content",
          "Inhoud",
          "Foto's en teksten die je op je pagina plaatst, moeten van jou zijn of met toestemming gebruikt worden. We mogen een vermelding verbergen als ze misleidend of onrechtmatig is.",
        ),
        section(
          "ending",
          "Stopzetten",
          "Je kan je salon van de marketplace halen door ons dat te vragen via {mail}. We kunnen een vermelding ook pauzeren als de informatie structureel niet klopt of als het account wordt misbruikt. De {service} blijven gelden voor het gebruik van de software.",
        ),
      ],
      fr: [
        section(
          "listing",
          "Votre salon sur Gleami",
          "En tant que partenaire, votre salon apparaît sur la marketplace avec le nom, l'adresse, les prestations et les prix que vous tenez à jour. Vous veillez à ce que ces informations soient exactes.",
          "Ceci est une version de travail. Une commission, une offre de visibilité ou un autre accord commercial n'y figure pas et ne s'applique que si nous le convenons à part.",
        ),
        section(
          "bookings",
          "Réservations",
          "Un client réserve un moment que vous rendez disponible. Vous réalisez le rendez-vous selon votre propre offre. Gleami transmet la réservation, mais n'est pas partie à la prestation.",
          "Vous communiquez clairement une annulation, un report ou une règle d'absence sur votre page salon ou directement avec le client.",
        ),
        section(
          "content",
          "Contenu",
          "Les photos et les textes que vous publiez doivent vous appartenir ou être utilisés avec l'autorisation nécessaire. Nous pouvons masquer une fiche si elle est trompeuse ou illicite.",
        ),
        section(
          "ending",
          "Fin de la présence",
          "Vous pouvez retirer votre salon de la marketplace en nous l'écrivant via {mail}. Nous pouvons aussi suspendre une fiche si les informations sont durablement inexactes ou si le compte est utilisé de façon abusive. Les {service} restent applicables à l'usage du logiciel.",
        ),
      ],
      en: [
        section(
          "listing",
          "Your salon on Gleami",
          "As a partner, your salon appears on the marketplace with the name, location, treatments and prices you keep up to date. You make sure that information is accurate.",
          "This is a working draft. A commission, a visibility package or any other commercial arrangement is not included here and applies only if we agree it separately.",
        ),
        section(
          "bookings",
          "Bookings",
          "A client books a time you have made available. You carry out the appointment according to your own offer. Gleami delivers the booking, and is not a party to the treatment.",
          "You set out cancellation, rescheduling or a no-show rule clearly on your salon page or directly with the client.",
        ),
        section(
          "content",
          "Content",
          "Photos and text you place on your page must be yours or used with permission. We may hide a listing that is misleading or unlawful.",
        ),
        section(
          "ending",
          "Ending the listing",
          "You can take your salon off the marketplace by writing to us at {mail}. We may also pause a listing if the information is persistently wrong or the account is misused. The {service} still apply to use of the software.",
        ),
      ],
    },
  },
  {
    id: "data",
    slug: {
      nl: "gegevensbescherming",
      fr: "protection-des-donnees",
      en: "data-protection",
    },
    nav: {
      nl: "Gegevensbescherming",
      fr: "Protection des données",
      en: "Data protection",
    },
    title: {
      nl: "Gegevensbescherming",
      fr: "Protection des données",
      en: "Data protection",
    },
    summary: {
      nl: "Hoe we omgaan met persoonsgegevens van klanten wanneer een salon Gleami gebruikt, en wie waarvoor verantwoordelijk is.",
      fr: "Comment nous traitons les données personnelles des clients lorsqu'un salon utilise Gleami, et qui est responsable de quoi.",
      en: "How we look after client personal data when a salon uses Gleami, and who is responsible for what.",
    },
    sections: {
      nl: [
        section(
          "roles",
          "Rollen",
          "Voor de marketplace en je Gleami-account is Gleami verwerkingsverantwoordelijke. Dat staat in het {privacy}.",
          "Voor klantgegevens die een salon in de software bijhoudt, is het salon verwerkingsverantwoordelijke. Gleami is dan verwerker: we verwerken die gegevens alleen om de agenda, boekingen en het klantdossier voor dat salon te leveren.",
          "Dit is een werkversie van die afspraak, nog geen ondertekende verwerkersovereenkomst.",
        ),
        section(
          "instructions",
          "Instructies",
          "We volgen de instructies van het salon, zoals die blijken uit het gebruik van het product: een afspraak bewaren, een klantfiche tonen aan het team van dat salon, of een boeking bevestigen. We gebruiken die klantgegevens niet voor een eigen marketplace-profiel zonder aparte grondslag.",
        ),
        section(
          "security",
          "Beveiliging",
          "Toegang tot een salon is beperkt tot mensen die het salon zelf uitnodigt. We nemen passende technische en organisatorische maatregelen, waaronder toegangsbeperking en versleutelde verbindingen. Geen maatregel maakt een dienst volledig vrij van risico.",
        ),
        section(
          "requests",
          "Verzoeken van klanten",
          "Een verzoek over een klantdossier bij een salon gaat naar dat salon. Krijgen wij zo'n verzoek, dan geven we het door. Een verzoek over een marketplace-account behandelen wij zelf via {mail}.",
        ),
      ],
      fr: [
        section(
          "roles",
          "Rôles",
          "Pour la marketplace et votre compte Gleami, Gleami est responsable du traitement. C'est décrit dans la {privacy}.",
          "Pour les données clients qu'un salon tient dans le logiciel, le salon est responsable du traitement. Gleami est alors sous-traitant : nous traitons ces données uniquement pour fournir l'agenda, les réservations et le dossier client de ce salon.",
          "Ceci est une version de travail de cet accord, pas encore un contrat de sous-traitance signé.",
        ),
        section(
          "instructions",
          "Instructions",
          "Nous suivons les instructions du salon, telles qu'elles ressortent de l'usage du produit : enregistrer un rendez-vous, montrer une fiche à l'équipe de ce salon, ou confirmer une réservation. Nous n'utilisons pas ces données clients pour un profil marketplace propre sans base distincte.",
        ),
        section(
          "security",
          "Sécurité",
          "L'accès à un salon est limité aux personnes que le salon invite lui-même. Nous prenons des mesures techniques et organisationnelles appropriées, dont la limitation des accès et des connexions chiffrées. Aucune mesure ne rend un service totalement exempt de risque.",
        ),
        section(
          "requests",
          "Demandes des clients",
          "Une demande sur le dossier client d'un salon s'adresse à ce salon. Si nous la recevons, nous la transmettons. Une demande sur un compte marketplace est traitée par nous via {mail}.",
        ),
      ],
      en: [
        section(
          "roles",
          "Roles",
          "For the marketplace and your Gleami account, Gleami is the controller. That is described in the {privacy}.",
          "For client data a salon keeps in the software, the salon is the controller. Gleami is then the processor: we process that data only to provide the calendar, bookings and client record for that salon.",
          "This is a working draft of that arrangement, not yet a signed data-processing agreement.",
        ),
        section(
          "instructions",
          "Instructions",
          "We follow the salon's instructions as they show up in how the product is used: storing an appointment, showing a client record to that salon's team, or confirming a booking. We do not use that client data for our own marketplace profile without a separate basis.",
        ),
        section(
          "security",
          "Security",
          "Access to a salon is limited to people the salon invites. We take appropriate technical and organisational measures, including access limits and encrypted connections. No measure makes a service free of risk.",
        ),
        section(
          "requests",
          "Client requests",
          "A request about a salon's client record goes to that salon. If we receive one, we pass it on. A request about a marketplace account is handled by us at {mail}.",
        ),
      ],
    },
  },
  {
    id: "cookies",
    slug: { nl: "cookies", fr: "cookies", en: "cookies" },
    nav: { nl: "Cookies", fr: "Cookies", en: "Cookies" },
    title: {
      nl: "Cookiebeleid",
      fr: "Politique cookies",
      en: "Cookie policy",
    },
    summary: {
      nl: "Welke cookies we gebruiken om Gleami te laten werken, je taalvoorkeur te onthouden en het gebruik van de site te begrijpen.",
      fr: "Quels cookies nous utilisons pour faire fonctionner Gleami, mémoriser votre langue et comprendre l'usage du site.",
      en: "Which cookies we use to run Gleami, remember your language and understand how the site is used.",
    },
    sections: {
      nl: [
        section(
          "what",
          "Wat cookies zijn",
          "Cookies zijn kleine bestanden of vergelijkbare technieken die een site op je apparaat bewaart. Ze laten een pagina werken, onthouden een keuze, of meten bezoek. Dit is een werkversie: de lijst hieronder beschrijft de categorieën, niet elk afzonderlijk cookie.",
        ),
        section(
          "necessary",
          "Noodzakelijk",
          "Sommige cookies zijn nodig om in te loggen, een boeking te starten of de site te beveiligen. Zonder die cookies werkt het onderdeel niet. Daar vragen we geen toestemming voor.",
        ),
        section(
          "preferences",
          "Voorkeuren en meting",
          "Een taalvoorkeur kunnen we bewaren zodat je niet bij elk bezoek opnieuw kiest. Cookies die bezoek meten of Gleami helpen verbeteren, plaatsen we alleen als je daar toestemming voor geeft. Je kan die keuze later aanpassen.",
        ),
        section(
          "manage",
          "Zelf beheren",
          "Je kan cookies in je browser verwijderen of blokkeren. Als je noodzakelijke cookies blokkeert, kunnen inloggen en boeken stoppen met werken. Vragen stuur je naar {mail}. Hoe we persoonsgegevens verder verwerken, staat in het {privacy}.",
        ),
      ],
      fr: [
        section(
          "what",
          "Ce que sont les cookies",
          "Les cookies sont de petits fichiers, ou des techniques comparables, qu'un site enregistre sur votre appareil. Ils font fonctionner une page, retiennent un choix ou mesurent la visite. Ceci est une version de travail : la liste ci-dessous décrit les catégories, pas chaque cookie.",
        ),
        section(
          "necessary",
          "Nécessaires",
          "Certains cookies sont nécessaires pour vous connecter, commencer une réservation ou sécuriser le site. Sans eux, la fonction ne marche pas. Nous ne demandons pas de consentement pour ceux-là.",
        ),
        section(
          "preferences",
          "Préférences et mesure",
          "Nous pouvons retenir une langue pour que vous ne choisissiez pas à chaque visite. Les cookies qui mesurent la visite ou aident à améliorer Gleami ne sont déposés que si vous y consentez. Vous pouvez modifier ce choix plus tard.",
        ),
        section(
          "manage",
          "Les gérer vous-même",
          "Vous pouvez supprimer ou bloquer les cookies dans votre navigateur. Si vous bloquez les cookies nécessaires, la connexion et la réservation peuvent cesser de fonctionner. Les questions vont à {mail}. La suite du traitement des données personnelles est dans la {privacy}.",
        ),
      ],
      en: [
        section(
          "what",
          "What cookies are",
          "Cookies are small files, or similar techniques, that a site stores on your device. They make a page work, remember a choice, or measure a visit. This is a working draft: the list below describes categories, not every individual cookie.",
        ),
        section(
          "necessary",
          "Necessary",
          "Some cookies are required to sign in, start a booking or keep the site secure. Without them, that part does not work. We do not ask for consent for those.",
        ),
        section(
          "preferences",
          "Preferences and measurement",
          "We may store a language choice so you do not pick it on every visit. Cookies that measure visits or help improve Gleami are set only if you consent. You can change that choice later.",
        ),
        section(
          "manage",
          "Manage them yourself",
          "You can delete or block cookies in your browser. If you block necessary cookies, sign-in and booking may stop working. Questions go to {mail}. How we otherwise handle personal data is in the {privacy}.",
        ),
      ],
    },
  },
];

const byId = new Map(documents.map((document) => [document.id, document]));

export function getDocument(id: DocId): LegalDocument {
  const document = byId.get(id);
  if (!document) throw new Error(`Unknown document ${id}`);
  return document;
}

export function documentBySlug(locale: Locale, slug: string): LegalDocument | undefined {
  const language = languageOf(locale);
  return documents.find((document) => document.slug[language] === slug);
}

export function documentPath(locale: Locale, id: DocId): string {
  const document = getDocument(id);
  return `/${locale}/${document.slug[languageOf(locale)]}`;
}

export function overviewPath(locale: Locale): string {
  return `/${locale}`;
}
