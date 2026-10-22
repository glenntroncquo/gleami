import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { CalendarMockup } from "@/components/mockups/CalendarMockup";
import { ScaleToFit } from "@/components/ui/ScaleToFit";
import type { Locale } from "@/lib/i18n";
import type { HomeCopy } from "./messages";

type BusinessSectionProps = {
  locale: Locale;
  copy: HomeCopy;
};

export function BusinessSection({ locale, copy }: BusinessSectionProps) {
  return (
    <section id="business" aria-labelledby="business-title" className="scroll-mt-20 bg-navy">
      <div className="mx-auto grid max-w-7xl gap-16 px-5 py-24 md:px-8 lg:grid-cols-[1fr_1.15fr] lg:items-center lg:py-32">
        <div>
          <p className="text-[15px] font-semibold text-peri-light">{copy.businessEyebrow}</p>
          <h2 id="business-title" className="mt-4 text-4xl font-semibold leading-[1.05] tracking-[-0.03em] text-white md:text-[56px]">
            {copy.businessTitleLead}
            <br />
            {copy.businessTitleRest}
          </h2>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-white/75">{copy.businessBody}</p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="https://pro.gleami.eu"
              className="inline-flex h-12 items-center gap-2 whitespace-nowrap rounded-full bg-peri px-6 text-[15px] font-semibold text-white transition-colors duration-150 hover:bg-peri-dark"
            >
              {copy.businessStart}
              <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="https://calendly.com/glenntroncquo1/30min"
              className="inline-flex h-12 items-center whitespace-nowrap rounded-full border border-white/25 px-6 text-[15px] font-semibold text-white transition-colors duration-150 hover:bg-navy-700"
            >
              {copy.businessDemo}
            </Link>
          </div>

          <figure className="mt-14 max-w-md border-t border-white/15 pt-8">
            <blockquote className="text-lg leading-relaxed text-white">
              {copy.businessQuote}
            </blockquote>
            <figcaption className="mt-3 text-sm text-white/60">{copy.businessQuoteBy}</figcaption>
          </figure>
        </div>

        <div className="rounded-[18px] bg-white p-1.5 shadow-device ring-1 ring-white/10 md:rounded-[28px] md:p-2">
          <div className="overflow-hidden rounded-[13px] ring-1 ring-line md:rounded-[21px]">
            <ScaleToFit width={1180}>
              <CalendarMockup locale={locale} />
            </ScaleToFit>
          </div>
        </div>
      </div>
    </section>
  );
}
