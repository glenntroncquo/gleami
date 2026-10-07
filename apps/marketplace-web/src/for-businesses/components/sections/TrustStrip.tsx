import React from 'react';
import { salonCategories } from '../../data/navigation';

export function TrustStrip() {
  return (
    <section id="solutions" aria-labelledby="trust-title" className="py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-5 text-center md:px-8">
        <h2 id="trust-title" className="text-[15px] font-medium text-muted">
          Built for modern beauty businesses
        </h2>
        <ul className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {salonCategories.map((category) =>
          <li
            key={category}
            className="rounded-full bg-shell px-5 py-2.5 text-[16px] font-medium tracking-tight text-ink md:px-6 md:py-3 md:text-[18px]">
            
              {category}
            </li>
          )}
        </ul>
        <div className="mx-auto mt-12 flex max-w-md items-center gap-4">
          <span className="h-px flex-1 bg-line" aria-hidden="true" />
          <p className="text-[14px] text-muted">Trusted by salons across Belgium</p>
          <span className="h-px flex-1 bg-line" aria-hidden="true" />
        </div>
      </div>
    </section>);

}