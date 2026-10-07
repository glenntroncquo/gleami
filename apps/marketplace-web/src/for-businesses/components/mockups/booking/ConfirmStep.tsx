import React from 'react';
import { CalendarIcon, ClockIcon, UserIcon } from 'lucide-react';
import { BookingStepHeader } from './BookingStepHeader';

const summary = [
{ icon: CalendarIcon, label: 'Tuesday 29 September' },
{ icon: ClockIcon, label: '15:30 – 16:30 · 60 min' },
{ icon: UserIcon, label: 'With Emma' }];


const fields = [
{ label: 'Full name', value: 'Lea Martens' },
{ label: 'Email', value: 'lea@example.com' },
{ label: 'Phone', value: '+32 ··· ·· ·· 18' }];


export function ConfirmStep() {
  return (
    <div className="flex h-full flex-col">
      <BookingStepHeader step={4} title="Confirm booking" />
      <div className="mx-5 mt-4 rounded-2xl bg-shell p-3.5">
        <div className="flex items-baseline justify-between">
          <p className="text-[13px] font-semibold text-ink">Cut & blow-dry</p>
          <p className="text-[13px] font-semibold text-ink">€58</p>
        </div>
        <ul className="mt-2 space-y-1">
          {summary.map(({ icon: Icon, label }) =>
          <li key={label} className="flex items-center gap-2 text-[11px] text-muted">
              <Icon className="h-3 w-3" />
              {label}
            </li>
          )}
        </ul>
      </div>
      <div className="flex items-center justify-between px-5 pt-4">
        <p className="text-[12px] font-semibold text-ink">Your details</p>
        <span className="rounded-full bg-sage-50 px-2 py-0.5 text-[10px] font-medium text-sage-700">Booking as guest</span>
      </div>
      <div className="mt-2 space-y-1.5 px-5">
        {fields.map((f) =>
        <div key={f.label} className="rounded-xl px-3 py-1.5 ring-1 ring-line">
            <p className="text-[9.5px] text-muted">{f.label}</p>
            <p className="text-[12px] font-medium text-ink">{f.value}</p>
          </div>
        )}
      </div>
      <div className="mt-auto border-t border-line p-4">
        <div className="flex h-12 items-center justify-center rounded-2xl bg-rose-600 text-[13px] font-semibold text-white">
          Confirm booking
        </div>
        <p className="mt-2 text-center text-[10px] text-muted">You’ll receive a confirmation right away.</p>
      </div>
    </div>);

}