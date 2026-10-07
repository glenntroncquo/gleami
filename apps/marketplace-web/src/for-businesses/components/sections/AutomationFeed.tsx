import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import { CalendarCheckIcon, BellIcon, CalendarXIcon, UsersIcon, MessageSquareIcon, RefreshCwIcon, BoxIcon } from "lucide-react";
import { automationEvents, AutomationKind } from "../../data/automation";
import { toneClasses, Tone } from "../../utils/tones";
import { easeOut } from "../../utils/motion";
const kindStyle: Record<AutomationKind, {
  icon: BoxIcon;
  tone: Tone;
}> = {
  confirmation: {
    icon: CalendarCheckIcon,
    tone: 'sage'
  },
  reminder: {
    icon: BellIcon,
    tone: 'sand'
  },
  cancellation: {
    icon: CalendarXIcon,
    tone: 'rose'
  },
  staff: {
    icon: UsersIcon,
    tone: 'sky'
  },
  message: {
    icon: MessageSquareIcon,
    tone: 'lilac'
  },
  reschedule: {
    icon: RefreshCwIcon,
    tone: 'sky'
  }
};
const VISIBLE = 4;
export function AutomationFeed() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, {
    margin: '-100px'
  });
  const reduce = useReducedMotion();
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    if (!inView || reduce) return;
    const id = window.setInterval(() => setOffset((o) => o + 1), 2600);
    return () => window.clearInterval(id);
  }, [inView, reduce]);
  const items = Array.from({
    length: VISIBLE
  }, (_, i) => {
    const index = (offset - i + automationEvents.length * 100) % automationEvents.length;
    return {
      ...automationEvents[index],
      key: offset - i
    };
  });
  return <div ref={ref} className="rounded-[28px] bg-shell p-2.5 md:p-4">
      <div className="rounded-[20px] bg-white p-5 shadow-soft ring-1 ring-line md:p-6">
        <div className="flex items-center justify-between">
          <p className="text-[15px] font-semibold text-ink">Activity</p>
          <span className="flex items-center gap-1.5 text-[12px] text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-sage-500" aria-hidden="true" />
            Running in the background
          </span>
        </div>
        <ul className="mt-5 h-[296px] overflow-hidden" aria-live="off">
          <AnimatePresence initial={false}>
            {items.map((item, i) => {
            const {
              icon: Icon,
              tone
            } = kindStyle[item.kind];
            const t = toneClasses[tone];
            return <motion.li key={item.key} layout={!reduce} initial={{
              opacity: 0,
              y: -12
            }} animate={{
              opacity: i === VISIBLE - 1 ? 0.45 : 1,
              y: 0
            }} exit={{
              opacity: 0
            }} transition={{
              duration: 0.25,
              ease: easeOut
            }} className="flex items-start gap-3.5 border-b border-line py-4 last:border-0">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${t.soft} ${t.text}`}>
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-[14px] font-semibold text-ink">{item.title}</p>
                      <span className="shrink-0 text-[11px] text-muted">{i === 0 ? 'Just now' : `${i * 3} min ago`}</span>
                    </div>
                    <p className="mt-0.5 truncate text-[13px] text-muted">{item.detail}</p>
                  </div>
                </motion.li>;
          })}
          </AnimatePresence>
        </ul>
      </div>
    </div>;
}