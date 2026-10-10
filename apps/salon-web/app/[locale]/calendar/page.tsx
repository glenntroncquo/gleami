"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import BigCalendar from "@/components/calendar/big-calendar";
import { ProtectedRoute } from "@/components/protected-route";
import { CalendarProvider } from "@/components/event-calendar/calendar-context";

export default function Page() {
  return (
    <ProtectedRoute>
      <CalendarProvider>
        <AppSidebar />
        <SidebarInset className="h-svh overflow-hidden md:h-[calc(100svh-1rem)]">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <BigCalendar />
          </div>
        </SidebarInset>
      </CalendarProvider>
    </ProtectedRoute>
  );
}
