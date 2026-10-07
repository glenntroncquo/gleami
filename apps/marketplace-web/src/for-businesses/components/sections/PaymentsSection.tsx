import React from 'react';
import { SectionIntro } from '../ui/SectionIntro';
import { ScaleToFit } from '../ui/ScaleToFit';
import { Reveal } from '../ui/Reveal';
import { CheckoutMockup } from '../mockups/CheckoutMockup';
import { TransactionsMockup } from '../mockups/TransactionsMockup';
import { paymentPoints } from '../../data/payments';

export function PaymentsSection() {
  return (
    <section id="payments" aria-labelledby="payments-title" className="py-24 md:py-36">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <SectionIntro
          id="payments-title"
          align="split"
          label="Payments"
          title="From booking to payment."
          description="Checkout happens right where the appointment ends. Every sale is linked to the client and the booking, so your financial overview stays clear." />
        

        <div className="mt-14 grid items-start gap-6 md:mt-20 lg:grid-cols-12 lg:gap-8">
          <Reveal className="lg:col-span-7">
            <div className="overflow-hidden rounded-[18px] shadow-float ring-1 ring-line md:rounded-[24px]">
              <ScaleToFit width={700}>
                <CheckoutMockup />
              </ScaleToFit>
            </div>
          </Reveal>
          <Reveal delay={0.05} className="lg:col-span-5 lg:mt-24">
            <div className="overflow-hidden rounded-[18px] shadow-soft ring-1 ring-line md:rounded-[24px]">
              <ScaleToFit width={480}>
                <TransactionsMockup />
              </ScaleToFit>
            </div>
          </Reveal>
        </div>

        <div className="mt-16 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {paymentPoints.map((p) =>
          <div key={p.title} className="border-t border-line pt-6">
              <h3 className="text-[17px] font-semibold tracking-tight text-ink">{p.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">{p.body}</p>
            </div>
          )}
        </div>
      </div>
    </section>);

}