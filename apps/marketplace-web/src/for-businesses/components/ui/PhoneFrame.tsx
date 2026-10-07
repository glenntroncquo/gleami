import React from 'react';

type PhoneFrameProps = {
  children: React.ReactNode;
  dark?: boolean;
  label?: string;
};

export function PhoneFrame({ children, dark = false, label }: PhoneFrameProps) {
  return (
    <div
      role={label ? 'img' : undefined}
      aria-label={label}
      className={`relative w-[272px] rounded-[46px] p-[7px] shadow-device ${dark ? 'bg-navy-800 ring-1 ring-white/15' : 'bg-ink'}`}>
      
      <div className="relative h-[564px] overflow-hidden rounded-[39px] bg-white">
        <div className="absolute left-1/2 top-2.5 z-30 h-[22px] w-[82px] -translate-x-1/2 rounded-full bg-ink" />
        {children}
      </div>
    </div>);

}