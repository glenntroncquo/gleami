import React from "react";
import {
  CalendarDaysIcon,
  CreditCardIcon,
  LayoutDashboardIcon,
  MapPinIcon,
  MegaphoneIcon,
  PackageIcon,
  ReceiptIcon,
  ScissorsIcon,
  ShoppingCartIcon,
  UserRoundIcon,
  UsersIcon,
} from "lucide-react";
import type { Locale } from "@/lib/i18n";
import { platformChrome } from "./platform-chrome";

const icons = {
  dashboard: LayoutDashboardIcon,
  calendar: CalendarDaysIcon,
  staff: UsersIcon,
  clients: UserRoundIcon,
  treatments: ScissorsIcon,
  pos: ShoppingCartIcon,
  orders: ReceiptIcon,
  billing: CreditCardIcon,
  products: PackageIcon,
  marketing: MegaphoneIcon,
} as const;

const monthDays = [
  null, 1, 2, 3, 4, 5, 6,
  7, 8, 9, 10, 11, 12, 13,
  14, 15, 16, 17, 18, 19, 20,
  21, 22, 23, 24, 25, 26, 27,
  28, 29, 30, null, null, null, null,
];

type AppSidebarProps = {
  locale: Locale;
  active?: string;
};

export function AppSidebar({ locale, active = "calendar" }: AppSidebarProps) {
  const copy = platformChrome(locale);

  return (
    <aside className="flex w-[220px] shrink-0 flex-col overflow-hidden border-r border-line bg-canvas px-2 py-2.5">
      <div className="flex h-11 items-center justify-center">
        <img src="/gleami-wordmark.svg" alt="Gleami" width={104} height={28} className="h-7 w-auto" />
      </div>
      <div className="mt-1.5 border-t border-line pt-2">
        <p className="px-2.5 text-[10px] font-medium uppercase tracking-wide text-subtle">
          {copy.navLabel}
        </p>
        <nav className="mt-1 space-y-0.5">
          {copy.nav.map(([key, label]) => {
            const Icon = icons[key as keyof typeof icons];
            const isActive = key === active;
            return (
              <div
                key={key}
                className={`flex items-center gap-2 rounded-md px-2.5 py-1 text-[12.5px] ${
                  isActive ? "bg-white font-medium text-ink shadow-soft ring-1 ring-line" : "text-muted"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{label}</span>
              </div>
            );
          })}
        </nav>
      </div>
      <div className="mt-2 border-t border-line px-1.5 pt-2">
        <p className="px-1 text-center text-[12px] font-medium capitalize text-ink">{copy.month}</p>
        <div className="mt-2 grid grid-cols-7 gap-y-1 text-center text-[10px] text-subtle">
          {copy.weekdays.map((day) => (
            <span key={day} className="uppercase">
              {day}
            </span>
          ))}
          {monthDays.map((day, index) => (
            <span key={`${day ?? "empty"}-${index}`} className="flex h-5 items-center justify-center">
              {day ? (
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full ${
                    day === 29 ? "bg-ink font-semibold text-white" : "text-ink"
                  }`}
                >
                  {day}
                </span>
              ) : null}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-auto space-y-1 border-t border-line pt-2">
        <div className="flex items-center gap-2 rounded-md px-2 py-1.5">
          <MapPinIcon className="h-4 w-4 text-subtle" />
          <div className="min-w-0 leading-tight">
            <p className="text-[10px] text-subtle">{copy.location}</p>
            <p className="truncate text-[12px] font-medium">Atelier Noor</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-md px-2 py-1.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-shell text-[10px] font-semibold text-ink">
            NE
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[12px] font-medium">Noor El Idrissi</p>
            <p className="truncate text-[10px] text-subtle">noor@ateliernoor.be</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
