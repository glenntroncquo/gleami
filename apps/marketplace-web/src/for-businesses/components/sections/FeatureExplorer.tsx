import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDaysIcon, GlobeIcon, UsersIcon, UserRoundIcon, ScissorsIcon, CreditCardIcon, PackageIcon, TrendingUpIcon, SearchIcon, PlusIcon, BoxIcon } from "lucide-react";
import { Avatar } from "../ui/Avatar";
import { Badge } from "../ui/Badge";
import { features, Feature } from "../../data/features";
import { easeOut } from "../../utils/motion";
const icons: Record<Feature['id'], BoxIcon> = {
  calendar: CalendarDaysIcon,
  booking: GlobeIcon,
  clients: UsersIcon,
  staff: UserRoundIcon,
  treatments: ScissorsIcon,
  payments: CreditCardIcon,
  inventory: PackageIcon,
  insights: TrendingUpIcon
};
export function FeatureExplorer() {
  const [activeId, setActiveId] = useState<Feature['id']>(features[0].id);
  const active = features.find((f) => f.id === activeId) ?? features[0];
  const ActiveIcon = icons[active.id];
  return <div className="grid gap-8 lg:grid-cols-12 lg:gap-16">
      <div className="lg:hidden">
        <div className="no-scrollbar -mx-5 overflow-x-auto px-5">
          <div role="tablist" aria-label="Gleami features" className="flex w-max gap-2">
            {features.map((f) => {
            const isActive = f.id === activeId;
            return <button key={f.id} role="tab" type="button" aria-selected={isActive} aria-controls="feature-panel" onClick={() => setActiveId(f.id)} className={`whitespace-nowrap rounded-full px-4 py-2 text-[14px] font-medium transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 ${isActive ? 'bg-ink text-white' : 'bg-shell text-ink/70 hover:text-ink'}`}>
                  {f.name}
                </button>;
          })}
          </div>
        </div>
        <p className="mt-5 text-[16px] leading-relaxed text-muted">{active.description}</p>
      </div>

      <div role="tablist" aria-orientation="vertical" aria-label="Gleami features" className="hidden lg:col-span-5 lg:block">
        {features.map((f) => {
        const Icon = icons[f.id];
        const isActive = f.id === activeId;
        return <button key={f.id} role="tab" type="button" aria-selected={isActive} aria-controls="feature-panel" onClick={() => setActiveId(f.id)} className="group block w-full border-t border-line py-4 text-left last:border-b focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-rose-500">
              <span className="flex items-center gap-4">
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors duration-150 ease-out ${isActive ? 'bg-ink text-white' : 'bg-shell text-muted group-hover:text-ink'}`}>
                  <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
                <span className={`text-[18px] font-medium tracking-tight transition-colors duration-150 ease-out ${isActive ? 'text-ink' : 'text-ink/60 group-hover:text-ink'}`}>
                  {f.name}
                </span>
              </span>
              <AnimatePresence initial={false}>
                {isActive && <motion.span initial={{
              height: 0,
              opacity: 0
            }} animate={{
              height: 'auto',
              opacity: 1
            }} exit={{
              height: 0,
              opacity: 0
            }} transition={{
              duration: 0.22,
              ease: easeOut
            }} className="block overflow-hidden">
                    <span className="block pb-1 pl-14 pt-2 text-[15px] leading-relaxed text-muted">{f.description}</span>
                  </motion.span>}
              </AnimatePresence>
            </button>;
      })}
      </div>

      <div className="lg:col-span-7">
        <div className="lg:sticky lg:top-24">
          <div id="feature-panel" role="tabpanel" aria-label={active.name} className="rounded-[28px] bg-shell p-2.5 md:p-4">
            <div className="overflow-hidden rounded-[20px] bg-white shadow-soft ring-1 ring-line">
              <div className="flex items-center justify-between border-b border-line px-5 py-4 md:px-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-700">
                    <ActiveIcon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-[15px] font-semibold text-ink">{active.panelTitle}</p>
                    <p className="text-[12px] text-muted">{active.panelMeta}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2" aria-hidden="true">
                  <span className="hidden h-8 w-8 items-center justify-center rounded-lg ring-1 ring-line sm:flex">
                    <SearchIcon className="h-4 w-4 text-muted" />
                  </span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-white">
                    <PlusIcon className="h-4 w-4" />
                  </span>
                </div>
              </div>

              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={active.id} initial={{
                opacity: 0,
                y: 6
              }} animate={{
                opacity: 1,
                y: 0
              }} exit={{
                opacity: 0,
                y: -4
              }} transition={{
                duration: 0.18,
                ease: easeOut
              }} className="min-h-[400px] px-5 pb-4 pt-6 md:px-6">
                  <p className="text-[40px] font-semibold leading-none tracking-tightest text-ink">{active.highlight.value}</p>
                  <p className="mt-2 text-[14px] text-muted">{active.highlight.label}</p>
                  <ul className="mt-6">
                    {active.rows.map((row) => <li key={row.primary} className="flex items-center gap-3.5 border-t border-line py-3.5">
                        {active.rowStyle === 'avatar' && <Avatar name={row.primary} tone={row.tone ?? 'neutral'} size="sm" />}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-medium text-ink">{row.primary}</p>
                          <p className="truncate text-[12px] text-muted">{row.secondary}</p>
                          {row.progress !== undefined && <div className="mt-2 h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-shell">
                              <div className={`h-full rounded-full ${row.progress < 0.35 ? 'bg-rose-400' : 'bg-ink/70'}`} style={{
                          width: `${row.progress * 100}%`
                        }} />
                            </div>}
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          {row.meta && <span className="text-[13px] font-medium text-ink">{row.meta}</span>}
                          {row.badge && <Badge tone={row.badge.tone}>{row.badge.label}</Badge>}
                        </div>
                      </li>)}
                  </ul>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
          <p className="mt-3 text-center text-[12px] text-muted">Product visuals use illustrative data.</p>
        </div>
      </div>
    </div>;
}