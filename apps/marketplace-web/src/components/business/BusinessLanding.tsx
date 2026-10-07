import {
  BarChart3Icon,
  BellIcon,
  CalendarDaysIcon,
  CalendarCheckIcon,
  CheckIcon,
  CreditCardIcon,
  LayoutGridIcon,
  RefreshCwIcon,
  StoreIcon,
  UserRoundIcon,
  UsersIcon,
} from "lucide-react";
import { MarketplaceMapScreen } from "@/components/mockups/marketplace/MarketplaceMapScreen";
import { MarketplaceSalonScreen } from "@/components/mockups/marketplace/MarketplaceSalonScreen";
import { CalendarMockup } from "@/components/mockups/CalendarMockup";
import { JsonLd } from "@/components/seo/JsonLd";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { LogoMark } from "@/components/ui/LogoMark";
import { PhoneFrame } from "@/components/ui/PhoneFrame";
import { ScaleToFit } from "@/components/ui/ScaleToFit";
import { SectionIntro } from "@/components/ui/SectionIntro";
import { getCopy } from "@/lib/copy";
import { routeFor, type Locale } from "@/lib/i18n";
import { faqJsonLd } from "@/lib/structured-data";

type BusinessLandingProps = {
  locale: Locale;
};

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.gleami.eu";
const demoUrl = "mailto:hello@gleami.eu?subject=Gleami%20demo";
const featureIcons = [
  CalendarDaysIcon,
  CalendarCheckIcon,
  UsersIcon,
  UserRoundIcon,
  CreditCardIcon,
  BarChart3Icon,
];
const marketplaceIcons = [
  LayoutGridIcon,
  StoreIcon,
  UsersIcon,
  CalendarCheckIcon,
  RefreshCwIcon,
];

