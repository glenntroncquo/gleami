/** Public Gleami legal documents. Slugs match `apps/terms-web` `documents`. */
export const TERMS_ORIGIN = "https://terms.gleami.eu";

export const legalDocuments = [
  { id: "privacy", href: `${TERMS_ORIGIN}/privacy-policy` },
  { id: "service", href: `${TERMS_ORIGIN}/terms-of-service` },
  { id: "terms", href: `${TERMS_ORIGIN}/terms-of-use` },
] as const;

export type LegalDocumentId = (typeof legalDocuments)[number]["id"];
