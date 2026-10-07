import React, { useEffect, useRef, useState } from 'react';
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform
} from 'framer-motion';
import { ChevronLeftIcon, ChevronRightIcon, GlobeIcon, PhoneIcon, StickyNoteIcon } from 'lucide-react';
import { AppointmentBlock } from './AppointmentBlock';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import {
  movingAppointment,
  movingTarget,
  popoverAppointment,
  scheduleAppointments,
  scheduleStaff,
  weekOverview } from
'../../data/schedule';
import { toMinutes } from '../../utils/time';
import { easeInOut, easeOut } from '../../utils/motion';

const HOUR = 76;
const START_HOUR = 12;
const HOURS = 5;

const topFor = (time: string) => (toMinutes(time) - START_HOUR * 60) / 60 * HOUR;

type Phase = 'idle' | 'lift' | 'done';

const legend = [
{ label: 'Confirmed', className: 'bg-rose-50 border-l-[3px] border-rose-400' },
{ label: 'In progress', className: 'bg-sage-100 border-l-[3px] border-sage-400' },
{ label: 'Pending', className: 'bg-white border border-dashed border-sky-400' },
{ label: 'Completed', className: 'bg-sky-50 border-l-[3px] border-sky-400 opacity-60' }];


export function ScheduleMockup() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<Phase>('idle');
  const phaseRef = useRef<Phase>('idle');
  const scrollProgress = useMotionValue(0);
  const undoProgress = useMotionValue(1);
  const movementProgress = useTransform(
    [scrollProgress, undoProgress],
    ([scroll, undo]) => Number(scroll) * Number(undo)
  );

  useEffect(() => {
    const update = () => {
      const calendar = ref.current;
      if (!calendar || window.innerHeight === 0) return;
      const start = window.innerHeight * 0.92;
      const end = window.innerHeight * 0.18;
      const progress = Math.min(
        1,
        Math.max(0, (start - calendar.getBoundingClientRect().top) / (start - end))
      );
      calendar.dataset.calendarScrollProgress = progress.toFixed(3);
      scrollProgress.set(reduce ? progress >= 0.5 ? 1 : 0 : progress);
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [reduce, scrollProgress]);

  const originalTop = topFor(movingAppointment.start);
  const targetTop = topFor(movingTarget);
  const movingTop = useTransform(movementProgress, [0, 1], [originalTop, targetTop]);
  const movingScale = useTransform(
    movementProgress,
    [0, 0.08, 0.9, 1],
    [1, 1.03, 1.03, 1]
  );

  useMotionValueEvent(movementProgress, 'change', (latest) => {
    const nextPhase: Phase =
    latest >= 0.98 ? 'done' : latest > 0.02 ? 'lift' : 'idle';
    if (nextPhase !== phaseRef.current) {
      phaseRef.current = nextPhase;
      setPhase(nextPhase);
    }
  });

  useMotionValueEvent(scrollProgress, 'change', (latest) => {
    if (latest <= 0.01 && undoProgress.get() < 1) {
      undoProgress.set(1);
    }
  });

  const undoMove = () => {
    if (reduce) {
      undoProgress.set(0);
      return;
    }
    animate(undoProgress, 0, {
      duration: 0.45,
      ease: easeInOut
    });
  };

  const hours = Array.from({ length: HOURS }, (_, i) => START_HOUR + i);
  const moved = phase === 'done';
  const movingHeight = movingAppointment.duration / 60 * HOUR;
  const p = popoverAppointment;

  return (
    <div
      ref={ref}
      role="group"
      data-calendar-phase={phase}
      aria-label="Gleami calendar: an appointment being dragged to a new time, with client details open"
      className="flex w-full bg-white text-ink">
      
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-16 items-center gap-3 border-b border-line px-6">
          <span className="flex items-center gap-1 text-muted">
            <ChevronLeftIcon className="h-4 w-4" />
            <ChevronRightIcon className="h-4 w-4" />
          </span>
          <p className="text-[15px] font-semibold tracking-tight">Tuesday, 29 September</p>
          <div className="ml-auto flex rounded-lg bg-shell p-0.5 text-[12px] font-medium">
            <span className="rounded-md bg-white px-3 py-1 shadow-soft">Day</span>
            <span className="px-3 py-1 text-muted">Week</span>
          </div>
        </div>
        <div className="grid border-b border-line" style={{ gridTemplateColumns: '56px repeat(3, minmax(0, 1fr))' }}>
          <div />
          {scheduleStaff.map((s) =>
          <div key={s.id} className="flex items-center gap-2.5 border-l border-line px-3 py-3">
              <Avatar name={s.name} tone={s.tone} size="sm" />
              <div>
                <p className="text-[13px] font-semibold">{s.name}</p>
                <p className="text-[11px] text-muted">{s.hours}</p>
              </div>
            </div>
          )}
        </div>
        <div
          className="relative grid"
          style={{ gridTemplateColumns: '56px repeat(3, minmax(0, 1fr))', height: HOURS * HOUR }}>
          
          {hours.map((h, i) =>
          <div key={h} className="pointer-events-none absolute inset-x-0" style={{ top: i * HOUR }}>
              <div className="border-t border-line" />
              <span className="absolute left-3 top-1 text-[11px] text-subtle">{h}:00</span>
              <div className="absolute left-14 right-0 border-t border-dashed border-line/70" style={{ top: HOUR / 2 }} />
            </div>
          )}
          <div />
          {scheduleStaff.map((s) =>
          <div key={s.id} className="relative border-l border-line">
              {scheduleAppointments.
            filter((a) => a.staffId === s.id).
            map((a) =>
            <AppointmentBlock
              key={a.id}
              appointment={a}
              tone={s.tone}
              top={topFor(a.start)}
              height={a.duration / 60 * HOUR}
              selected={a.id === p.id} />

            )}

              {s.id === 'emma' &&
            <>
                  {phase !== 'idle' &&
              <div
                className="absolute inset-x-1 rounded-lg border border-dashed border-rose-300 bg-rose-50/40"
                style={{ top: topFor(movingAppointment.start) + 2, height: movingHeight - 4 }} />

              }
                  <motion.div
                className="absolute inset-x-0"
                data-calendar-moving-appointment
                style={{ height: movingHeight, top: movingTop, scale: movingScale }}>
                
                    <AppointmentBlock
                  appointment={{ ...movingAppointment, start: moved ? movingTarget : movingAppointment.start }}
                  tone="rose"
                  top={0}
                  height={movingHeight}
                  lifted={phase === 'lift'} />
                
                  </motion.div>
                </>
            }

              {s.id === 'sofia' &&
            <div
              className="absolute right-full top-[118px] z-30 mr-2 w-[252px] rounded-2xl bg-white p-4 shadow-float ring-1 ring-line">
              
                  <div className="flex items-center gap-3">
                    <Avatar name={p.client} tone="sage" size="md" />
                    <div>
                      <p className="text-[14px] font-semibold">{p.client}</p>
                      <p className="text-[11px] text-muted">{p.visits}</p>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1.5 text-[12px]">
                    <div className="flex justify-between">
                      <span className="text-muted">Treatment</span>
                      <span className="font-medium">{p.treatment}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Time</span>
                      <span className="font-medium">{p.time}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Duration</span>
                      <span className="font-medium">{p.duration}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted">Status</span>
                      <Badge tone="sage" dot>
                        Confirmed
                      </Badge>
                    </div>
                  </div>
                  <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-sand-50 p-2 text-[11px] text-ink/80">
                    <StickyNoteIcon className="mt-0.5 h-3 w-3 shrink-0 text-sand-700" />
                    {p.note}
                  </p>
                  <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted">
                    <PhoneIcon className="h-3 w-3" />
                    {p.phone}
                  </p>
                </div>
            }
            </div>
          )}

          <AnimatePresence>
            {phase === 'done' &&
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.22, ease: easeOut }}
              aria-live="polite"
              className="absolute bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 whitespace-nowrap rounded-full bg-ink py-2 pl-4 pr-2 text-[12px] text-white shadow-float">
              
                Anna Claes moved to 15:45 · client notified
                <button
                  type="button"
                  aria-label="Undo appointment move"
                  data-calendar-undo
                  onClick={undoMove}
                  className="rounded-full bg-white/10 px-2.5 py-1 font-medium text-rose-200 transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
                  
                  Undo
                </button>
              </motion.div>
            }
          </AnimatePresence>
        </div>
      </div>

      <aside className="w-[290px] shrink-0 border-l border-line bg-canvas p-5">
        <p className="text-[13px] font-semibold">This week</p>
        <ul className="mt-4 space-y-2.5">
          {weekOverview.map((d) =>
          <li
            key={d.day}
            className={`flex items-center gap-3 rounded-xl px-3 py-2 ${d.today ? 'bg-white shadow-soft ring-1 ring-line' : ''}`}>
            
              <div className="w-10">
                <p className="text-[10px] text-muted">{d.day}</p>
                <p className="text-[14px] font-semibold">{d.date}</p>
              </div>
              {d.closed ?
            <p className="flex-1 text-[11px] text-muted">Closed</p> :

            <>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                    <div
                  className={`h-full rounded-full ${d.today ? 'bg-rose-400' : 'bg-ink/60'}`}
                  style={{ width: `${d.load * 100}%` }} />
                
                  </div>
                  <p className="w-6 text-right text-[11px] font-medium text-muted">{d.count}</p>
                </>
            }
            </li>
          )}
        </ul>
        <div className="mt-6 border-t border-line pt-4">
          <p className="text-[11px] font-medium text-muted">Status</p>
          <ul className="mt-3 grid grid-cols-2 gap-2.5">
            {legend.map((l) =>
            <li key={l.label} className="flex items-center gap-2 text-[11px] text-ink">
                <span className={`h-3.5 w-5 rounded ${l.className}`} />
                {l.label}
              </li>
            )}
            <li className="flex items-center gap-2 text-[11px] text-ink">
              <GlobeIcon className="h-3.5 w-5 text-muted" />
              Booked online
            </li>
          </ul>
        </div>
      </aside>
    </div>);

}