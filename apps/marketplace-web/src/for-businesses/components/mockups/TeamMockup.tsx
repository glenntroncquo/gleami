import React from 'react';
import { PlusIcon, CalendarDaysIcon, ScissorsIcon, ShieldCheckIcon, TrendingUpIcon } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { teamMembers, teamPerformance, teamPermissions, teamTreatments, teamWeek } from '../../data/team';

const TRACK_START = 8;
const TRACK_HOURS = 12;

export function TeamMockup() {
  return (
    <div
      role="img"
      aria-label="Gleami team management with employee profile, weekly schedule, treatments, permissions and performance"
      className="flex w-full bg-white text-ink">
      
      <aside className="w-[280px] shrink-0 border-r border-line bg-canvas p-5">
        <div className="flex items-center justify-between">
          <p className="text-[15px] font-semibold">Team</p>
          <span className="flex h-8 items-center gap-1 rounded-lg bg-white px-2.5 text-[12px] font-medium ring-1 ring-line">
            <PlusIcon className="h-3.5 w-3.5" />
            Invite
          </span>
        </div>
        <ul className="mt-5 space-y-1">
          {teamMembers.map((m) =>
          <li
            key={m.name}
            className={`flex items-center gap-3 rounded-xl p-2.5 ${m.selected ? 'bg-white shadow-soft ring-1 ring-line' : ''}`}>
            
              <Avatar name={m.name} tone={m.tone} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold">{m.name}</p>
                <p className="truncate text-[11px] text-muted">{m.role}</p>
              </div>
              <span className={`h-2 w-2 rounded-full ${m.working ? 'bg-sage-500' : 'bg-line-strong'}`} />
            </li>
          )}
        </ul>
      </aside>

      <div className="min-w-0 flex-1 p-6">
        <div className="flex items-center gap-4">
          <Avatar name="Emma Vermeulen" tone="rose" size="xl" />
          <div className="flex-1">
            <p className="text-[20px] font-semibold tracking-tight">Emma Vermeulen</p>
            <p className="text-[13px] text-muted">Senior stylist · Full-time</p>
          </div>
          <Badge tone="lilac">Role: Stylist</Badge>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="rounded-2xl p-4 ring-1 ring-line">
            <p className="flex items-center gap-1.5 text-[12px] font-semibold">
              <CalendarDaysIcon className="h-3.5 w-3.5 text-muted" />
              Working hours
            </p>
            <ul className="mt-3 space-y-2">
              {teamWeek.map((d) => {
                const off = d.end === 0;
                return (
                  <li key={d.day} className="flex items-center gap-3 text-[11px]">
                    <span className="w-7 text-muted">{d.day}</span>
                    <div className="relative h-2 flex-1 rounded-full bg-shell">
                      {!off &&
                      <span
                        className="absolute inset-y-0 rounded-full bg-rose-300"
                        style={{
                          left: `${(d.start - TRACK_START) / TRACK_HOURS * 100}%`,
                          width: `${(d.end - d.start) / TRACK_HOURS * 100}%`
                        }} />

                      }
                    </div>
                    <span className="w-16 text-right text-ink/80">{off ? 'Off' : `${d.start}:00–${d.end}:00`}</span>
                  </li>);

              })}
            </ul>
          </div>

          <div className="rounded-2xl p-4 ring-1 ring-line">
            <p className="flex items-center gap-1.5 text-[12px] font-semibold">
              <ShieldCheckIcon className="h-3.5 w-3.5 text-muted" />
              Permissions
            </p>
            <ul className="mt-3 space-y-2.5">
              {teamPermissions.map((p) =>
              <li key={p.label} className="flex items-center justify-between text-[12px]">
                  <span className={p.on ? 'text-ink' : 'text-muted'}>{p.label}</span>
                  <span className={`relative h-[18px] w-8 rounded-full ${p.on ? 'bg-ink' : 'bg-line-strong'}`}>
                    <span
                    className={`absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white ${p.on ? 'left-[16px]' : 'left-[2px]'}`} />
                  
                  </span>
                </li>
              )}
            </ul>
          </div>

          <div className="rounded-2xl p-4 ring-1 ring-line">
            <p className="flex items-center gap-1.5 text-[12px] font-semibold">
              <ScissorsIcon className="h-3.5 w-3.5 text-muted" />
              Treatments Emma performs
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {teamTreatments.map((t) =>
              <span key={t} className="rounded-full bg-rose-50 px-2.5 py-1 text-[11px] text-rose-700">
                  {t}
                </span>
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-canvas p-4">
            <p className="flex items-center gap-1.5 text-[12px] font-semibold">
              <TrendingUpIcon className="h-3.5 w-3.5 text-muted" />
              September
            </p>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {teamPerformance.map((s) =>
              <div key={s.label}>
                  <p className="text-[22px] font-semibold tracking-tight">{s.value}</p>
                  <p className="text-[11px] text-muted">{s.label}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>);

}