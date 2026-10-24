"use client";

import Link from "next/link";
import { documentPath, getDocument, overviewPath, type DocId } from "@/content/documents";
import { Logo } from "@/components/Logo";
import { getCopy } from "@/lib/copy";
import {
  languageOf,
  launchLocales,
  localeConfig,
  marketplacePath,
} from "@/lib/i18n";
import { useLegalRoute } from "@/lib/route";

function localeHref(locale: Parameters<typeof overviewPath>[0], active: DocId | "overview"): string {
  if (active === "overview") return overviewPath(locale);
  return documentPath(locale, active);
}

export function Footer() {
  const { locale, active } = useLegalRoute();
  const language = languageOf(locale);
  const copy = getCopy(language);
  const paths = localeConfig[locale].paths;
  const legalLinks: DocId[] = ["privacy", "terms", "service", "partner", "cookies"];

  return (
    <footer className="border-t border-line bg-canvas">
      <div className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-20">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <a href={marketplacePath(locale)} aria-label={copy.homeLabel}>
              <Logo />
            </a>
            <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-muted">
              {copy.footer.description}
            </p>
            <div className="mt-6 flex items-center gap-2 text-[13px] text-muted">
              <GlobeIcon />
              {localeConfig[locale].label} · {localeConfig[locale].regionLabel}
            </div>
          </div>
          <nav
            aria-label="Footer"
            className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-7"
          >
            <div>
              <p className="text-[14px] font-semibold">{copy.footer.marketplace}</p>
              <ul className="mt-4 space-y-2.5">
                <li>
                  <a
                    href={marketplacePath(locale, paths.salons)}
                    className="text-[14px] text-muted hover:text-ink"
                  >
                    {copy.footer.salons}
                  </a>
                </li>
                <li>
                  <a
                    href={marketplacePath(locale, paths.treatments)}
                    className="text-[14px] text-muted hover:text-ink"
                  >
                    {copy.footer.treatments}
                  </a>
                </li>
                <li>
                  <a
                    href={marketplacePath(locale, `${paths.salons}/merelbeke`)}
                    className="text-[14px] text-muted hover:text-ink"
                  >
                    {copy.footer.city}
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-[14px] font-semibold">{copy.footer.company}</p>
              <ul className="mt-4 space-y-2.5">
                <li>
                  <a
                    href={marketplacePath(locale, paths.blog)}
                    className="text-[14px] text-muted hover:text-ink"
                  >
                    {copy.footer.blog}
                  </a>
                </li>
                <li>
                  <a
                    href={marketplacePath(locale, paths.business)}
                    className="text-[14px] text-muted hover:text-ink"
                  >
                    {copy.forBusiness}
                  </a>
                </li>
                <li>
                  <a
                    href={`${marketplacePath(locale, paths.business)}#product`}
                    className="text-[14px] text-muted hover:text-ink"
                  >
                    {copy.footer.product}
                  </a>
                </li>
                <li>
                  <a
                    href={`${marketplacePath(locale, paths.business)}#faq`}
                    className="text-[14px] text-muted hover:text-ink"
                  >
                    {copy.footer.faq}
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-[14px] font-semibold">{copy.footer.legal}</p>
              <ul className="mt-4 space-y-2.5">
                {legalLinks.map((id) => (
                  <li key={id}>
                    <Link
                      href={documentPath(locale, id)}
                      className="text-[14px] text-muted hover:text-ink"
                    >
                      {documentsLabel(language, id)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        </div>
        <div className="mt-16 flex flex-col gap-3 border-t border-line pt-8 text-[13px] text-muted md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} Gleami. {copy.footer.rights}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {launchLocales.map((item) => (
              <Link
                key={item}
                href={localeHref(item, active)}
                hrefLang={localeConfig[item].hreflang}
                className="hover:text-ink"
              >
                {localeConfig[item].hreflang}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

const footerLegalLabel: Record<DocId, Record<ReturnType<typeof languageOf>, string>> = {
  privacy: { nl: "Privacy", fr: "Confidentialité", en: "Privacy" },
  terms: { nl: "Voorwaarden", fr: "Conditions", en: "Terms" },
  service: { nl: "Servicevoorwaarden", fr: "Conditions de service", en: "Terms of service" },
  partner: { nl: "Partnervoorwaarden", fr: "Conditions partenaires", en: "Partner terms" },
  data: { nl: "Gegevensbescherming", fr: "Protection des données", en: "Data protection" },
  cookies: { nl: "Cookies", fr: "Cookies", en: "Cookies" },
};

function documentsLabel(language: ReturnType<typeof languageOf>, id: DocId): string {
  return footerLegalLabel[id][language] ?? getDocument(id).nav[language];
}

function GlobeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.8 3.8 5.8 3.8 9s-1.3 6.2-3.8 9c-2.5-2.8-3.8-5.8-3.8-9s1.3-6.2 3.8-9z" />
    </svg>
  );
}
