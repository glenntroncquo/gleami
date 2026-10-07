import React from 'react';
import { SignalIcon, WifiIcon, BatteryFullIcon } from 'lucide-react';

type StatusBarProps = {
  light?: boolean;
};

export function StatusBar({ light = false }: StatusBarProps) {
  return (
    <div
      className={`relative z-20 flex items-center justify-between px-7 pb-1 pt-3.5 text-[12px] font-semibold ${light ? 'text-white' : 'text-ink'}`}>
      
      <span>9:41</span>
      <span className="flex items-center gap-1">
        <SignalIcon className="h-3 w-3" />
        <WifiIcon className="h-3 w-3" />
        <BatteryFullIcon className="h-3.5 w-3.5" />
      </span>
    </div>);

}