import React from 'react';
import Image from 'next/image';
import { ChevronLeftIcon, HeartIcon, StarIcon, MapPinIcon, ClockIcon } from 'lucide-react';
import { StatusBar } from '../../ui/StatusBar';
import { marketplaceImages, salonDetailTreatments } from '../../../data/marketplace';

const tabs = ['Treatments', 'Team', 'Reviews', 'About'];

export function MarketplaceSalonScreen() {
  return (
    <div className="relative flex h-full flex-col bg-white">
      <div className="relative h-[196px] shrink-0">
        <Image src={marketplaceImages.hair} alt="" fill sizes="272px" className="object-cover" />
        <div className="absolute inset-0 bg-ink/15" />
        <StatusBar light />
        <div className="relative z-10 flex justify-between px-4 pt-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-ink">
            <ChevronLeftIcon className="h-4 w-4" />
          </span>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white">
            <HeartIcon className="h-4 w-4 fill-rose-500 text-rose-500" />
          </span>
        </div>
      </div>

      <div className="-mt-4 flex-1 rounded-t-[22px] bg-white px-4 pt-4">
        <p className="text-[18px] font-semibold tracking-tight text-ink">Atelier Noor</p>
        <p className="text-[11px] text-muted">Hair · Colour · Nails</p>
        <div className="mt-2 flex items-center gap-3 text-[10.5px] text-muted">
          <span className="flex items-center gap-1">
            <StarIcon className="h-3 w-3 fill-ink text-ink" />
            <span className="font-semibold text-ink">4.9</span> · 128 reviews
          </span>
          <span className="flex items-center gap-1">
            <MapPinIcon className="h-3 w-3" />
            0.8 km
          </span>
          <span className="flex items-center gap-1 text-sage-700">
            <ClockIcon className="h-3 w-3" />
            Open until 19:00
          </span>
        </div>

        <div className="mt-3.5 flex gap-4 border-b border-line text-[11.5px]">
          {tabs.map((t, i) =>
          <span key={t} className={`-mb-px pb-2 ${i === 0 ? 'border-b-2 border-ink font-semibold text-ink' : 'text-muted'}`}>
              {t}
            </span>
          )}
        </div>

        <ul>
          {salonDetailTreatments.map((t) =>
          <li key={t.name} className="border-b border-line py-3 last:border-0">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[12.5px] font-semibold text-ink">{t.name}</p>
                  <p className="text-[10.5px] text-muted">
                    {t.duration} · {t.price}
                  </p>
                </div>
                <span className="rounded-full bg-ink px-3 py-1 text-[10.5px] font-medium text-white">Book</span>
              </div>
              <div className="mt-2 flex gap-1.5">
                {t.slots.map((s) =>
              <span key={s} className="rounded-lg bg-shell px-2 py-1 text-[10px] font-medium text-ink">
                    {s}
                  </span>
              )}
              </div>
            </li>
          )}
        </ul>
      </div>
    </div>);

}