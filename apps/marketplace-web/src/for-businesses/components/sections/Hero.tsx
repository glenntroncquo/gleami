import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { BellIcon, StoreIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import { ScaleToFit } from '../ui/ScaleToFit';
import { CalendarMockup } from '../mockups/CalendarMockup';
import { ctaLinks } from '../../data/navigation';
import { easeOut } from '../../utils/motion';

const revenueBars = [38, 52, 30, 64, 58, 80, 46, 72];

export function Hero() {
  const reduce = useReducedMotion();
  const enter = (delay: number) =>
  reduce ?
  {} :
  {
    initial: { opacity: 0, y: 12, scale: 0.96 },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: { duration: 0.3, ease: easeOut, delay }
  };

  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden pb-10 pt-14 md:pb-16 md:pt-24">
      <div className="mx-auto max-w-7xl px-5 text-center md:px-8">
        <h1
          id="hero-title"
          className="mx-auto max-w-5xl text-balance text-[44px] font-semibold leading-[1.02] tracking-tightest text-ink sm:text-[60px] md:text-[76px] lg:text-[88px]">
          
          Everything your salon needs. <span className="text-rose-500">In one place.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-pretty text-[18px] leading-relaxed text-muted md:text-[21px]">
          Manage appointments, clients, staff, payments and more with one beautifully simple platform.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button href={ctaLinks.getStarted} size="lg" arrow className="w-full sm:w-auto">
            Get started
          </Button>
          <Button href={ctaLinks.bookDemo} variant="secondary" size="lg" className="w-full sm:w-auto">
            Book a demo
          </Button>
        </div>
        <p className="mt-5 flex items-center justify-center gap-2.5 text-[14px] text-muted">
          <span>Easy setup</span>
          <span className="h-1 w-1 rounded-full bg-line-strong" aria-hidden="true" />
          <span>No credit card required</span>
        </p>
      </div>

      <div className="relative mx-auto mt-14 max-w-[1240px] px-4 md:mt-20 md:px-8">
        <motion.div
          {...reduce ?
          {} :
          {
            initial: { opacity: 0, y: 32 },
            animate: { opacity: 1, y: 0 },
            transition: { duration: 0.3, ease: easeOut, delay: 0.05 }
          }}
          className="rounded-[18px] bg-white p-1.5 shadow-device ring-1 ring-line md:rounded-[28px] md:p-2">
          
          <div className="overflow-hidden rounded-[13px] ring-1 ring-line md:rounded-[21px]">
            <ScaleToFit width={1180}>
              <CalendarMockup />
            </ScaleToFit>
          </div>
        </motion.div>

        <motion.div
          {...enter(0.25)}
          aria-hidden="true"
          className="absolute left-0 top-[16%] hidden w-[270px] rounded-2xl bg-white p-4 shadow-float ring-1 ring-line lg:block xl:-left-4 2xl:-left-12">
          
          <div className="flex items-center gap-2 text-[12px] font-medium text-lilac-700">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-lilac-100">
              <StoreIcon className="h-3.5 w-3.5" />
            </span>
            New booking · via Gleami marketplace
          </div>
          <p className="mt-3 text-[15px] font-semibold text-ink">Julie Peeters</p>
          <p className="text-[13px] text-muted">Blow-dry with Emma · Today, 12:30</p>
        </motion.div>

        <motion.div
          {...enter(0.32)}
          aria-hidden="true"
          className="absolute right-0 top-[38%] hidden w-[230px] rounded-2xl bg-white p-4 shadow-float ring-1 ring-line lg:block xl:-right-4 2xl:-right-12">
          
          <p className="text-[12px] font-medium text-muted">Today's revenue</p>
          <p className="mt-1 text-[28px] font-semibold tracking-tight text-ink">€1,284</p>
          <div className="mt-3 flex h-10 items-end gap-1.5">
            {revenueBars.map((h, i) =>
            <span
              key={i}
              className={`flex-1 rounded-sm ${i === revenueBars.length - 1 ? 'bg-rose-400' : 'bg-shell'}`}
              style={{ height: `${h}%` }} />

            )}
          </div>
          <p className="mt-2 text-[12px] text-muted">12 of 19 appointments paid</p>
        </motion.div>

        <motion.div
          {...enter(0.39)}
          aria-hidden="true"
          className="absolute -bottom-6 left-[14%] hidden items-center gap-3 rounded-2xl bg-white py-3 pl-3 pr-5 shadow-float ring-1 ring-line lg:flex">
          
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sage-100 text-sage-700">
            <BellIcon className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[13px] font-semibold text-ink">Reminder sent</p>
            <p className="text-[12px] text-muted">Sarah Janssens · Colour & cut at 14:00</p>
          </div>
        </motion.div>
      </div>
    </section>);

}