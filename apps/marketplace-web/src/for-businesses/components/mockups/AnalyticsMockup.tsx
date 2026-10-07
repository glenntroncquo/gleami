import React from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { analyticsKpis, appointmentsByWeekday, popularTreatments, revenueByDay, staffActivity } from '../../data/analytics';
import { toneClasses } from '../../utils/tones';

const INK = '#0B1C3F';
const ROSE = '#5B7CF0';
const LINE = '#E5E8F1';
const SUBTLE = '#7F87A2';

function Ring({ value }: {value: number;}) {
  const r = 44;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 110 110" className="h-[110px] w-[110px] -rotate-90">
      <circle cx="55" cy="55" r={r} fill="none" stroke={LINE} strokeWidth="10" />
      <circle cx="55" cy="55" r={r} fill="none" stroke={INK} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${value / 100 * c} ${c}`} />
    </svg>);

}

export function AnalyticsMockup() {
  const maxTreatment = Math.max(...popularTreatments.map((t) => t.count));
  return (
    <div role="img" aria-label="Gleami insights dashboard with revenue trend, occupancy, returning clients, popular treatments and staff activity" className="w-full bg-white text-ink">
      <div className="flex items-center justify-between border-b border-line px-6 py-4">
        <div>
          <p className="text-[16px] font-semibold tracking-tight">Insights</p>
          <p className="text-[12px] text-muted">September 2026</p>
        </div>
        <div className="flex rounded-lg bg-shell p-0.5 text-[12px] font-medium">
          <span className="px-3 py-1 text-muted">Week</span>
          <span className="rounded-md bg-white px-3 py-1 shadow-soft">Month</span>
          <span className="px-3 py-1 text-muted">Year</span>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 bg-canvas p-5">
        <div className="col-span-8 rounded-2xl bg-white p-5 ring-1 ring-line">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[12px] text-muted">Revenue</p>
              <p className="mt-1 text-[36px] font-semibold leading-none tracking-tightest">{analyticsKpis.revenue}</p>
            </div>
            <div className="text-right">
              <p className="text-[12px] text-muted">Appointments</p>
              <p className="mt-1 text-[20px] font-semibold tracking-tight">{analyticsKpis.appointments}</p>
            </div>
          </div>
          <AreaChart width={660} height={200} data={revenueByDay} margin={{ top: 20, right: 4, left: -18, bottom: 0 }}>
            <CartesianGrid stroke={LINE} vertical={false} />
            <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: SUBTLE }} interval={6} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: SUBTLE }} tickFormatter={(v: number) => `€${v}`} />
            <Area type="monotone" dataKey="value" stroke={ROSE} strokeWidth={2} fill={ROSE} fillOpacity={0.1} isAnimationActive={false} />
          </AreaChart>
        </div>

        <div className="col-span-4 grid gap-4">
          <div className="flex items-center gap-4 rounded-2xl bg-white p-5 ring-1 ring-line">
            <div className="relative">
              <Ring value={analyticsKpis.occupancy} />
              <span className="absolute inset-0 flex items-center justify-center text-[20px] font-semibold tracking-tight">
                {analyticsKpis.occupancy}%
              </span>
            </div>
            <div>
              <p className="text-[14px] font-semibold">Occupancy</p>
              <p className="mt-1 text-[12px] leading-snug text-muted">Share of available time that was booked.</p>
            </div>
          </div>
          <div className="rounded-2xl bg-white p-5 ring-1 ring-line">
            <div className="flex items-baseline justify-between">
              <p className="text-[14px] font-semibold">Returning clients</p>
              <p className="text-[20px] font-semibold tracking-tight">{analyticsKpis.returning}%</p>
            </div>
            <div className="mt-3 flex h-2.5 overflow-hidden rounded-full">
              <span className="bg-ink" style={{ width: `${analyticsKpis.returning}%` }} />
              <span className="flex-1 bg-rose-200" />
            </div>
            <div className="mt-2 flex justify-between text-[11px] text-muted">
              <span>Returning</span>
              <span>New</span>
            </div>
          </div>
        </div>

        <div className="col-span-5 rounded-2xl bg-white p-5 ring-1 ring-line">
          <p className="text-[14px] font-semibold">Popular treatments</p>
          <ul className="mt-4 space-y-3">
            {popularTreatments.map((t, i) =>
            <li key={t.name}>
                <div className="flex justify-between text-[12px]">
                  <span>{t.name}</span>
                  <span className="text-muted">{t.count}</span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-shell">
                  <div className={`h-full rounded-full ${i === 0 ? 'bg-rose-400' : 'bg-ink/70'}`} style={{ width: `${t.count / maxTreatment * 100}%` }} />
                </div>
              </li>
            )}
          </ul>
        </div>

        <div className="col-span-4 rounded-2xl bg-white p-5 ring-1 ring-line">
          <p className="text-[14px] font-semibold">Appointments by day</p>
          <BarChart width={300} height={170} data={appointmentsByWeekday} margin={{ top: 16, right: 0, left: -28, bottom: 0 }}>
            <CartesianGrid stroke={LINE} vertical={false} />
            <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: SUBTLE }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: SUBTLE }} />
            <Bar dataKey="value" fill={INK} radius={[6, 6, 0, 0]} barSize={26} isAnimationActive={false} />
          </BarChart>
        </div>

        <div className="col-span-3 rounded-2xl bg-white p-5 ring-1 ring-line">
          <p className="text-[14px] font-semibold">Staff activity</p>
          <ul className="mt-4 space-y-3.5">
            {staffActivity.map((s) =>
            <li key={s.name}>
                <div className="flex justify-between text-[12px]">
                  <span>{s.name}</span>
                  <span className="text-muted">{Math.round(s.value * 100)}%</span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-shell">
                  <div className={`h-full rounded-full ${toneClasses[s.tone].bar}`} style={{ width: `${s.value * 100}%` }} />
                </div>
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>);

}