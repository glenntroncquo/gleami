import React from 'react';
import { CalendarIcon, MailIcon, PhoneIcon, StickyNoteIcon, EllipsisIcon } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { clientHistory, clientProfile as c } from '../../data/clientProfile';

const tabs = ['Overview', 'History', 'Notes', 'Purchases'];

export function ClientProfileMockup() {
  return (
    <div
      role="img"
      aria-label="Gleami client profile with contact details, visit history, notes and upcoming appointment"
      className="flex w-full bg-white text-ink">
      
      <aside className="w-[270px] shrink-0 border-r border-line bg-canvas p-6">
        <Avatar name={c.name} tone="rose" size="xl" />
        <p className="mt-4 text-[18px] font-semibold tracking-tight">{c.name}</p>
        <p className="text-[12px] text-muted">{c.since}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {c.tags.map((t, i) =>
          <Badge key={t} tone={i === 0 ? 'rose' : 'neutral'}>
              {t}
            </Badge>
          )}
        </div>
        <div className="mt-5 space-y-2 text-[12px]">
          <p className="flex items-center gap-2 text-ink/80">
            <PhoneIcon className="h-3.5 w-3.5 text-muted" />
            {c.phone}
          </p>
          <p className="flex items-center gap-2 text-ink/80">
            <MailIcon className="h-3.5 w-3.5 text-muted" />
            {c.email}
          </p>
        </div>
        <div className="mt-6 grid grid-cols-3 gap-2 border-t border-line pt-5">
          {c.stats.map((s) =>
          <div key={s.label}>
              <p className="text-[16px] font-semibold tracking-tight">{s.value}</p>
              <p className="text-[10px] text-muted">{s.label}</p>
            </div>
          )}
        </div>
        <div className="mt-6 border-t border-line pt-5">
          <p className="text-[11px] font-medium text-muted">Favourite treatments</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {c.preferred.map((p) =>
            <span key={p} className="rounded-full bg-white px-2.5 py-1 text-[11px] ring-1 ring-line">
                {p}
              </span>
            )}
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1 p-6">
        <div className="flex items-center justify-between border-b border-line">
          <div className="flex gap-5 text-[13px]">
            {tabs.map((t, i) =>
            <span
              key={t}
              className={`-mb-px pb-3 ${i === 0 ? 'border-b-2 border-ink font-semibold text-ink' : 'text-muted'}`}>
              
                {t}
              </span>
            )}
          </div>
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-8 items-center rounded-lg bg-ink px-3 text-[12px] font-medium text-white">Book again</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg ring-1 ring-line">
              <EllipsisIcon className="h-4 w-4 text-muted" />
            </span>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-rose-50 p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-700">
              <CalendarIcon className="h-3.5 w-3.5" />
              Upcoming
            </p>
            <p className="mt-2 text-[15px] font-semibold">{c.upcoming.date}</p>
            <p className="text-[12px] text-ink/70">
              {c.upcoming.treatment} · {c.upcoming.duration}
            </p>
            <Badge tone="sage" dot className="mt-3 bg-white">
              Confirmed
            </Badge>
          </div>
          <div className="rounded-2xl bg-sand-50 p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-sand-700">
              <StickyNoteIcon className="h-3.5 w-3.5" />
              Note
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-ink/85">{c.note.text}</p>
            <p className="mt-2 text-[11px] text-muted">{c.note.author}</p>
          </div>
        </div>

        <p className="mt-6 text-[13px] font-semibold">Recent history</p>
        <table className="mt-2 w-full text-left text-[12px]">
          <thead>
            <tr className="text-muted">
              <th className="py-2 font-medium">Date</th>
              <th className="py-2 font-medium">Item</th>
              <th className="py-2 font-medium">Professional</th>
              <th className="py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {clientHistory.map((h) =>
            <tr key={`${h.date}-${h.item}`} className="border-t border-line">
                <td className="py-2.5 text-muted">{h.date}</td>
                <td className="py-2.5">
                  <span className="font-medium">{h.item}</span>
                  {h.type === 'Product' && <span className="ml-2 text-[10px] text-muted">Product</span>}
                </td>
                <td className="py-2.5 text-ink/80">{h.by}</td>
                <td className="py-2.5 text-right font-medium">{h.amount}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>);

}