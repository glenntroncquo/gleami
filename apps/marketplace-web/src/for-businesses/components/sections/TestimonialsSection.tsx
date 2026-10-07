import React from 'react';
import { UserIcon } from 'lucide-react';
import { SectionIntro } from '../ui/SectionIntro';
import { testimonials } from '../../data/testimonials';

export function TestimonialsSection() {
  const [featured, ...rest] = testimonials;
  return (
    <section id="testimonials" aria-labelledby="testimonials-title" className="bg-white py-24 md:py-36">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <SectionIntro id="testimonials-title" align="left" label="Testimonials" title="What salon owners say." />
        <div className="mt-14 grid gap-6 lg:grid-cols-12">
          <figure className="flex flex-col rounded-[28px] bg-rose-50 p-8 md:p-12 lg:col-span-7">
            <blockquote className="text-pretty text-[24px] font-medium leading-snug tracking-tight text-ink md:text-[30px]">
              “{featured.quote}”
            </blockquote>
            <figcaption className="mt-auto flex items-center gap-3 pt-10">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-rose-700">
                <UserIcon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-[15px] font-semibold text-ink">{featured.name}</span>
                <span className="block text-[14px] text-rose-700">{featured.role}</span>
              </span>
            </figcaption>
          </figure>
          <div className="grid gap-6 lg:col-span-5">
            {rest.map((t, i) =>
            <figure key={i} className="flex flex-col rounded-[28px] bg-canvas p-8">
                <blockquote className="text-[18px] leading-relaxed text-ink">“{t.quote}”</blockquote>
                <figcaption className="mt-auto flex items-center gap-3 pt-8">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-muted ring-1 ring-line">
                    <UserIcon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-[14px] font-semibold text-ink">{t.name}</span>
                    <span className="block text-[13px] text-muted">{t.role}</span>
                  </span>
                </figcaption>
              </figure>
            )}
          </div>
        </div>
      </div>
    </section>);

}