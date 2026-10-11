"use client";

import { useLayoutEffect, useRef, type CSSProperties } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  EndHour,
  StartHour,
  WeekCellsHeight,
  WeekGridColumns,
} from "@/components/event-calendar/constants";

const HOURS = EndHour - StartHour;

function ToolbarSkeleton() {
  return (
    <div className="flex shrink-0 items-center justify-between gap-4 px-4 py-4">
      <Skeleton className="h-7 w-40" />
      <div className="flex items-center gap-2">
        <div className="flex -space-x-1">
          <Skeleton className="size-6 rounded-full ring-2 ring-background" />
          <Skeleton className="size-6 rounded-full ring-2 ring-background" />
        </div>
        <Skeleton className="h-8 w-20 rounded-md" />
        <Skeleton className="size-8 rounded-md" />
        <Skeleton className="size-8 rounded-md" />
        <Skeleton className="h-8 w-36 rounded-md" />
        <Skeleton className="h-8 w-16 rounded-md" />
      </div>
    </div>
  );
}

export function WeekGridSkeleton() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const scroller = scrollRef.current;
    const grid = gridRef.current;
    if (!scroller || !grid) return;
    const now = new Date();
    const minutes = (now.getHours() - StartHour) * 60 + now.getMinutes();
    const span = (EndHour - StartHour) * 60;
    const ratio = Math.min(1, Math.max(0, minutes / span));
    scroller.scrollTop = Math.max(
      0,
      grid.offsetTop + ratio * grid.offsetHeight - scroller.clientHeight * 0.35,
    );
  }, []);

  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
      style={{ "--week-cells-height": `${WeekCellsHeight}px` } as CSSProperties}
      aria-hidden
    >
      <div
        className="grid h-14 shrink-0 border-b border-border/70"
        style={{ gridTemplateColumns: WeekGridColumns }}
      >
        <div className="flex items-end justify-center border-r border-border/70 pb-2">
          <Skeleton className="h-2.5 w-5" />
        </div>
        {Array.from({ length: 7 }, (_, day) => (
          <div
            key={day}
            className="flex h-14 flex-col items-center justify-center gap-0.5 border-r border-border/70 last:border-r-0"
          >
            <Skeleton className="h-2.5 w-6" />
            <Skeleton className="size-7 rounded-full" />
          </div>
        ))}
      </div>
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-hidden">
        <div className="grid" style={{ gridTemplateColumns: WeekGridColumns }}>
          <div className="border-r border-border/70">
            {Array.from({ length: HOURS }, (_, hour) => (
              <div
                key={hour}
                className="relative h-[var(--week-cells-height)] border-b border-border/70 last:border-b-0"
              >
                {hour > 0 ? (
                  <Skeleton className="absolute end-1.5 top-0 h-3 w-4 -translate-y-1/2" />
                ) : null}
              </div>
            ))}
          </div>
          {Array.from({ length: 7 }, (_, day) => (
            <div key={day} className="border-r border-border/70 last:border-r-0">
              {Array.from({ length: HOURS }, (_, hour) => (
                <div
                  key={hour}
                  className="h-[var(--week-cells-height)] border-b border-border/70 last:border-b-0"
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SidebarSkeleton() {
  return (
    <aside className="hidden h-svh w-64 shrink-0 flex-col px-3 py-3 md:flex">
      <div className="flex min-h-12 items-center justify-center">
        <Skeleton className="h-7 w-[116px] bg-background/70" />
      </div>
      <div className="mt-3 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto border-t pt-3">
        {Array.from({ length: 9 }, (_, item) => (
          <div key={item} className="flex h-8 items-center gap-2 rounded-md px-2">
            <Skeleton className="size-4 shrink-0 rounded-sm bg-background/70" />
            <Skeleton className="h-3.5 w-24 bg-background/70" />
          </div>
        ))}
        <div className="mt-3 border-t pt-4">
          <div className="mb-1 flex h-9 items-center justify-center">
            <Skeleton className="h-4 w-24 bg-background/70" />
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: 49 }, (_, day) => (
              <Skeleton key={day} className="mx-auto size-8 rounded-full bg-background/70" />
            ))}
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-2 pt-3">
        <Skeleton className="h-8 w-full bg-background/70" />
        <Skeleton className="h-8 w-full bg-background/70" />
        <div className="flex h-12 items-center gap-2 px-1">
          <Skeleton className="size-8 rounded-full bg-background/70" />
          <Skeleton className="h-3.5 w-28 bg-background/70" />
        </div>
      </div>
    </aside>
  );
}

export function CalendarShellSkeleton() {
  return (
    <div className="bg-sidebar flex h-svh w-full" aria-busy="true">
      <SidebarSkeleton />
      <div className="m-2 mb-[calc(3.5rem+0.5rem)] flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl bg-background shadow-sm md:mb-2">
        <ToolbarSkeleton />
        <WeekGridSkeleton />
      </div>
      <div className="bg-background fixed inset-x-0 bottom-0 grid h-14 grid-cols-4 border-t md:hidden">
        {Array.from({ length: 4 }, (_, item) => (
          <div key={item} className="flex flex-col items-center justify-center gap-1">
            <Skeleton className="size-5 rounded-sm" />
            <Skeleton className="h-2 w-10" />
          </div>
        ))}
      </div>
    </div>
  );
}
