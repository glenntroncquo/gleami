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
        <SidebarInset>
          <div className="flex flex-1 flex-col gap-4 p-2 pt-0">
            <BigCalendar />
          </div>
        </SidebarInset>
      </CalendarProvider>
    </ProtectedRoute>
  );
}
