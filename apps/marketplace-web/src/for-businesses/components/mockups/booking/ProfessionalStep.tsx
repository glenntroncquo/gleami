import React from 'react';
import { CheckIcon, SparklesIcon } from 'lucide-react';
import { BookingStepHeader } from './BookingStepHeader';
import { Avatar } from '../../ui/Avatar';
import { bookingProfessionals } from '../../../data/booking';

export function ProfessionalStep() {
  return (
    <div className="flex h-full flex-col">
      <BookingStepHeader step={2} title="Choose a professional" />
      <p className="px-5 pt-1 text-[12px] text-muted">Cut & blow-dry · 60 min</p>
      <ul className="mt-5 space-y-2 px-5">
        <li className="flex items-center gap-3 rounded-2xl p-3.5 ring-1 ring-line">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-shell text-muted">
            <SparklesIcon className="h-4 w-4" />
          </span>
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-ink">Any professional</p>
            <p className="text-[11px] text-muted">Earliest available time</p>
          </div>
          <span className="h-5 w-5 rounded-full ring-1 ring-line-strong" />
        </li>
        {bookingProfessionals.map((p) =>
        <li
          key={p.name}
          className={`flex items-center gap-3 rounded-2xl p-3.5 ${p.selected ? 'bg-rose-50 ring-2 ring-ink' : 'ring-1 ring-line'}`}>
          
            <Avatar name={p.name} tone={p.tone} size="md" />
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-ink">{p.name}</p>
              <p className="text-[11px] text-muted">{p.role}</p>
              <p className="mt-0.5 text-[11px] font-medium text-sage-700">{p.next}</p>
            </div>
            <span
            className={`flex h-5 w-5 items-center justify-center rounded-full ${p.selected ? 'bg-ink text-white' : 'ring-1 ring-line-strong'}`}>
            
              {p.selected && <CheckIcon className="h-3 w-3" strokeWidth={3} />}
            </span>
          </li>
        )}
      </ul>
      <div className="mt-auto border-t border-line p-4">
        <div className="flex h-12 items-center justify-center rounded-2xl bg-ink text-[13px] font-medium text-white">
          Continue with Emma
        </div>
      </div>
    </div>);

}