import React from 'react';
import { CheckIcon } from 'lucide-react';
import { BookingStepHeader } from './BookingStepHeader';
import { bookingCategories, bookingTreatments } from '../../../data/booking';

export function TreatmentStep() {
  return (
    <div className="flex h-full flex-col">
      <BookingStepHeader step={1} title="Choose a treatment" />
      <div className="mt-4 flex gap-1.5 overflow-hidden px-5">
        {bookingCategories.map((c, i) =>
        <span
          key={c}
          className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-medium ${i === 0 ? 'bg-ink text-white' : 'bg-shell text-muted'}`}>
          
            {c}
          </span>
        )}
      </div>
      <ul className="mt-4 space-y-2 px-5">
        {bookingTreatments.map((t) =>
        <li
          key={t.name}
          className={`flex items-center gap-3 rounded-2xl p-3.5 ${t.selected ? 'bg-rose-50 ring-2 ring-ink' : 'ring-1 ring-line'}`}>
          
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-ink">{t.name}</p>
              <p className="text-[11px] text-muted">{t.duration}</p>
            </div>
            <span className="text-[13px] font-medium text-ink">{t.price}</span>
            <span
            className={`flex h-5 w-5 items-center justify-center rounded-full ${t.selected ? 'bg-ink text-white' : 'ring-1 ring-line-strong'}`}>
            
              {t.selected && <CheckIcon className="h-3 w-3" strokeWidth={3} />}
            </span>
          </li>
        )}
      </ul>
      <div className="mt-auto border-t border-line p-4">
        <div className="flex h-12 items-center justify-between rounded-2xl bg-ink px-4 text-[13px] font-medium text-white">
          <span>Cut & blow-dry · €58</span>
          <span>Continue</span>
        </div>
      </div>
    </div>);

}