export function BusinessLanding({ locale }: BusinessLandingProps) {
  const copy = getCopy(locale);

  return (
    <>
      <JsonLd data={faqJsonLd(copy.business.faqs)} />

      <section
        aria-labelledby="business-hero-title"
        className="relative overflow-hidden pb-10 pt-14 md:pb-16 md:pt-24"
      >
        <div className="mx-auto max-w-7xl px-5 text-center md:px-8">
          <p className="mb-5 text-[14px] font-medium text-rose-600">
            {copy.business.eyebrow}
          </p>
          <h1
            id="business-hero-title"
            className="mx-auto max-w-5xl text-balance text-[44px] font-semibold leading-[1.02] tracking-tightest sm:text-[60px] md:text-[76px] lg:text-[88px]"
          >
            {copy.business.title}{" "}
            <span className="text-subtle">{copy.business.mutedTitle}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-pretty text-[18px] leading-relaxed text-muted md:text-[21px]">
            {copy.business.description}
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ButtonLink href={appUrl} size="lg" arrow className="w-full sm:w-auto">
              {copy.actions.start}
            </ButtonLink>
            <ButtonLink
              href={demoUrl}
              variant="secondary"
              size="lg"
              className="w-full sm:w-auto"
            >
              {copy.actions.demo}
            </ButtonLink>
          </div>
          <p className="mt-5 text-[14px] text-muted">
            {copy.business.reassurance}
          </p>
        </div>

        <div className="relative mx-auto mt-14 max-w-[1240px] px-4 md:mt-20 md:px-8">
          <div className="rounded-[18px] bg-white p-1.5 shadow-device ring-1 ring-line md:rounded-[28px] md:p-2">
            <div className="overflow-hidden rounded-[13px] ring-1 ring-line md:rounded-[21px]">
              <ScaleToFit width={1180}>
                <CalendarMockup />
              </ScaleToFit>
            </div>
          </div>
          <div
            aria-hidden="true"
            className="absolute -left-4 top-[16%] hidden w-[270px] rounded-2xl bg-white p-4 shadow-float ring-1 ring-line xl:block"
          >
            <div className="flex items-center gap-2 text-[12px] font-medium text-lilac-700">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-lilac-100">
                <StoreIcon className="h-3.5 w-3.5" />
              </span>
              Gleami marketplace
            </div>
            <p className="mt-3 text-[15px] font-semibold">
              {copy.business.mockBooking}
            </p>
            <p className="text-[13px] text-muted">
              {copy.business.mockBookingTime}
            </p>
          </div>
          <div
            aria-hidden="true"
            className="absolute -bottom-5 left-[12%] hidden items-center gap-3 rounded-2xl bg-white py-3 pl-3 pr-5 shadow-float ring-1 ring-line lg:flex"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sage-100 text-sage-700">
              <BellIcon className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[13px] font-semibold">
                {copy.business.mockReminder}
              </p>
              <p className="text-[12px] text-muted">
                {copy.business.mockAutomatic}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="product" className="bg-white py-24 md:py-36">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <SectionIntro
            id="platform-title"
            align="split"
            title={copy.business.overviewTitle}
            description={copy.business.overviewBody}
          />
          <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 md:mt-24">
            {copy.business.features.map((feature, index) => {
              const Icon = featureIcons[index];
              return (
                <article
                  key={feature.title}
                  className="rounded-[24px] bg-canvas p-7 ring-1 ring-line transition-transform duration-200 hover:-translate-y-1 md:p-8"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-rose-700 shadow-soft ring-1 ring-line">
                    <Icon aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <h3 className="mt-7 text-[20px] font-semibold tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-[15px] leading-relaxed text-muted">
                    {feature.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section
        id="marketplace"
        aria-labelledby="business-marketplace-title"
        className="overflow-hidden bg-ink py-24 text-white md:py-36"
      >
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <SectionIntro
            id="business-marketplace-title"
            inverse
            eyebrow={copy.business.marketplaceEyebrow}
            title={copy.business.marketplaceTitle}
            description={copy.business.marketplaceBody}
          >
            <ButtonLink
              href={appUrl}
              variant="inverse"
              size="lg"
              arrow
            >
              {copy.actions.publish}
            </ButtonLink>
            <ButtonLink
              href={routeFor(locale, { kind: "salons" })}
              variant="outline"
              size="lg"
            >
              {copy.actions.explore}
            </ButtonLink>
          </SectionIntro>

          <div className="mt-16 flex items-start justify-center gap-4 sm:gap-8 md:mt-24 md:gap-12">
            <div className="w-[46%] max-w-[272px]">
              <ScaleToFit width={272}>
                <PhoneFrame
                  dark
                  label="Gleami marketplace map with nearby salons"
                >
                  <MarketplaceMapScreen />
                </PhoneFrame>
              </ScaleToFit>
            </div>
            <div className="mt-16 w-[46%] max-w-[272px] md:mt-24">
              <ScaleToFit width={272}>
                <PhoneFrame
                  dark
                  label="Gleami salon profile with treatments and time slots"
                >
                  <MarketplaceSalonScreen />
                </PhoneFrame>
              </ScaleToFit>
            </div>
          </div>

          <ol className="relative mt-20 grid gap-8 md:mt-28 md:grid-cols-5 md:gap-6">
            <span
              aria-hidden="true"
              className="absolute left-[10%] right-[10%] top-6 hidden h-px bg-white/15 md:block"
            />
            {copy.business.marketplaceSteps.map((step, index) => {
              const Icon = marketplaceIcons[index];
              return (
                <li
                  key={step}
                  className="relative flex gap-4 md:flex-col md:items-center md:text-center"
                >
                  <span
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
                      index === copy.business.marketplaceSteps.length - 1
                        ? "bg-rose-300 text-ink"
                        : "bg-[#2A2522] text-white ring-1 ring-white/15"
                    }`}
                  >
                    <Icon aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <p className="pt-2 text-[15px] font-semibold md:pt-0">
                    {step}
                  </p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section id="faq" className="py-24 md:py-36">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 md:px-8 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-28">
              <p className="text-[15px] font-medium text-rose-600">
                {copy.business.faqEyebrow}
              </p>
              <h2 className="mt-3 text-balance text-[38px] font-semibold leading-[1.04] tracking-tightest md:text-[52px]">
                {copy.business.faqTitle}
              </h2>
              <p className="mt-5 text-[17px] leading-relaxed text-muted">
                {copy.business.faqBody}
              </p>
              <ButtonLink
                href={demoUrl}
                variant="secondary"
                arrow
                className="mt-8"
              >
                {copy.actions.demo}
              </ButtonLink>
            </div>
          </div>
          <div className="border-t border-line lg:col-span-8">
            {copy.business.faqs.map((item, index) => (
              <details
                key={item.question}
                open={index === 0}
                className="group border-b border-line"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 text-[18px] font-medium tracking-tight md:text-[20px]">
                  {item.question}
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-shell text-[20px] transition group-open:rotate-45 group-open:bg-ink group-open:text-white">
                    +
                  </span>
                </summary>
                <p className="max-w-2xl pb-6 pr-12 text-[16px] leading-relaxed text-muted">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="px-3 pb-10 md:px-6 md:pb-16">
        <div className="mx-auto max-w-[1400px] overflow-hidden rounded-[32px] bg-ink px-5 pt-20 text-center md:rounded-[48px] md:pt-28">
          <LogoMark inverse className="mx-auto h-12 w-12" />
          <h2 className="mx-auto mt-8 max-w-4xl text-balance text-[40px] font-semibold leading-[1.02] tracking-tightest text-white md:text-[64px] lg:text-[80px]">
            {copy.business.finalTitle}
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-[18px] leading-relaxed text-white/70 md:text-[20px]">
            {copy.business.finalBody}
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ButtonLink
              href={appUrl}
              variant="inverse"
              size="lg"
              arrow
              className="w-full sm:w-auto"
            >
              {copy.actions.start}
            </ButtonLink>
            <ButtonLink
              href={demoUrl}
              variant="outline"
              size="lg"
              className="w-full sm:w-auto"
            >
              {copy.actions.demo}
            </ButtonLink>
          </div>
          <ul className="mx-auto mt-12 grid max-w-2xl gap-3 text-left text-[14px] text-white/75 sm:grid-cols-3">
            {copy.business.features.slice(0, 3).map((feature) => (
              <li key={feature.title} className="flex items-center gap-2">
                <CheckIcon className="h-4 w-4 text-rose-300" />
                {feature.title}
              </li>
            ))}
          </ul>
          <div className="mx-auto mt-16 h-[180px] max-w-5xl overflow-hidden rounded-t-[16px] bg-white p-1.5 pb-0 sm:h-[240px] md:mt-24 md:h-[320px] md:rounded-t-[24px] md:p-2 md:pb-0">
            <div
              aria-hidden="true"
              className="overflow-hidden rounded-t-[11px] md:rounded-t-[17px]"
            >
              <ScaleToFit width={1180}>
                <CalendarMockup />
              </ScaleToFit>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
