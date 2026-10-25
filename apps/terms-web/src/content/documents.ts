export const docIds = ["privacy", "terms", "service", "data", "cookies"] as const;

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

const who =
  "Gleami, enterprise number BE1021.422.173, Hundelgemsesteenweg 73, Merelbeke. Contact: {mail}. Website: https://gleami.eu.";

/**
 * Public text of the Gleami legal pack (version 1.0). Company details that
 * were still placeholders in the source are filled in here. Internal publishing
 * notes are not part of these pages.
 */
export const documents: LegalDocument[] = [
  {
    id: "privacy",
    slug: "privacy-policy",
    nav: "Privacy policy",
    title: "Gleami privacy policy",
    summary:
      "How Gleami handles personal data when you visit the marketplace, use the apps, or book an appointment.",
    sections: [
      section(
        "who",
        "Who we are",
        "This Privacy Policy explains how Gleami handles personal data when consumers visit or use the Gleami marketplace, websites, booking pages and related features.",
        who,
        "Where a salon uses Gleami to manage its own customers and appointments, that salon will generally act as controller for the personal data it enters or collects for its services. Gleami generally acts as processor for those salon-directed activities. Gleami may act as an independent controller for its own account administration, platform security, billing, legal compliance and marketplace operation. The precise roles depend on the activity.",
      ),
      section(
        "data",
        "Personal data we may collect",
        "Depending on how you use Gleami, we may process:",
        [
          "Account and contact details: first name, last name, email address, phone number, login identifiers and account preferences.",
          "Booking details: salon, service, appointment date and time, booking status, cancellation history and communications related to the appointment.",
          "Profile details you choose to provide: profile photo, gender or other optional profile information.",
          "Marketplace activity: searches, viewed salon or service pages, favourites, likes, reviews and interactions with marketplace features.",
          "Device and technical data: IP address, browser or device information, logs, security events and diagnostic information.",
          "Approximate or current location: only where you choose to use a location-based feature such as “near me”. We do not intend to maintain a history of your precise GPS movements.",
          "Payment-related information: payment status, transaction identifiers and limited payment metadata from payment providers. Gleami does not intend to store full payment-card numbers.",
          "Support communications and information you send us.",
        ],
        "Please do not submit health data or other sensitive personal data in booking notes or salon notes. Salons should use notes only for ordinary service preferences, such as a hair-colour formula, and should avoid information about health conditions or other special-category data.",
      ),
      section(
        "why",
        "Why we use data and our legal bases",
        "We use personal data to:",
        [
          "create and maintain accounts and authenticate users;",
          "enable bookings, appointment updates, cancellations and account history;",
          "show salons, services, availability, reviews and relevant search results;",
          "provide favourites, ratings and other marketplace features;",
          "communicate service notices and booking confirmations;",
          "prevent fraud, protect accounts, debug and secure the platform;",
          "answer support requests and enforce our terms;",
          "meet accounting, tax and other legal obligations; and",
          "measure product performance and improve the service where permitted.",
        ],
        "Depending on the purpose, our legal basis may be performance of a contract, steps taken at your request before entering a contract, compliance with a legal obligation, legitimate interests balanced against your rights, or consent. Where consent is required for analytics, advertising or similar technologies, we will seek it before activating them. You may withdraw consent at any time without affecting processing carried out before withdrawal.",
      ),
      section(
        "bookings",
        "Bookings and salons",
        "When you book through Gleami, relevant booking details are shared with the salon you choose so it can manage and provide the service. The salon is responsible for its own service, appointment policies, customer records and any separate privacy information it must provide. The contract for the beauty or salon service is between you and the salon, not Gleami.",
        "If you book as a guest and later create a verified account, Gleami may associate eligible past bookings with that account where we can reasonably verify that they belong to you. We may ask you to verify your email address or phone number before linking records.",
      ),
      section(
        "payments",
        "Payments",
        "Where payments or deposits are enabled, payment processing may be provided by a third-party payment provider such as Stripe. The provider may collect payment-card or bank details directly. Gleami may receive transaction identifiers, payment status, amounts and other limited information needed to manage the booking or resolve a payment issue. Review the payment provider’s privacy information for its own processing.",
      ),
      section(
        "reviews",
        "Reviews, favourites and marketplace ranking",
        "You may be able to favourite salons, leave reviews or interact with marketplace listings. Reviews and other content may be visible to other users according to the feature’s design and settings. Do not include sensitive personal information in public reviews.",
        "Search and ranking may consider factors such as search relevance, category and service match, distance when location is used, available appointment slots, ratings and reviews, and popularity or engagement signals. Gleami does not currently sell paid ranking placement.",
      ),
      section(
        "communications",
        "Communications",
        "We may send transactional messages needed to provide the service, such as booking confirmations, changes, reminders, security messages and responses to support requests. These are not the same as optional promotional marketing. We will send marketing communications only where we have a valid legal basis and any required consent. You can use the unsubscribe mechanism in marketing emails or contact us to exercise your rights. Salon messages about its own services may be sent by the salon under its own responsibilities.",
      ),
      section(
        "cookies",
        "Cookies and similar technologies",
        "Our websites and apps may use cookies, local storage, SDKs, pixels or similar technologies. Strictly necessary technologies may be used to provide requested functionality, maintain security and keep you signed in. Non-essential analytics or similar technologies will be activated only in accordance with applicable consent requirements. See the {cookies} for details, including how to manage your choices.",
      ),
      section(
        "recipients",
        "Service providers and recipients",
        "We may share data with service providers that help operate Gleami, such as hosting and database providers, email delivery providers, diagnostics and error-monitoring providers, mapping providers, payment providers, push-notification services and analytics providers. Providers may include Supabase, Vercel, Resend, Sentry, Mapbox, Stripe, Expo push notifications, Apple Push Notification service, Firebase Cloud Messaging and PostHog, where that provider is actually used for the feature.",
        "We may also disclose information where required by law, to protect rights or security, in connection with a business transfer, or at your direction. We do not sell personal data to advertisers.",
      ),
      section(
        "transfers",
        "International transfers",
        "Some providers may process data outside the European Economic Area. Where personal data is transferred internationally, we use a valid transfer mechanism where required, such as an adequacy decision or appropriate safeguards, and we provide information about those safeguards on request.",
      ),
      section(
        "retention",
        "Retention",
        "We retain personal data only for as long as reasonably necessary for the purposes described in this Policy, including service delivery, account administration, dispute resolution, security and legal obligations. Retention periods depend on the type of data and purpose. Booking and salon records may be retained by the salon under its own retention policy. Accounting and invoice records may need to be retained for legally required periods.",
        "When an account is deleted, we delete or anonymise data that is no longer needed, subject to legal obligations, security needs, dispute handling and legitimate retention requirements. Reviews may remain in anonymised form where appropriate.",
      ),
      section(
        "rights",
        "Your rights",
        "Subject to applicable law, you may have the right to access your personal data, correct it, erase it, restrict processing, object to processing, receive data portability, and withdraw consent where processing is based on consent. You may also lodge a complaint with the Belgian Data Protection Authority or the supervisory authority competent for your circumstances.",
        "To exercise rights relating to Gleami’s own processing, contact {mail}. For data held by a salon in its capacity as controller, contact that salon directly. We will assist the salon where required by our processor obligations.",
      ),
      section(
        "children",
        "Children and age limits",
        "Gleami consumer accounts are intended for people aged 16 or older. A parent or legal guardian may make a booking for a younger person where the salon permits it and applicable law allows it. We do not knowingly design the platform to collect account data directly from children under the applicable minimum age. If you believe a child has created an account contrary to these rules, contact us.",
      ),
      section(
        "security",
        "Security",
        "We use appropriate technical and organisational measures intended to protect personal data against unauthorised access, loss, misuse or alteration. No system can be guaranteed completely secure. Access is restricted to those who need it, and logs and diagnostics are configured to avoid unnecessary personal data.",
      ),
      section(
        "changes",
        "Changes and contact",
        "We may update this Policy when the service, law or processing practices change. We will update the version and date and provide notice where required.",
        "Version 1.0. Last updated 24 October 2026. Privacy contact: {mail}. Postal address: Hundelgemsesteenweg 73, Merelbeke.",
      ),
    ],
  },
  {
    id: "terms",
    slug: "terms-of-use",
    nav: "Terms of use",
    title: "Gleami consumer terms",
    summary:
      "The terms for using the Gleami marketplace and booking pages, and for making an appointment with a salon.",
    sections: [
      section(
        "who",
        "Who we are and these terms",
        "These Terms govern your use of the Gleami marketplace, website, booking pages and related consumer features (the “Platform”).",
        who,
        "By using the Platform, you agree to these Terms. If you do not agree, do not use the relevant features. Mandatory consumer rights remain unaffected.",
      ),
      section(
        "what",
        "What Gleami does",
        "Gleami helps consumers discover salons and beauty professionals, view services and availability, and make or manage appointments. Unless expressly stated otherwise, Gleami is the technology and marketplace provider. The salon or professional, not Gleami, provides the actual hair, barber, nail or beauty service and is responsible for its quality, safety, pricing, qualifications, premises and performance.",
      ),
      section(
        "booking",
        "Booking contract",
        "When you book a service, the service contract is between you and the salon. The salon’s displayed service details, price, duration, availability, cancellation policy and any deposit or payment conditions apply to that booking, subject to mandatory law. Review these details before confirming. Gleami does not guarantee that a salon will accept, perform or continue to offer a service.",
        "A booking is confirmed when the Platform displays or sends a confirmation, subject to any clearly disclosed salon approval process. If a booking cannot be honoured, contact the salon. Gleami may help route a support request but does not replace the salon’s obligations.",
      ),
      section(
        "accounts",
        "Accounts and guest bookings",
        "Some bookings may be made as a guest. Other features may require an account. You must provide accurate information and keep your login credentials secure. You are responsible for activity carried out through your account unless caused by our failure to meet a legal obligation. Notify us promptly if you suspect unauthorised access.",
        "If you create an account after making guest bookings, we may link eligible past bookings after verifying that they belong to you. Do not create an account using another person’s details or access another person’s booking history.",
      ),
      section(
        "age",
        "Age and use on behalf of another person",
        "Consumer accounts are intended for users aged 16 or older. A parent or legal guardian may make a booking for a younger person where the salon permits it and applicable law allows it. If you book for someone else, you confirm that you are authorised to provide the information needed for the booking and to communicate the relevant booking terms to that person.",
      ),
      section(
        "prices",
        "Prices and payments",
        "Prices are set by the salon and displayed before booking where supported. The salon may require payment at the salon, a deposit or online payment. The Platform will explain any enabled payment step before you confirm.",
        "Where payment processing is enabled, a third-party provider such as Stripe may process payment information. Gleami does not intend to store full payment-card details. The salon remains responsible for its service price, refunds and applicable tax obligations, except for obligations expressly assigned to Gleami by law or a displayed payment arrangement.",
      ),
      section(
        "cancellations",
        "Cancellations, lateness and refunds",
        "The salon’s cancellation, rescheduling, no-show, lateness and deposit policy will be shown or made available before booking where the feature supports it. Follow the instructions in your confirmation or contact the salon directly. Refund eligibility depends on the salon’s terms, the payment arrangement and mandatory consumer law.",
        "Nothing in these Terms excludes or limits rights that cannot legally be excluded, including applicable rights concerning distance contracts, services, unfair terms or remedies for non-performance. Whether a statutory withdrawal right applies to a particular appointment or leisure service depends on the circumstances and applicable law.",
      ),
      section(
        "listings",
        "Salon listings and availability",
        "Salons are responsible for keeping their profiles, service descriptions, prices, opening hours, availability, staff information and policies accurate. Information may change and appointment slots can become unavailable. Gleami may correct, hide or remove inaccurate, unlawful, misleading or policy-violating content.",
      ),
      section(
        "ranking",
        "Search and ranking",
        "Search results and listings may be ordered using relevance to your query, service or category match, distance where location is used, available appointment slots, ratings and reviews, and popularity or engagement signals. Gleami does not currently sell paid ranking placement. We may change ranking systems to improve relevance, safety or the user experience. Any material change to sponsored placement practices will be reflected in the relevant disclosures.",
      ),
      section(
        "reviews",
        "Reviews, favourites and user content",
        "You may be able to post reviews, save favourites or submit other content. You must be honest, lawful and respectful. You must not post personal data about others without a lawful basis, confidential information, threats, discriminatory content, spam, or content you do not have the right to use.",
        "You retain ownership of content you submit. You grant Gleami a non-exclusive, worldwide, royalty-free licence to host, reproduce, display and technically adapt that content to operate, moderate and promote the Platform, for as long as needed for those purposes, subject to applicable law and your rights. You can report content you believe is unlawful or abusive. We may remove content or restrict accounts where reasonably necessary.",
      ),
      section(
        "use",
        "Acceptable use",
        "You must not use the Platform unlawfully, interfere with security or availability, scrape or harvest data without permission, impersonate another person, bypass access controls, upload malware, misuse reviews or booking features, or use the Platform to send unsolicited messages. You must not use booking notes to submit health data or other sensitive personal data. We may investigate suspected misuse and take proportionate action.",
      ),
      section(
        "privacy",
        "Privacy and cookies",
        "Our {privacy} explains how Gleami processes personal data. The {cookies} explains cookies and similar technologies and how to manage choices. Salons may act as independent controllers for information they collect to provide services. Review the salon’s own privacy information where available.",
      ),
      section(
        "availability",
        "Platform availability and changes",
        "We aim to provide a reliable service but do not guarantee uninterrupted or error-free availability. We may maintain, update, suspend or discontinue features for security, technical, operational or legal reasons. We will comply with mandatory law and provide notice where required. These Terms do not remove any rights you have under applicable law.",
      ),
      section(
        "ip",
        "Intellectual property",
        "Gleami and its licensors own or license the Platform software, branding, design and related materials. You receive a limited, personal, revocable, non-transferable right to use the Platform for its intended purpose. You must not copy, reverse engineer, resell or commercially exploit Platform components except where law permits or we authorise it in writing.",
      ),
      section(
        "suspension",
        "Suspension and termination",
        "You may stop using the Platform and request account deletion through available settings or by contacting us. We may suspend or restrict access where reasonably necessary to protect users, investigate misuse, comply with law or secure the Platform. We will act proportionately and provide information or an opportunity to challenge the action where appropriate and legally required. Account deletion does not automatically cancel an appointment with a salon. Contact the salon about the booking.",
      ),
      section(
        "liability",
        "Liability",
        "Nothing in these Terms limits liability where such limitation is prohibited by law, including liability for fraud or intentional misconduct where it cannot be excluded. To the extent permitted by law, Gleami is not responsible for the salon’s actual service, its premises, staff, qualifications, pricing or failure to perform a service. Gleami remains responsible for its own obligations under applicable law and these Terms.",
      ),
      section(
        "complaints",
        "Complaints and disputes",
        "For a booking or service complaint, contact the salon first. For a problem with the Platform, contact {mail}. We will try to resolve complaints fairly. Consumers may also use any competent consumer-protection or dispute-resolution body available under applicable law.",
      ),
      section(
        "law",
        "Changes, governing law and contact",
        "We may update these Terms to reflect changes to the Platform or law. We will update the version and date and provide notice where required. Changes do not remove mandatory consumer rights.",
        "These Terms are governed by Belgian law, without prejudice to mandatory consumer protections that apply in your country of residence. The competent courts are determined by applicable law.",
        "Version 1.0. Last updated 24 October 2026. Contact: {mail}. Address: Hundelgemsesteenweg 73, Merelbeke.",
      ),
    ],
  },
  {
    id: "service",
    slug: "terms-of-service",
    nav: "Salon terms",
    title: "Gleami salon terms",
    summary:
      "The subscription terms for salons that use Gleami to run their calendar, clients, bookings and marketplace listing.",
    sections: [
      section(
        "parties",
        "Parties and acceptance",
        "These Salon Terms govern access to Gleami’s salon-management software, booking tools, marketplace listing and related services (the “Services”).",
        "Provider: Gleami, enterprise number BE1021.422.173, Hundelgemsesteenweg 73, Merelbeke. Contact: {mail}.",
        "The business or professional accepting these Terms (“Salon”, “you”) confirms it is authorised to enter into the agreement. If an individual accepts on behalf of a business, they confirm they have authority to bind it.",
      ),
      section(
        "scope",
        "Services and scope",
        "Gleami may provide appointment scheduling, calendar and staff management, customer records, booking links and widgets, salon profiles, marketplace discovery, notifications, reporting and other features described on the Platform. Features may vary by plan and may change over time. Any service-level commitments or specific plan inclusions are set out in the applicable order form or pricing page.",
        "Gleami provides software and marketplace functionality. It does not provide the salon’s hair, barber, nail or beauty services and is not the employer or agent of the Salon or its staff.",
      ),
      section(
        "account",
        "Account setup and security",
        "You must provide accurate business and contact information and keep it up to date. You are responsible for protecting credentials, assigning appropriate access, and for activity under your account. Notify Gleami promptly of suspected unauthorised access. You must remove or disable access for staff who no longer need it and send invitations only to the intended people.",
      ),
      section(
        "fees",
        "Subscription plans and fees",
        "The Services are provided on a paid monthly or yearly subscription basis unless a written offer states otherwise. The applicable price, currency, taxes and included features are communicated before subscription. Gleami does not charge a booking commission unless a later written agreement clearly states otherwise.",
        "Gleami currently issues invoices manually and the Salon pays by bank transfer using the payment instructions on the invoice. The Salon must pay invoices by the due date. If an invoice is disputed, notify Gleami promptly with reasons, and pay undisputed amounts when due. Any taxes applicable to the subscription will be shown or handled as required by law.",
      ),
      section(
        "term",
        "Subscription term, renewal and cancellation",
        "A monthly subscription runs for the paid monthly period and a yearly subscription runs for the paid yearly period. Unless the order form says otherwise, subscriptions renew for successive periods of the same length until cancelled.",
        "You may cancel at any time by email to {mail}. Cancellation stops renewal and the Services remain available until the end of the already-paid subscription period, subject to these Terms. Ordinary cancellation does not entitle the Salon to a pro-rata refund for unused time in the current paid period, to the extent permitted by law. This does not affect rights that cannot be excluded by law or any refund expressly agreed in writing.",
        "Gleami will confirm cancellation and the effective end date.",
      ),
      section(
        "late",
        "Late payment and suspension",
        "If payment is overdue, Gleami may send reminders and, after reasonable notice, suspend paid features or access where proportionate and legally permitted. Any statutory notice requirements, interest or recovery costs apply only where legally permitted and properly disclosed. Gleami may restore access once overdue amounts are resolved. Suspension is not used to withhold data export in violation of mandatory law or the agreed exit process.",
      ),
      section(
        "responsibilities",
        "Salon responsibilities",
        "The Salon is responsible for:",
        [
          "the accuracy and legality of its business profile, service descriptions, prices, opening hours, availability and policies;",
          "the quality, safety and lawful provision of its services, including staff qualifications and any licences required;",
          "handling bookings, customer enquiries, cancellations, refunds, no-shows and complaints about salon services;",
          "ensuring staff have appropriate access and comply with these Terms;",
          "having a lawful basis and providing required privacy information for personal data it collects;",
          "using customer notes only for relevant ordinary service preferences, and not recording health or other special-category data in free-text notes;",
          "complying with consumer, advertising, tax, employment, accessibility and other laws applicable to its business; and",
          "obtaining permissions for content, photographs, logos and staff information it uploads.",
        ],
      ),
      section(
        "customers",
        "Customer relationships and bookings",
        "The contract for the Salon’s actual service is between the Salon and the customer. The Salon is responsible for honouring accepted appointments and clearly communicating prices, service details, cancellation rules and any deposit or payment conditions. Gleami does not guarantee that a customer will attend or that a Salon will perform a service. The Salon must not use Gleami to mislead customers, discriminate unlawfully or engage in fraudulent booking practices.",
      ),
      section(
        "marketplace",
        "Marketplace listing and ranking",
        "Gleami may display the Salon’s profile, services, staff profiles, reviews, availability and other information on the marketplace. Search and ranking may consider relevance, service or category match, location, bookable slots, ratings and reviews, and popularity or engagement. No paid ranking is currently offered unless separately disclosed. Gleami may moderate, hide or remove content that is inaccurate, unlawful, misleading, unsafe or inconsistent with platform rules. The Salon must keep its listing accurate.",
      ),
      section(
        "data",
        "Data protection",
        "The parties’ data-protection roles depend on the processing activity. The Salon is generally controller for customer and appointment data it determines how to collect and use to provide its services. Gleami generally acts as processor for that data when processing it on the Salon’s documented instructions. Gleami may act as independent controller for its own account administration, subscription billing, platform security and legal compliance.",
        "The {data} forms part of the agreement for processing where Gleami acts as processor. The Salon must provide appropriate privacy notices, determine lawful bases, honour data-subject rights, minimise data and avoid collecting sensitive data unless there is a valid legal basis and the feature is designed for it. Do not enter health data or other special-category data into ordinary customer notes.",
      ),
      section(
        "content",
        "Content and intellectual property",
        "The Salon retains rights in content it uploads and grants Gleami a non-exclusive, worldwide, royalty-free licence to host, reproduce, display and technically adapt it as needed to provide, maintain and promote the Services and marketplace. The Salon confirms it has rights and permissions to provide that content. Gleami and its licensors retain rights in the software, platform, branding, design and documentation. The Salon receives a limited right to use the Services during the subscription term, subject to these Terms.",
      ),
      section(
        "use",
        "Acceptable use",
        "The Salon must not misuse the Services, interfere with security, attempt unauthorised access, upload malware, scrape data, reverse engineer the platform except where law permits, resell access without permission, upload unlawful content, or use the platform to send unlawful or unsolicited communications. Gleami may investigate suspected misuse and take proportionate action.",
      ),
      section(
        "availability",
        "Availability, support and changes",
        "Gleami will use reasonable efforts to maintain the Services but does not promise uninterrupted or error-free availability unless a separate service-level agreement says otherwise. Maintenance, third-party outages, internet issues or events beyond reasonable control may affect access. Gleami may update or modify features for operational, technical, security or legal reasons. Material changes to paid features will be communicated where required by law or the applicable order form.",
      ),
      section(
        "third-parties",
        "Third-party services",
        "The Services may integrate with third-party services such as hosting, email, payment, mapping, push notifications or analytics. Third-party services may have their own terms and privacy policies. Gleami is not responsible for a third party’s independent service, except to the extent liability cannot be excluded by law.",
      ),
      section(
        "suspension",
        "Suspension and termination by Gleami",
        "Gleami may suspend or terminate access for material breach, overdue fees after appropriate notice, security risk, unlawful use, fraud, or where required by law. Where reasonably possible, Gleami will provide notice and an opportunity to remedy the breach. Gleami may terminate the Services on reasonable notice for business or technical reasons, subject to any mandatory legal requirements and any prepaid period or refund obligations that apply.",
      ),
      section(
        "exit",
        "Data export and exit",
        "At the end of the subscription, the Salon has a reasonable opportunity to export available business and customer data using the available tools or by contacting Gleami. The exit period and any assistance fees are specified in the applicable plan or order form. After the agreed period, Gleami may delete or anonymise data, subject to the Data Processing Agreement, legal retention obligations, security needs and backups that expire through ordinary cycles. Staff access is revoked at the end of service.",
      ),
      section(
        "confidentiality",
        "Confidentiality",
        "Each party must protect non-public information received from the other and use it only for the agreement. This does not apply to information that is public without breach, already lawfully known, independently developed, or lawfully received from another source. Disclosure required by law is permitted, with notice where legally allowed.",
      ),
      section(
        "liability",
        "Warranties and liability",
        "The Services are provided with reasonable care and skill, subject to these Terms and mandatory law. Except where prohibited by law, Gleami does not warrant that the Services will meet every Salon requirement or be continuously available. Neither party excludes liability that cannot legally be excluded, including for fraud or intentional misconduct where applicable.",
        "To the extent permitted by law, neither party is liable for indirect or consequential loss that was not reasonably foreseeable. The Salon remains responsible for its services, staff, business operations, customer communications and compliance.",
      ),
      section(
        "force-majeure",
        "Force majeure",
        "Neither party is responsible for delay caused by events beyond its reasonable control, provided it takes reasonable steps to limit the impact. If such an event continues for an extended period, either party may discuss a reasonable solution or termination, subject to mandatory law and any accrued payment obligations.",
      ),
      section(
        "changes",
        "Changes to these Terms",
        "Gleami may update these Terms where reasonably needed for changes in the Services, law, security or business operations. We will update the version and date and provide notice where required. Where a change materially affects a paid subscription, the Salon may cancel future renewal before the change takes effect, without prejudice to mandatory rights.",
      ),
      section(
        "law",
        "Governing law and disputes",
        "These Terms are governed by Belgian law. The competent courts are determined by applicable law. Nothing in this section prevents either party from relying on mandatory rules that apply to it.",
      ),
      section(
        "contact",
        "Contact and final details",
        "Gleami contact: {mail}. Postal address: Hundelgemsesteenweg 73, Merelbeke. Enterprise number: BE1021.422.173. Version 1.0. Last updated 24 October 2026.",
        "These Terms, the applicable order form and the Data Processing Agreement form the agreement between the parties for the Services. If there is a conflict, the Data Processing Agreement prevails for personal-data processing, and the order form prevails for plan-specific prices and features, unless expressly stated otherwise.",
      ),
    ],
  },
  {
    id: "data",
    slug: "data-protection",
    nav: "Data processing",
    title: "Data processing agreement",
    summary:
      "The terms that apply when Gleami processes a salon’s customer and appointment data on that salon’s instructions.",
    sections: [
      section(
        "parties",
        "Parties and purpose",
        "This Data Processing Agreement (“DPA”) forms part of the {service} between the salon or professional identified in its Gleami account (the “Controller”) and Gleami, enterprise number BE1021.422.173, Hundelgemsesteenweg 73, Merelbeke (the “Processor”).",
        "This DPA applies when Processor processes personal data on behalf of Controller to provide the Gleami Services. It does not apply to processing for which Gleami acts as an independent controller, such as its own account administration, billing, platform security and legal compliance.",
      ),
      section(
        "definitions",
        "Definitions and hierarchy",
        "Terms such as “personal data”, “processing”, “controller”, “processor”, “personal data breach” and “data subject” have the meanings given in the GDPR. If this DPA conflicts with the Salon Terms regarding processor processing of personal data, this DPA prevails. The GDPR and other mandatory data-protection law prevail over inconsistent contractual terms.",
      ),
      section(
        "instructions",
        "Documented instructions",
        "Processor shall process personal data only on documented instructions from Controller, including instructions concerning transfers to a third country, unless required to do so by EU or Member State law. If a legal requirement applies, Processor shall inform Controller before processing unless the law prohibits that information. The agreement, configuration and Controller’s use of documented features constitute the initial instructions. Processor shall inform Controller if, in its opinion, an instruction infringes data-protection law and may suspend the affected instruction pending clarification where reasonably necessary.",
      ),
      section(
        "details",
        "Details of processing",
        "The subject matter, duration, nature and purpose of processing, categories of data subjects and personal data are set out in Annex 1. Controller may not instruct Processor to process special-category data through ordinary customer notes or fields not designed for it. Any additional or materially different processing must be agreed in writing and reflected in Annex 1.",
      ),
      section(
        "controller",
        "Controller obligations",
        "Controller is responsible for:",
        [
          "ensuring a lawful basis for processing and providing privacy notices;",
          "determining the purposes and essential means of its processing;",
          "ensuring data is accurate, relevant and limited to what is necessary;",
          "complying with applicable law when collecting and using customer data;",
          "responding to data-subject requests and complaints, with Processor’s assistance as required;",
          "configuring access and permissions appropriately;",
          "ensuring staff are authorised and bound by confidentiality; and",
          "providing lawful, documented instructions to Processor.",
        ],
      ),
      section(
        "processor",
        "Processor obligations",
        "Processor shall:",
        [
          "process personal data only on documented instructions, subject to the instructions section;",
          "ensure persons authorised to process data are bound by confidentiality;",
          "implement appropriate technical and organisational measures under Article 32 GDPR;",
          "comply with the subprocessor requirements below;",
          "assist Controller, taking into account the nature of processing, with data-subject requests;",
          "assist Controller with Articles 32 to 36 obligations as required, taking into account the information available to Processor;",
          "make available information reasonably necessary to demonstrate compliance and allow audits as set out below; and",
          "notify Controller if Processor becomes aware that it can no longer meet its DPA obligations.",
        ],
      ),
      section(
        "subprocessors",
        "Subprocessors",
        "Controller gives general written authorisation for Processor to engage subprocessors necessary to provide the Services, subject to this section. The current list is in Annex 2. Processor will email Controller before adding or replacing a subprocessor, giving Controller an opportunity to object on reasonable data-protection grounds. If the parties cannot resolve a reasonable objection, they will discuss a commercially reasonable alternative. Any termination right is as specified in the Salon Terms.",
        "Processor shall impose data-protection obligations on each subprocessor that are no less protective in substance than those in this DPA, to the extent applicable. Processor remains responsible for its subprocessors’ performance of their data-protection obligations as required by the GDPR.",
      ),
      section(
        "requests",
        "Data-subject requests",
        "Processor shall promptly forward to Controller any request from a data subject that relates to Controller’s processing, unless legally prohibited. Processor shall not respond substantively except on Controller’s documented instructions or where required by law. Taking into account the nature of processing, Processor shall provide reasonable technical and organisational assistance to help Controller respond within applicable statutory deadlines. Any additional assistance fees must be agreed and must not undermine statutory rights.",
      ),
      section(
        "security",
        "Security measures",
        "Processor shall implement appropriate technical and organisational measures taking into account the state of the art, implementation costs, nature, scope, context and purposes of processing, and risks to individuals. The measures are described in Annex 3. They include, as appropriate, access control, least privilege, authentication, encryption in transit, secure development, vulnerability management, logging, backups, recovery, staff confidentiality and incident response.",
      ),
      section(
        "breaches",
        "Personal data breaches",
        "Processor shall notify Controller without undue delay after becoming aware of a personal data breach affecting Controller’s personal data. The notice shall, to the extent information is available, describe the nature of the breach, affected data or individuals, likely consequences, measures taken or proposed, and a contact point. Processor may provide information in phases as it becomes available. Controller remains responsible for deciding whether and how to notify a supervisory authority or data subjects, with Processor’s assistance as required.",
      ),
      section(
        "transfers",
        "International transfers",
        "Processor shall not transfer Controller’s personal data to a country outside the European Economic Area except in accordance with documented instructions and applicable GDPR Chapter V requirements. Where required, the parties use an appropriate transfer mechanism, such as an adequacy decision or the applicable European Commission Standard Contractual Clauses, together with any necessary transfer impact assessment and supplementary measures. Annex 2 identifies the providers. Details of a provider’s location and safeguard are available on request at {mail}.",
      ),
      section(
        "audits",
        "Compliance information and audits",
        "Processor shall make available information reasonably necessary to demonstrate compliance with this DPA and Article 28 GDPR. Controller may conduct an audit, including inspection where reasonably necessary, subject to reasonable prior notice, confidentiality, security, business continuity and third-party confidentiality restrictions. The parties should first consider existing certifications, independent audit reports and other evidence. Audits must be proportionate and not unreasonably disrupt operations. Fees for exceptional audits may be agreed in advance, except where an audit is required by a regulator or triggered by a substantiated breach.",
      ),
      section(
        "deletion",
        "Return and deletion",
        "At the end of the Services, Processor shall, at Controller’s choice, delete or return personal data processed on Controller’s behalf, unless EU or Member State law requires storage. Controller should export data within the agreed exit period. Data remaining in backups may be deleted through ordinary backup cycles, provided it remains protected and is not restored for ordinary use except for disaster recovery or legal or security purposes. Any retained data remains subject to this DPA for as long as it is retained.",
      ),
      section(
        "records",
        "Records and cooperation",
        "Each party shall maintain records required of it by applicable data-protection law. Processor shall reasonably cooperate with Controller’s data-protection impact assessments and prior consultations with a supervisory authority to the extent related to Processor’s services and information available to it. The parties shall cooperate in good faith to investigate and resolve data-protection incidents or compliance questions.",
      ),
      section(
        "confidentiality",
        "Confidentiality",
        "Processor shall ensure that personnel authorised to process personal data are subject to an appropriate duty of confidentiality, whether contractual or statutory, and receive appropriate instructions concerning secure handling of personal data.",
      ),
      section(
        "liability",
        "Liability",
        "Each party’s liability is governed by the Salon Terms and applicable law, subject to any mandatory GDPR provisions and the rights of data subjects. Nothing in this DPA limits liability where such limitation is prohibited by law.",
      ),
      section(
        "term",
        "Term and changes",
        "This DPA applies for the duration of Processor’s processing of Controller’s personal data. Annexes are updated when processing, subprocessors, transfers or security measures materially change. Any change is recorded in writing or through a documented change mechanism that lets Controller keep the current version.",
      ),
      section(
        "contact",
        "Governing law and contact",
        "This DPA is governed by Belgian law, without prejudice to mandatory data-protection law. Notices under this DPA should be sent to the salon’s privacy contact on its account, and to Gleami at {mail}, Hundelgemsesteenweg 73, Merelbeke.",
        "Version 1.0. Last updated 24 October 2026.",
      ),
      section(
        "annex-1",
        "Annex 1: details of processing",
        "Subject matter: provision of Gleami salon-management, scheduling, customer record, booking and related features.",
        "Duration: for the term of the Salon’s use of the Services and any limited exit or retention period described in the Salon Terms and this DPA.",
        "Nature and purpose: hosting, storing, organising, retrieving, displaying, updating and transmitting data as needed to manage salon customers, staff, services, availability, appointments and communications.",
        "Data subjects: salon customers and prospective customers, salon staff and invited users, and business contacts.",
        "Personal data categories: names, contact details, appointment and service details, customer preferences entered by the Salon, account identifiers, staff account details, booking status, communications and technical logs. Payment identifiers and status may be processed where the feature is enabled.",
        "Special-category data is not intended to be processed. Controller must not enter health data or other special-category data into ordinary free-text notes. If a feature is later designed to process such data, the parties must assess and document the lawful basis and safeguards before use.",
        "Frequency: continuous during use of the Services. Controller instructions are the use of the configured Services, documented support instructions, and any additional written instructions accepted by Processor.",
      ),
      section(
        "annex-2",
        "Annex 2: subprocessors",
        "Subprocessors that may process personal data to provide the Services, depending on the features in use:",
        [
          "Supabase: database, authentication, storage and backend hosting.",
          "Vercel: application hosting and deployment.",
          "Resend: transactional email delivery.",
          "Sentry: error and diagnostic monitoring, where enabled.",
          "Mapbox: maps, geocoding and location-related features, where used.",
          "Stripe: payment processing, where enabled. Stripe may act as processor or as an independent controller depending on the payment activity.",
          "Expo, Apple Push Notification service and Firebase Cloud Messaging: push delivery, where enabled.",
          "PostHog: product measurement, where enabled and only in line with any required consent.",
          "Scrada: invoicing or accounting, where used.",
        ],
        "The current list is also available on request at {mail}. Processor emails Controller before adding or replacing a subprocessor. International transfers use a GDPR Chapter V mechanism where required. Provider-specific location and safeguard details are available on request.",
      ),
      section(
        "annex-3",
        "Annex 3: security measures",
        "Processor maintains measures appropriate to the Services, including:",
        [
          "Access control: role-based access, least privilege, and removal of access when it is no longer needed.",
          "Authentication: secure authentication and administrative access controls, including multi-factor authentication where supported and appropriate.",
          "Tenant separation: controls intended to prevent one Salon from accessing another Salon’s data.",
          "Encryption: HTTPS or TLS in transit, and provider encryption at rest where available.",
          "Secure development: code review, secrets management, dependency updates and deployment controls.",
          "Logging and monitoring: security and error monitoring with minimised personal data and defined retention.",
          "Backup and recovery: provider backups and recovery procedures.",
          "Incident response: triage, escalation, breach assessment and Controller notification.",
          "Data minimisation: no unnecessary sensitive data in notes, analytics or diagnostics.",
          "Deletion and export: customer and account deletion, salon exit export, and backup expiry.",
          "Personnel: confidentiality obligations and limited access.",
          "Vendor management: review of provider terms, subprocessors, transfer safeguards and security documentation.",
          "Consent and tracking: non-essential analytics and cookies stay off until consent where required, with a way to withdraw that choice.",
        ],
      ),
    ],
  },
  {
    id: "cookies",
    slug: "cookies",
    nav: "Cookie policy",
    title: "Cookie policy",
    summary:
      "How Gleami uses cookies and similar technologies on gleami.eu, related sites and booking pages, and how to manage them.",
    sections: [
      section(
        "about",
        "About this policy",
        "This Cookie Policy explains how Gleami uses cookies and similar technologies on https://gleami.eu and, where applicable, related subdomains, booking pages, widgets and web applications. It should be read with the {privacy}.",
        "Gleami, enterprise number BE1021.422.173, Hundelgemsesteenweg 73, Merelbeke. Contact: {mail}. Version 1.0. Last updated 24 October 2026.",
      ),
      section(
        "what",
        "What are cookies and similar technologies?",
        "Cookies are small text files stored by a website in your browser or device. Similar technologies can include local storage, session storage, pixels, tags, software development kits (SDKs) and other identifiers that store information or access information on your device. This Policy uses “cookies” as a convenient collective term where appropriate.",
      ),
      section(
        "categories",
        "Categories we may use",
        "Strictly necessary technologies are needed to provide a service you request, such as authentication, security, session management, load balancing or remembering a privacy choice. These may be used without consent where the legal exemption applies.",
        "Preference technologies remember choices such as language or interface preferences. Whether consent is required depends on their purpose and applicable law.",
        "Analytics and product measurement help understand how visitors use pages or features and improve the product. These are non-essential unless a specific technology qualifies for an exemption. Where consent is required, they stay off until consent is given.",
        "Diagnostics and performance help identify errors, crashes and performance issues. Their classification depends on the actual data and technology.",
        "Marketing and advertising technologies track users for advertising, retargeting or marketing measurement. Gleami does not currently use advertising cookies. If they are introduced, this Policy will be updated and consent will be obtained where required before they are activated.",
      ),
      section(
        "consent",
        "Consent and managing choices",
        "Where required by law, Gleami requests consent before placing or reading non-essential cookies or using similar technologies. The choice must be freely given, specific, informed and indicated by a clear affirmative action. Accepting and rejecting non-essential categories are both available. Continuing to browse is not consent.",
        "You can change or withdraw a choice by contacting {mail}. Withdrawal does not affect processing carried out before withdrawal.",
      ),
      section(
        "inventory",
        "What we record",
        "For each cookie, local or session storage key, pixel, tag or SDK that stores or accesses information on your device, Gleami records its name, whether it is first-party or third-party, its purpose, category, duration, the data it collects, whether consent is required, and when that record was last checked. That includes items that appear only after sign-in, after a booking widget opens, or after you use a feature.",
      ),
      section(
        "providers",
        "Technologies that may be used",
        "Depending on the feature, the following may store or access information on your device, or process related data:",
        [
          "Supabase and the authentication or session mechanisms used to sign you in.",
          "Vercel, for hosting and security functions.",
          "PostHog, if product measurement is enabled.",
          "Sentry, if diagnostics or performance monitoring is enabled.",
          "Mapbox, where map or location functionality is used.",
          "Payment and embedded booking components, where enabled.",
          "Push-notification tools, where enabled in an app.",
        ],
        "Not every provider sets a cookie. Some technologies process data on the server or use other storage. Only technologies that are actually in use are active, and only for the purpose described for that technology.",
      ),
      section(
        "browser",
        "Browser and device controls",
        "Most browsers allow you to view, delete or block cookies. Blocking strictly necessary cookies may prevent sign-in, booking or other requested features from working correctly. Browser controls do not necessarily withdraw a choice already recorded by a website, or control every SDK or local-storage mechanism. You can also contact {mail}.",
      ),
      section(
        "personal-data",
        "Personal data and further information",
        "Some cookie or device information may constitute personal data. Further information about purposes, legal bases, recipients, retention, international transfers and your rights is in the {privacy}. For questions about this Policy or your privacy choices, contact {mail}.",
      ),
      section(
        "changes",
        "Changes to this Policy",
        "We may update this Policy when our technologies or legal requirements change. We will update the version and date and keep dated versions of prior policies. Where required, we will seek renewed consent for materially changed purposes or technologies.",
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
