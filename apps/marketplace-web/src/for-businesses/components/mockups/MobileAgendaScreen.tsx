import React from 'react';
import { CalendarDaysIcon, UsersIcon, TrendingUpIcon, MenuIcon, PlusIcon } from 'lucide-react';
import { StatusBar } from '../ui/StatusBar';
import { toneClasses } from '../../utils/tones';

const upNext = [
{ time: '12:30', client: 'Julie Peeters', treatment: 'Blow-dry · Emma', tone: 'rose' as const },
{ time: '13:00', client: 'Victor Dubois', treatment: 'Classic cut · Lucas', tone: 'sky' as const },
{ time: '13:00', client: 'Fien Aerts', treatment: 'Lash extensions · Mila', tone: 'lilac' as const },
{ time: '13:30', client: 'Laura Goossens', treatment: 'Nail art set · Sofia', tone: 'sage' as const }];


const tabs = [
{ label: 'Calendar', icon: CalendarDaysIcon, active: true },
{ label: 'Clients', icon: UsersIcon },
{ label: 'Insights', icon: TrendingUpIcon },
{ label: 'More', icon: MenuIcon }];


export function MobileAgendaScreen() {
  return (
    <div className="flex h-full flex-col bg-canvas">
      <StatusBar />
      <div className="px-5 pt-3">
        <p className="text-[12px] text-muted">Tuesday 29 September</p>
        <p className="text-[22px] font-semibold tracking-tight text-ink">Good morning, Noor</p>
      </div>
      <div className="mx-5 mt-4 rounded-2xl bg-ink p-4 text-white">
        <p className="text-[11px] text-white/60">Today so far</p>
        <div className="mt-1 flex items-end justify-between">
          <p className="text-[26px] font-semibold tracking-tight">€1,284</p>
          <p className="text-[11px] text-white/70">19 appointments</p>
        </div>
        <div className="mt-3 h-1.5 rounded-full bg-white/15">
          <div className="h-full w-[86%] rounded-full bg-rose-300" />
        </div>
        <p className="mt-1.5 text-[10px] text-white/60">86% booked</p>
      </div>
      <div className="flex items-center justify-between px-5 pt-5">
        <p className="text-[13px] font-semibold text-ink">Up next</p>
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-white">
          <PlusIcon className="h-3.5 w-3.5" />
        </span>
      </div>
      <ul className="mt-2 space-y-2 px-5">
        {upNext.map((a) =>
        <li key={a.client} className="flex items-center gap-3 rounded-xl bg-white p-3 ring-1 ring-line">
            <span className={`h-9 w-1 rounded-full ${toneClasses[a.tone].dot}`} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-semibold text-ink">{a.client}</p>
              <p className="truncate text-[10.5px] text-muted">{a.treatment}</p>
            </div>
            <span className="text-[12px] font-medium text-ink">{a.time}</span>
          </li>
        )}
      </ul>
      <div className="mt-auto grid grid-cols-4 border-t border-line bg-white px-2 pb-5 pt-2">
        {tabs.map(({ label, icon: Icon, active }) =>
        <span key={label} className={`flex flex-col items-center gap-0.5 text-[9.5px] ${active ? 'font-semibold text-ink' : 'text-subtle'}`}>
            <Icon className="h-4 w-4" />
            {label}
          </span>
        )}
      </div>
    </div>);

}