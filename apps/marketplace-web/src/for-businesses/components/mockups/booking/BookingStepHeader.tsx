import React from 'react';
import { ChevronLeftIcon, XIcon } from 'lucide-react';
import { StatusBar } from '../../ui/StatusBar';
import { bookingSalon } from '../../../data/booking';

type BookingStepHeaderProps = {
  step: number;
  title: string;
};

export function BookingStepHeader({ step, title }: BookingStepHeaderProps) {
  return (
    <div className="bg-white">
      <StatusBar />
      <div className="flex items-center justify-between px-5 pt-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-shell">
          <ChevronLeftIcon className="h-4 w-4" />
        </span>
        <span className="text-[12px] font-medium text-muted">{bookingSalon.name}</span>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-shell">
          <XIcon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-3 flex gap-1 px-5">
        {[1, 2, 3, 4].map((i) =>
        <span key={i} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-ink' : 'bg-line'}`} />
        )}
      </div>
      <p className="px-5 pt-4 text-[21px] font-semibold tracking-tight text-ink">{title}</p>
    </div>);

}