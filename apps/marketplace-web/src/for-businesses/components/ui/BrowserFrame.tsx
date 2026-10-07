import React from 'react';
import { LockIcon } from 'lucide-react';

type BrowserFrameProps = {
  url: string;
  children: React.ReactNode;
};

export function BrowserFrame({ url, children }: BrowserFrameProps) {
  return (
    <div className="overflow-hidden rounded-[14px] bg-white ring-1 ring-line md:rounded-[18px]">
      <div className="flex h-10 items-center gap-3 border-b border-line bg-canvas px-4">
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
          <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
          <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
        </div>
        <div className="mx-auto flex h-6 min-w-0 max-w-xs flex-1 items-center justify-center gap-1.5 rounded-md bg-white px-3 text-[11px] text-muted ring-1 ring-line">
          <LockIcon className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span className="truncate">{url}</span>
        </div>
        <div className="w-10" aria-hidden="true" />
      </div>
      {children}
    </div>);

}