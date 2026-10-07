import React from 'react';
import { BookingStepHeader } from './BookingStepHeader';
import { bookingDays, bookingSlots } from '../../../data/booking';

type Slot = {time: string;taken?: boolean;selected?: boolean;};

function slotClass(slot: Slot) {
  if (slot.selected) return 'bg-ink text-white';
  if (slot.taken) return 'bg-shell text-subtle line-through';
  return 'ring-1 ring-line text-ink';
}

export function TimeStep() {
  return (
    <div className="flex h-full flex-col">
      <BookingStepHeader step={3} title="Select a time" />
      <p className="px-5 pt-1 text-[12px] text-muted">September · with Emma</p>
      <div className="mt-4 grid grid-cols-5 gap-1.5 px-5">
        {bookingDays.map((d) =>
        <div
          key={d.date}
          className={`flex flex-col items-center rounded-xl py-2 ${d.selected ? 'bg-ink text-white' : d.disabled ? 'text-subtle' : 'text-ink ring-1 ring-line'}`}>
          
            <span className="text-[10px] font-medium opacity-80">{d.day}</span>
            <span className="text-[15px] font-semibold">{d.date}</span>
          </div>
        )}
      </div>
      <div className="px-5 pt-5">
        <p className="text-[11px] font-medium text-muted">Morning</p>
        <p className="mt-1.5 rounded-xl bg-shell px-3 py-2 text-[11px] text-muted">Fully booked</p>
        <p className="mt-4 text-[11px] font-medium text-muted">Afternoon</p>
        <div className="mt-1.5 grid grid-cols-3 gap-1.5">
          {bookingSlots.afternoon.map((s) =>
          <span key={s.time} className={`rounded-xl py-2 text-center text-[12px] font-medium ${slotClass(s)}`}>
              {s.time}
            </span>
          )}
        </div>
        <p className="mt-4 text-[11px] font-medium text-muted">Evening</p>
        <div className="mt-1.5 grid grid-cols-3 gap-1.5">
          {bookingSlots.evening.map((s) =>
          <span key={s.time} className={`rounded-xl py-2 text-center text-[12px] font-medium ${slotClass(s)}`}>
              {s.time}
            </span>
          )}
        </div>
      </div>
      <div className="mt-auto border-t border-line p-4">
        <div className="flex h-12 items-center justify-between rounded-2xl bg-ink px-4 text-[13px] font-medium text-white">
          <span>Tue 29 Sep · 15:30</span>
          <span>Continue</span>
        </div>
      </div>
    </div>);

}