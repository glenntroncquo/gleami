import React from 'react';
import { SectionIntro } from '../ui/SectionIntro';
import { ScaleToFit } from '../ui/ScaleToFit';
import { Reveal } from '../ui/Reveal';
import { AnalyticsMockup } from '../mockups/AnalyticsMockup';

export function AnalyticsSection() {
  return (
    <section id="analytics" aria-labelledby="analytics-title" className="bg-white py-24 md:py-36">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <SectionIntro
          id="analytics-title"
          label="Insights"
          title="Understand your business at a glance."
          description="Revenue, bookings, returning clients and how busy every chair is — presented clearly, so you can make decisions without a spreadsheet." />
        
        <Reveal className="mt-14 md:mt-20">
          <div className="rounded-[20px] bg-shell p-1.5 md:rounded-[32px] md:p-3">
            <div className="overflow-hidden rounded-[15px] shadow-soft ring-1 ring-line md:rounded-[24px]">
              <ScaleToFit width={1140}>
                <AnalyticsMockup />
              </ScaleToFit>
            </div>
          </div>
        </Reveal>
        <p className="mt-4 text-center text-[12px] text-muted">Dashboard shows illustrative data.</p>
      </div>
    </section>);

}