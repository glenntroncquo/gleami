import React from 'react';
import { MapPinIcon, StoreIcon } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { salonSite, salonSiteHours, salonSiteTeam, salonSiteTreatments } from '../../data/salonSite';

export function SalonSiteMockup() {
  return (
    <div role="img" aria-label="Example salon profile page built with Gleami" className="w-full bg-white text-ink">
      <div className="flex items-center justify-between px-10 py-5">
        <p className="text-[18px] font-semibold tracking-tight">{salonSite.name}</p>
        <div className="flex items-center gap-7 text-[13px] text-muted">
          <span>Treatments</span>
          <span>Team</span>
          <span>Visit</span>
          <span className="rounded-full bg-ink px-4 py-2 font-medium text-white">Book now</span>
        </div>
      </div>

      <div className="grid grid-cols-2 items-center gap-10 px-10 pb-10 pt-4">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-lilac-50 px-2.5 py-1 text-[11px] font-medium text-lilac-700">
            <StoreIcon className="h-3 w-3" />
            Also on the Gleami marketplace
          </span>
          <p className="mt-4 text-[38px] font-semibold leading-[1.08] tracking-tightest">{salonSite.headline}</p>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">{salonSite.intro}</p>
          <div className="mt-6 flex items-center gap-3">
            <span className="rounded-full bg-ink px-5 py-3 text-[14px] font-medium text-white">Book an appointment</span>
            <span className="rounded-full px-5 py-3 text-[14px] font-medium ring-1 ring-line">View treatments</span>
          </div>
        </div>
        <img src={salonSite.heroImage} alt="" className="h-[340px] w-full rounded-3xl object-cover" />
      </div>

      <div className="grid grid-cols-3 gap-3 px-10">
        {salonSite.gallery.map((src) =>
        <img key={src} src={src} alt="" className="h-[150px] w-full rounded-2xl object-cover" />
        )}
      </div>

      <div className="grid grid-cols-3 gap-10 px-10 py-10">
        <div>
          <p className="text-[13px] font-semibold">Treatments</p>
          <ul className="mt-3 space-y-2.5 text-[13px]">
            {salonSiteTreatments.map((t) =>
            <li key={t.name} className="flex justify-between border-b border-line pb-2.5">
                <span>{t.name}</span>
                <span className="text-muted">{t.price}</span>
              </li>
            )}
          </ul>
        </div>
        <div>
          <p className="text-[13px] font-semibold">Team</p>
          <ul className="mt-3 grid grid-cols-2 gap-3">
            {salonSiteTeam.map((m) =>
            <li key={m.name} className="flex items-center gap-2 text-[13px]">
                <Avatar name={m.name} tone={m.tone} size="sm" />
                {m.name}
              </li>
            )}
          </ul>
        </div>
        <div>
          <p className="text-[13px] font-semibold">Opening hours</p>
          <ul className="mt-3 space-y-1.5 text-[13px]">
            {salonSiteHours.map((h) =>
            <li key={h.day} className="flex justify-between">
                <span className="text-muted">{h.day}</span>
                <span>{h.hours}</span>
              </li>
            )}
          </ul>
          <p className="mt-4 flex items-center gap-1.5 text-[12px] text-muted">
            <MapPinIcon className="h-3.5 w-3.5" />
            {salonSite.address}
          </p>
        </div>
      </div>
    </div>);

}