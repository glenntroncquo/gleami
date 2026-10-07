import React from 'react';
import { SectionIntro } from '../ui/SectionIntro';
import { PhoneFrame } from '../ui/PhoneFrame';
import { ScaleToFit } from '../ui/ScaleToFit';
import { Reveal } from '../ui/Reveal';
import { TreatmentStep } from '../mockups/booking/TreatmentStep';
import { ProfessionalStep } from '../mockups/booking/ProfessionalStep';
import { TimeStep } from '../mockups/booking/TimeStep';
import { ConfirmStep } from '../mockups/booking/ConfirmStep';
import { BookingLinkShare } from './BookingLinkShare';
import { bookingBenefits, bookingSteps } from '../../data/booking';

const screens = [TreatmentStep, ProfessionalStep, TimeStep, ConfirmStep];

export function BookingSection() {
  return (
    <section id="booking" aria-labelledby="booking-title" className="py-24 md:py-36">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <SectionIntro
          id="booking-title"
          align="split"
          label="Online booking"
          title="Let clients book while you focus on your work."
          description="Your salon takes bookings day and night. Clients pick a treatment, a professional and a time that’s actually free — and it lands straight in your calendar." />
        

        <div className="mt-14 rounded-[32px] bg-shell py-10 md:mt-20 md:rounded-[40px] md:py-14">
          <ol className="no-scrollbar flex snap-x snap-mandatory gap-5 overflow-x-auto px-6 md:px-10 lg:grid lg:grid-cols-4 lg:gap-6 lg:overflow-visible">
            {screens.map((Screen, i) =>
            <li key={bookingSteps[i]} className="flex w-[232px] shrink-0 snap-center flex-col items-center lg:w-auto">
                <Reveal delay={i * 0.05} className="w-full max-w-[272px]">
                  <ScaleToFit width={272}>
                    <PhoneFrame label={`Booking step ${i + 1}: ${bookingSteps[i]}`}>
                      <Screen />
                    </PhoneFrame>
                  </ScaleToFit>
                </Reveal>
                <div className="mt-6 text-center">
                  <p className="text-[14px] font-medium text-rose-600">Step {i + 1}</p>
                  <p className="mt-0.5 text-[17px] font-semibold tracking-tight text-ink">{bookingSteps[i]}</p>
                </div>
              </li>
            )}
          </ol>
        </div>

        <div className="mt-16 grid gap-x-12 gap-y-10 md:grid-cols-2 lg:mt-20 lg:grid-cols-3">
          {bookingBenefits.map((b) =>
          <div key={b.title} className="border-t border-line pt-6">
              <h3 className="text-[17px] font-semibold tracking-tight text-ink">{b.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">{b.body}</p>
            </div>
          )}
          <div className="border-t border-line pt-6">
            <BookingLinkShare />
          </div>
        </div>
      </div>
    </section>);

}