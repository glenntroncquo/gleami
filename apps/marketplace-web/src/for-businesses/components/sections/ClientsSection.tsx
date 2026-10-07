import React from 'react';
import { ScaleToFit } from '../ui/ScaleToFit';
import { Reveal } from '../ui/Reveal';
import { ClientProfileMockup } from '../mockups/ClientProfileMockup';
import { clientPoints } from '../../data/clientProfile';

export function ClientsSection() {
  return (
    <section id="clients" aria-labelledby="clients-title" className="overflow-hidden py-24 md:py-36">
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 md:px-8 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-4">
          <p className="text-[15px] font-medium text-rose-600">Clients</p>
          <h2
            id="clients-title"
            className="mt-3 text-[38px] font-semibold leading-[1.04] tracking-tightest text-ink md:text-[52px] lg:text-[64px]">
            
            Know your clients.
          </h2>
          <p className="mt-5 text-[18px] leading-relaxed text-muted md:text-[20px]">
            A complete picture of every client — without a complicated screen. Greet people like regulars, because they are.
          </p>
          <dl className="mt-10">
            {clientPoints.map((p) =>
            <div key={p.title} className="border-t border-line py-4">
                <dt className="text-[16px] font-semibold tracking-tight text-ink">{p.title}</dt>
                <dd className="mt-1 text-[15px] leading-relaxed text-muted">{p.body}</dd>
              </div>
            )}
          </dl>
        </div>
        <Reveal className="lg:col-span-8">
          <div className="rounded-[20px] bg-shell p-1.5 md:rounded-[32px] md:p-3 lg:-mr-16 xl:-mr-28">
            <div className="overflow-hidden rounded-[15px] shadow-soft ring-1 ring-line md:rounded-[24px]">
              <ScaleToFit width={860}>
                <ClientProfileMockup />
              </ScaleToFit>
            </div>
          </div>
        </Reveal>
      </div>
    </section>);

}