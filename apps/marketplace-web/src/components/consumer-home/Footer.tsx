import Link from "next/link";
import { cityNames, localeConfig, routeFor, supportedCitiesForLocale, type Locale } from "@/lib/i18n";
import { Logo } from "./Logo";
import { homeCopy, type HomeCopy } from "./messages";

type FooterProps = {
  locale: Locale;
  copy?: HomeCopy;
};

export function Footer({ locale, copy = homeCopy(locale) }: FooterProps) {
  const language = localeConfig[locale].language;
  const columns = [
    {
      title: copy.footerDiscover,
      links: [
        { label: copy.seeAll, href: routeFor(locale, { kind: "salons" }) },
        { label: copy.allTreatments, href: routeFor(locale, { kind: "treatments" }) },
      ],
    },
    {
      title: copy.footerCities,
      links: supportedCitiesForLocale(locale).map((city) => ({
        label: cityNames[city][language],
        href: routeFor(locale, { kind: "city", city }),
      })),
    },
    {
      title: copy.footerCompany,
      links: [
        { label: "Blog", href: routeFor(locale, { kind: "blog" }) },
        {
          label: copy.forBusiness,
          href: routeFor(locale, { kind: "business" }),
        },
      ],
    },
  ].filter((column) => column.links.length > 0);

  return (
    <footer className="bg-white">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 md:px-8 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-ink-muted">{copy.footerTagline}</p>
        </div>
        {columns.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <h3 className="text-sm font-semibold text-navy">{column.title}</h3>
            <ul className="mt-4 space-y-3">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-[15px] text-ink-muted transition-colors duration-150 hover:text-navy"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-6 text-sm text-ink-faint md:flex-row md:justify-between md:px-8">
          <p>{copy.footerRights}</p>
          <p>{copy.footerNote}</p>
        </div>
      </div>
    </footer>
  );
}
