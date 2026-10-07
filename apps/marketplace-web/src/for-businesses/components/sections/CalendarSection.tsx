import React from 'react';
import { SectionIntro } from '../ui/SectionIntro';
import { ScaleToFit } from '../ui/ScaleToFit';
import { Reveal } from '../ui/Reveal';
import { ScheduleMockup } from '../mockups/ScheduleMockup';
import { calendarCapabilities } from '../../data/schedule';

export function CalendarSection() {
  return (
    <section id="calendar" aria-labelledby="calendar-title" className="bg-white py-24 md:py-36">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <SectionIntro
          id="calendar-title"
          label="Calendar"
          title="Your day, perfectly organised."
          description="See every professional, every appointment and every free minute at once. Rescheduling is a simple drag — no training needed." />
        
        <Reveal className="mt-14 md:mt-20">
          <div className="rounded-[20px] bg-shell p-1.5 md:rounded-[32px] md:p-3">
            <div className="overflow-hidden rounded-[15px] shadow-soft ring-1 ring-line md:rounded-[24px]">
              <ScaleToFit width={1120}>
                <ScheduleMockup />
              </ScaleToFit>
            </div>
          </div>
        </Reveal>
        <div className="mt-14 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {calendarCapabilities.map((c) =>
          <div key={c.title}>
              <h3 className="text-[17px] font-semibold tracking-tight text-ink">{c.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">{c.body}</p>
            </div>
          )}
        </div>
      </div>
    </section>);

}