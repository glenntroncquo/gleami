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
  slug: string;
  nav: string;
  title: string;
  summary: string;
  sections: Section[];
};

function section(id: string, title: string, ...body: Block[]): Section {
  return { id, title, body };
}

/**
 * Original Gleami drafts. They describe the product as it exists and are not
 * a counsel-reviewed contract.
 */
export const documents: LegalDocument[] = [
  {
    id: "terms",
    slug: "terms-of-use",
    nav: "Terms of use",
    title: "Gleami terms of use",
    summary:
      "Please read the Terms of Use before you use the website or apps, and before you book an appointment with a salon.",
    sections: [
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
  {
    id: "privacy",
    slug: "privacy-policy",
    nav: "Privacy policy",
    title: "Gleami privacy policy",
    summary:
      "Read how we collect, store and use information when you visit Gleami, create an account or book an appointment.",
    sections: [
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
      section("cookies", "Cookies", "How we use cookies is described in {cookies}."),
    ],
  },
  {
    id: "service",
    slug: "terms-of-service",
    nav: "Terms of service",
    title: "Gleami terms of service",
    summary:
      "A summary of the terms for salons that use Gleami to run their calendar, clients and online bookings.",
    sections: [
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
      section("contact", "Contact", "Questions about the software or these terms: {mail}."),
    ],
  },
  {
    id: "partner",
    slug: "partner-terms",
    nav: "Partner terms",
    title: "Gleami partner terms",
    summary:
      "What it means to list your salon on the Gleami marketplace and receive bookings through the platform.",
    sections: [
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
  {
    id: "data",
    slug: "data-protection",
    nav: "Data protection",
    title: "Data protection",
    summary:
      "How we look after client personal data when a salon uses Gleami, and who is responsible for what.",
    sections: [
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
  {
    id: "cookies",
    slug: "cookies",
    nav: "Cookies",
    title: "Cookie policy",
    summary:
      "Which cookies we use to run Gleami, remember your language and understand how the site is used.",
    sections: [
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
];

const byId = new Map(documents.map((document) => [document.id, document]));

export function getDocument(id: DocId): LegalDocument {
  const document = byId.get(id);
  if (!document) throw new Error(`Unknown document ${id}`);
  return document;
}

export function documentBySlug(slug: string): LegalDocument | undefined {
  return documents.find((document) => document.slug === slug);
}

export function documentPath(id: DocId): string {
  return `/${getDocument(id).slug}`;
}

export const overviewPath = "/overview";
