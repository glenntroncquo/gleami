import React from 'react';
import { SearchIcon, SlidersHorizontalIcon, MapPinIcon, StarIcon, HeartIcon, CompassIcon, CalendarIcon, UserIcon } from 'lucide-react';
import { StatusBar } from '../../ui/StatusBar';
import { mapPins, marketplaceCategories, marketplaceSalons } from '../../../data/marketplace';

const tabs = [
{ label: 'Explore', icon: CompassIcon, active: true },
{ label: 'Favourites', icon: HeartIcon },
{ label: 'Bookings', icon: CalendarIcon },
{ label: 'Profile', icon: UserIcon }];


export function MarketplaceMapScreen() {
  return (
    <div className="relative flex h-full flex-col bg-white">
      <StatusBar />
      <div className="px-4 pt-2">
        <div className="flex items-center gap-2">
          <div className="flex h-10 flex-1 items-center gap-2 rounded-full bg-shell px-3.5 text-[12px] text-muted">
            <SearchIcon className="h-3.5 w-3.5" />
            Search salons or treatments
          </div>
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-shell">
            <SlidersHorizontalIcon className="h-3.5 w-3.5 text-ink" />
          </span>
        </div>
        <p className="mt-2.5 flex items-center gap-1 text-[11px] font-medium text-ink">
          <MapPinIcon className="h-3 w-3 text-rose-600" />
          Near Ghent centre
        </p>
        <div className="mt-2.5 flex gap-1.5 overflow-hidden">
          {marketplaceCategories.map((c, i) =>
          <span
            key={c}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[10.5px] font-medium ${i === 1 ? 'bg-ink text-white' : 'bg-white text-ink ring-1 ring-line'}`}>
            
              {c}
            </span>
          )}
        </div>
      </div>

      <div className="relative mt-3 h-[190px] overflow-hidden bg-[#EEF1F6]">
        <svg viewBox="0 0 272 190" className="absolute inset-0 h-full w-full" preserveAspectRatio="none" aria-hidden="true">
          <rect x="150" y="10" width="80" height="50" rx="8" fill="#D9F0E2" />
          <path d="M-10 130 C 60 110, 110 160, 180 130 S 280 110, 290 120" stroke="#D3DFFB" strokeWidth="16" fill="none" />
          <path d="M0 60 H272 M0 100 H272 M60 0 V190 M130 0 V190 M200 0 V190" stroke="#FFFFFF" strokeWidth="5" />
          <path d="M0 20 L272 170" stroke="#FFFFFF" strokeWidth="7" />
          <path d="M20 0 V190 M95 0 V190 M165 0 V190 M240 0 V190 M0 150 H272" stroke="#FFFFFF" strokeWidth="2" opacity="0.8" />
        </svg>
        {mapPins.map((p) =>
        <span
          key={p.label + p.x}
          className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full px-2 py-1 text-[10px] font-semibold shadow-soft ${p.active ? 'z-10 bg-ink text-white' : 'bg-white text-ink'}`}
          style={{ left: `${p.x}%`, top: `${p.y}%` }}>
          
            {p.label}
          </span>
        )}
      </div>

      <div className="relative -mt-5 flex-1 rounded-t-[24px] bg-white px-4 pt-2.5 shadow-[0_-8px_24px_-12px_rgba(27,24,23,0.15)]">
        <span className="mx-auto block h-1 w-9 rounded-full bg-line-strong" />
        <p className="mt-2.5 text-[13px] font-semibold text-ink">12 salons nearby</p>
        <ul className="mt-2 space-y-2.5">
          {marketplaceSalons.slice(0, 2).map((s) =>
          <li key={s.name} className="flex gap-3">
              <img src={s.image} alt="" className="h-[62px] w-[62px] rounded-xl object-cover" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between">
                  <p className="truncate text-[13px] font-semibold text-ink">{s.name}</p>
                  <HeartIcon className={`h-3.5 w-3.5 shrink-0 ${s.favourite ? 'fill-rose-500 text-rose-500' : 'text-subtle'}`} />
                </div>
                <p className="flex items-center gap-1 text-[10.5px] text-muted">
                  <StarIcon className="h-2.5 w-2.5 fill-gold text-gold" />
                  <span className="font-medium text-ink">{s.rating}</span> ({s.reviews}) · {s.distance}
                </p>
                <span className="mt-1 inline-block rounded-full bg-sage-50 px-2 py-0.5 text-[10px] font-medium text-sage-700">
                  {s.next}
                </span>
              </div>
            </li>
          )}
        </ul>
      </div>

      <div className="grid grid-cols-4 border-t border-line bg-white px-2 pb-5 pt-2">
        {tabs.map(({ label, icon: Icon, active }) =>
        <span key={label} className={`flex flex-col items-center gap-0.5 text-[9.5px] ${active ? 'text-ink font-semibold' : 'text-subtle'}`}>
            <Icon className="h-4 w-4" />
            {label}
          </span>
        )}
      </div>
    </div>);

}