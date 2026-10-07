import React from 'react';
import { CheckIcon, ArrowRightIcon } from 'lucide-react';
import { SectionIntro } from '../ui/SectionIntro';
import { Button } from '../ui/Button';
import { pricingPlan } from '../../data/pricing';
import { ctaLinks } from '../../data/navigation';

export function PricingSection() {
  return (
    <section id="pricing" aria-labelledby="pricing-title" className="py-24 md:py-36">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <SectionIntro
          id="pricing-title"
          label="Pricing"
          title="Simple, transparent pricing."
          description="One plan with everything included. No feature tiers to decode." />
        
        <div className="mx-auto mt-14 grid max-w-5xl overflow-hidden rounded-[32px] bg-white shadow-soft ring-1 ring-line md:mt-20 md:grid-cols-2">
          <div className="p-8 md:p-12">
            <p className="text-[22px] font-semibold tracking-tight text-ink">{pricingPlan.name}</p>
            <p className="mt-1 text-[16px] text-muted">{pricingPlan.description}</p>
            <p className="mt-10 flex items-baseline gap-2">
              <span className="text-[64px] font-semibold leading-none tracking-tightest text-ink">{pricingPlan.price}</span>
              <span className="text-[17px] text-muted">{pricingPlan.period}</span>
            </p>
            <p className="mt-3 text-[15px] text-muted">{pricingPlan.addOn}</p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row md:flex-col lg:flex-row">
              <Button href={ctaLinks.getStarted} size="lg" arrow className="w-full lg:w-auto">
                Start with Gleami
              </Button>
              <Button href={ctaLinks.bookDemo} variant="secondary" size="lg" className="w-full lg:w-auto">
                Book a demo
              </Button>
            </div>
            <p className="mt-6 rounded-xl bg-sand-50 px-3.5 py-2.5 text-[13px] text-sand-700">{pricingPlan.note}</p>
          </div>
          <div className="border-t border-line bg-canvas p-8 md:border-l md:border-t-0 md:p-12">
            <p className="text-[15px] font-semibold text-ink">Everything included</p>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
              {pricingPlan.includes.map((item) =>
              <li key={item} className="flex items-center gap-3 text-[16px] text-ink">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-line">
                    <CheckIcon className="h-3.5 w-3.5 text-rose-600" aria-hidden="true" />
                  </span>
                  {item}
                </li>
              )}
            </ul>
          </div>
        </div>
        <p className="mt-8 text-center text-[15px] text-muted">
          Questions about pricing?{' '}
          <a
            href="#faq"
            className="inline-flex items-center gap-1 font-medium text-ink underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500">
            
            Read the FAQ
            <ArrowRightIcon className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </p>
      </div>
    </section>);

}