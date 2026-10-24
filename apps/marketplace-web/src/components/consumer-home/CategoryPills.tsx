"use client";

import { useEffect, useRef, type MouseEvent, type PointerEvent } from "react";

type CategoryPillsProps = {
  categories: Array<{ id: string | null; name: string }>;
  active: string | null;
  label: string;
  onChange: (id: string | null) => void;
};

const DRAG_THRESHOLD = 4;
const DRAG_SPEED = 1.45;
const FLICK_FRICTION = 0.92;

export function CategoryPills({ categories, active, label, onChange }: CategoryPillsProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const drag = useRef({
    pointerId: -1,
    startX: 0,
    scrollLeft: 0,
    moved: false,
    lastX: 0,
    lastTime: 0,
    velocity: 0,
  });
  const stopListening = useRef<(() => void) | null>(null);
  const momentum = useRef<number | null>(null);

  useEffect(
    () => () => {
      stopListening.current?.();
      if (momentum.current != null) cancelAnimationFrame(momentum.current);
    },
    [],
  );

  function stopMomentum() {
    if (momentum.current == null) return;
    cancelAnimationFrame(momentum.current);
    momentum.current = null;
  }

  function glide(velocity: number) {
    const el = scroller.current;
    if (!el || Math.abs(velocity) < 0.04) return;
    let previous = performance.now();
    const step = (now: number) => {
      const dt = Math.min(now - previous, 32);
      previous = now;
      velocity *= FLICK_FRICTION ** (dt / 16);
      el.scrollLeft += velocity * dt;
      const max = el.scrollWidth - el.clientWidth;
      if (Math.abs(velocity) < 0.04 || el.scrollLeft <= 0 || el.scrollLeft >= max) {
        momentum.current = null;
        return;
      }
      momentum.current = requestAnimationFrame(step);
    };
    momentum.current = requestAnimationFrame(step);
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    const node = scroller.current;
    if (!node || node.scrollWidth <= node.clientWidth) return;
    const el = node;

    stopMomentum();
    const pointerId = event.pointerId;
    const now = performance.now();
    drag.current = {
      pointerId,
      startX: event.clientX,
      scrollLeft: el.scrollLeft,
      moved: false,
      lastX: event.clientX,
      lastTime: now,
      velocity: 0,
    };

    function onPointerMove(move: globalThis.PointerEvent) {
      if (move.pointerId !== pointerId) return;
      const dx = move.clientX - drag.current.startX;
      if (!drag.current.moved && Math.abs(dx) <= DRAG_THRESHOLD) return;
      drag.current.moved = true;
      el.scrollLeft = drag.current.scrollLeft - dx * DRAG_SPEED;
      const time = performance.now();
      const dt = time - drag.current.lastTime;
      if (dt > 0) {
        drag.current.velocity = ((drag.current.lastX - move.clientX) / dt) * DRAG_SPEED;
      }
      drag.current.lastX = move.clientX;
      drag.current.lastTime = time;
      if (!el.hasPointerCapture(pointerId)) el.setPointerCapture(pointerId);
    }

    function onPointerEnd(end: globalThis.PointerEvent) {
      if (end.pointerId !== pointerId) return;
      stopListening.current?.();
      stopListening.current = null;
      if (el.hasPointerCapture(pointerId)) el.releasePointerCapture(pointerId);
      const stale = performance.now() - drag.current.lastTime > 50;
      const velocity = stale ? 0 : drag.current.velocity;
      drag.current.pointerId = -1;
      glide(velocity);
    }

    stopListening.current?.();
    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerEnd);
    document.addEventListener("pointercancel", onPointerEnd);
    stopListening.current = () => {
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerEnd);
      document.removeEventListener("pointercancel", onPointerEnd);
    };
  }

  function onClickCapture(event: MouseEvent<HTMLDivElement>) {
    if (!drag.current.moved) return;
    event.preventDefault();
    event.stopPropagation();
    drag.current.moved = false;
  }

  return (
    <div
      ref={scroller}
      className="no-scrollbar -mx-5 cursor-grab overflow-x-auto px-5 select-none active:cursor-grabbing md:mx-0 md:px-0 [&_button]:cursor-grab [&_button]:active:cursor-grabbing"
      role="group"
      aria-label={label}
      onPointerDown={onPointerDown}
      onClickCapture={onClickCapture}
    >
      <div className="flex w-max gap-2">
        {categories.map((category) => {
          const isActive = category.id === active;
          return (
            <button
              key={category.id ?? "all"}
              type="button"
              aria-pressed={isActive}
              onClick={() => onChange(category.id)}
              className={`whitespace-nowrap rounded-full px-5 py-2.5 text-[15px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peri focus-visible:ring-offset-2 focus-visible:ring-offset-page ${
                isActive ? "bg-navy text-white" : "bg-surface text-navy hover:bg-peri-soft"
              }`}
            >
              {category.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
