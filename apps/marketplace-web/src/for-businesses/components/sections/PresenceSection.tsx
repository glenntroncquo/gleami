import React from 'react';
import { CheckIcon } from 'lucide-react';
import { ScaleToFit } from '../ui/ScaleToFit';
import { BrowserFrame } from '../ui/BrowserFrame';
import { Reveal } from '../ui/Reveal';
import { SalonSiteMockup } from '../mockups/SalonSiteMockup';
import { presenceIncludes, salonSite } from '../../data/salonSite';

export function PresenceSection() {
  return (
    <section id="presence" aria-labelledby="presence-title" className="overflow-hidden py-24 md:py-36">
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 md:px-8 lg:grid-cols-12 lg:gap-16">
        <Reveal className="order-2 lg:order-1 lg:col-span-8">
          <div className="rounded-[20px] bg-shell p-1.5 md:rounded-[32px] md:p-3 lg:-ml-16 xl:-ml-28">
            <div className="shadow-soft">
              <BrowserFrame url={salonSite.url}>
                <ScaleToFit width={980}>
                  <SalonSiteMockup />
                </ScaleToFit>
              </BrowserFrame>
            </div>
          </div>
        </Reveal>
        <div className="order-1 lg:order-2 lg:col-span-4">
          <p className="text-[15px] font-medium text-rose-600">Online presence</p>
          <h2
            id="presence-title"
            className="mt-3 text-balance text-[38px] font-semibold leading-[1.04] tracking-tightest text-ink md:text-[52px] lg:text-[56px]">
            
            Your salon deserves a beautiful online presence.
          </h2>
          <p className="mt-5 text-[18px] leading-relaxed text-muted">
            Give clients one polished place to get to know you and book. Your Gleami profile stays in sync with your calendar and treatments, and grows with your salon.
          </p>
          <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-3">
            {presenceIncludes.map((item) =>
            <li key={item} className="flex items-center gap-2 text-[15px] text-ink">
                <CheckIcon className="h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
                {item}
              </li>
            )}
          </ul>
        </div>
      </div>
    </section>);

}