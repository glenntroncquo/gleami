import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { CalendarMock } from "./CalendarMock";

type BusinessSectionProps = {
  businessHref: string;
};

export function BusinessSection({ businessHref }: BusinessSectionProps) {
  return (
    <section id="business" aria-labelledby="business-title" className="scroll-mt-20 bg-navy">
      <div className="mx-auto grid max-w-7xl gap-16 px-5 py-24 md:px-8 lg:grid-cols-[1fr_1.15fr] lg:items-center lg:py-32">
        <div>
          <p className="text-[15px] font-semibold text-peri-light">Gleami for business</p>
          <h2 id="business-title" className="mt-4 text-4xl font-semibold leading-[1.05] tracking-[-0.03em] text-white md:text-[56px]">
            Run a calmer,
            <br />
            fuller salon.
          </h2>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-white/75">
            Calendar, payments and client notes in one quiet place, plus a marketplace of people looking to book you tonight.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href={businessHref}
              className="inline-flex h-12 items-center gap-2 whitespace-nowrap rounded-full bg-peri px-6 text-[15px] font-semibold text-white transition-colors duration-150 hover:bg-peri-dark"
            >
              Get started free
              <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href={`${businessHref}#contact`}
              className="inline-flex h-12 items-center whitespace-nowrap rounded-full border border-white/25 px-6 text-[15px] font-semibold text-white transition-colors duration-150 hover:bg-navy-700"
            >
              Book a demo
            </Link>
          </div>

          <figure className="mt-14 max-w-md border-t border-white/15 pt-8">
            <blockquote className="text-lg leading-relaxed text-white">
              “We filled almost a third more chairs in our first month, and the phone finally stopped ringing.”
            </blockquote>
            <figcaption className="mt-3 text-sm text-white/60">Maya Ortiz, owner of Atelier Nord</figcaption>
          </figure>
        </div>

        <CalendarMock />
      </div>
    </section>
  );
}
