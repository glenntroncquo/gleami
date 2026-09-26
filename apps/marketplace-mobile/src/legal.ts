import type Ionicons from '@expo/vector-icons/Ionicons';

/** Placeholder documents: the pages exist so the flow is complete, the texts are still being written. */
export const LEGAL_DOCS = [
  { slug: 'terms', labelKey: 'legal.terms', icon: 'document-text-outline' },
  { slug: 'privacy', labelKey: 'legal.privacy', icon: 'lock-closed-outline' },
  { slug: 'company', labelKey: 'legal.company', icon: 'business-outline' },
] as const satisfies readonly {
  slug: string;
  labelKey: string;
  icon: keyof typeof Ionicons.glyphMap;
}[];

export type LegalSlug = (typeof LEGAL_DOCS)[number]['slug'];
