import React from 'react';
import {
  CalendarDaysIcon,
  UsersIcon,
  UserRoundIcon,
  ScissorsIcon,
  ReceiptIcon,
  PackageIcon,
  TrendingUpIcon,
  StoreIcon,
  SettingsIcon } from
'lucide-react';
import { LogoMark } from '../ui/LogoMark';
import { Avatar } from '../ui/Avatar';

const items = [
{ label: 'Calendar', icon: CalendarDaysIcon },
{ label: 'Clients', icon: UsersIcon },
{ label: 'Team', icon: UserRoundIcon },
{ label: 'Treatments', icon: ScissorsIcon },
{ label: 'Sales', icon: ReceiptIcon },
{ label: 'Inventory', icon: PackageIcon },
{ label: 'Insights', icon: TrendingUpIcon },
{ label: 'Marketplace', icon: StoreIcon }];


type AppSidebarProps = {
  active?: string;
};

export function AppSidebar({ active = 'Calendar' }: AppSidebarProps) {
  return (
    <aside className="flex w-[204px] shrink-0 flex-col border-r border-line bg-canvas px-3 py-4">
      <div className="flex items-center gap-2 px-2">
        <LogoMark className="h-6 w-6" />
        <span className="text-[15px] font-semibold tracking-tight">Gleami</span>
      </div>
      <nav className="mt-7 space-y-0.5">
        {items.map(({ label, icon: Icon }) => {
          const isActive = label === active;
          return (
            <div
              key={label}
              className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] ${isActive ? 'bg-white font-medium text-ink shadow-soft ring-1 ring-line' : 'text-muted'}`}>
              
              <Icon className="h-4 w-4" />
              {label}
              {label === 'Marketplace' &&
              <span className="ml-auto rounded-full bg-rose-100 px-1.5 text-[10px] font-semibold text-rose-700">2</span>
              }
            </div>);

        })}
      </nav>
      <div className="mt-auto space-y-3">
        <div className="flex items-center gap-2.5 px-2.5 text-[13px] text-muted">
          <SettingsIcon className="h-4 w-4" />
          Settings
        </div>
        <div className="flex items-center gap-2.5 rounded-xl bg-white p-2 ring-1 ring-line">
          <Avatar name="Atelier Noor" tone="rose" size="sm" />
          <div className="min-w-0">
            <p className="truncate text-[12px] font-medium">Atelier Noor</p>
            <p className="text-[11px] text-muted">Ghent</p>
          </div>
        </div>
      </div>
    </aside>);

}