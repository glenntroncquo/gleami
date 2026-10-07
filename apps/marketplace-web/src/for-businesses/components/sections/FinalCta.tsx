import React from 'react';
import { Button } from '../ui/Button';
import { ScaleToFit } from '../ui/ScaleToFit';
import { LogoMark } from '../ui/LogoMark';
import { CalendarMockup } from '../mockups/CalendarMockup';
import { ctaLinks } from '../../data/navigation';

export function FinalCta() {
  return (
    <section id="contact" aria-labelledby="final-cta-title" className="px-3 pb-10 md:px-6 md:pb-16">
      <div className="mx-auto max-w-[1400px] overflow-hidden rounded-[32px] bg-ink px-5 pt-20 text-center md:rounded-[48px] md:pt-28">
        <LogoMark inverse className="mx-auto h-12 w-12" />
        <h2
          id="final-cta-title"
          className="mx-auto mt-8 max-w-4xl text-balance text-[40px] font-semibold leading-[1.02] tracking-tightest text-white md:text-[64px] lg:text-[80px]">
          
          Ready to run your salon differently?
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-[18px] leading-relaxed text-white/70 md:text-[20px]">
          Spend less time managing software and more time growing your business.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button href={ctaLinks.getStarted} variant="inverse" size="lg" arrow className="w-full sm:w-auto">
            Get started
          </Button>
          <Button href={ctaLinks.bookDemo} variant="inverseOutline" size="lg" className="w-full sm:w-auto">
            Book a demo
          </Button>
        </div>
        <div className="mx-auto mt-16 h-[180px] max-w-5xl overflow-hidden rounded-t-[16px] bg-white p-1.5 pb-0 sm:h-[240px] md:mt-24 md:h-[320px] md:rounded-t-[24px] md:p-2 md:pb-0">
          <div className="overflow-hidden rounded-t-[11px] md:rounded-t-[17px]" aria-hidden="true">
            <ScaleToFit width={1180}>
              <CalendarMockup />
            </ScaleToFit>
          </div>
        </div>
      </div>
    </section>);

}