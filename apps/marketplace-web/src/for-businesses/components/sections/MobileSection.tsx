import React from 'react';
import { SectionIntro } from '../ui/SectionIntro';
import { ScaleToFit } from '../ui/ScaleToFit';
import { PhoneFrame } from '../ui/PhoneFrame';
import { Reveal } from '../ui/Reveal';
import { CalendarMockup } from '../mockups/CalendarMockup';
import { MobileAgendaScreen } from '../mockups/MobileAgendaScreen';

const points = [
{ title: 'Today’s agenda', body: 'See who’s coming in and what’s next, from anywhere.' },
{ title: 'Bookings on the go', body: 'Add, move or check appointments between clients.' },
{ title: 'The numbers, in your pocket', body: 'Keep an eye on the day without sitting at the desk.' }];


export function MobileSection() {
  return (
    <section id="mobile" aria-labelledby="mobile-title" className="overflow-hidden bg-white py-24 md:py-36">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <SectionIntro
          id="mobile-title"
          label="Desktop and mobile"
          title="Your salon goes wherever you go."
          description="Run the salon from the front desk, then keep track from your phone when you’re with a client, on the train or at home." />
        
        <Reveal className="relative mx-auto mt-14 max-w-6xl pb-10 md:mt-20 md:pb-16">
          <div className="mr-[18%] rounded-[16px] bg-ink p-1.5 shadow-device md:mr-[14%] md:rounded-[22px] md:p-2.5">
            <div className="overflow-hidden rounded-[11px] md:rounded-[14px]">
              <ScaleToFit width={1180}>
                <CalendarMockup showDetail={false} />
              </ScaleToFit>
            </div>
          </div>
          <div className="absolute bottom-0 right-0 w-[36%] max-w-[272px]">
            <ScaleToFit width={272}>
              <PhoneFrame label="Gleami on mobile: today's revenue and upcoming appointments">
                <MobileAgendaScreen />
              </PhoneFrame>
            </ScaleToFit>
          </div>
        </Reveal>
        <div className="mx-auto mt-16 grid max-w-5xl gap-10 md:grid-cols-3">
          {points.map((p) =>
          <div key={p.title}>
              <h3 className="text-[17px] font-semibold tracking-tight text-ink">{p.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">{p.body}</p>
            </div>
          )}
        </div>
      </div>
    </section>);

}