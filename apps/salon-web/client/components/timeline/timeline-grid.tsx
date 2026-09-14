"use client";

import { TimelineStaff } from "./types";
import { TimelineRow } from "./timeline-row";
import { TimelineHeader } from "./timeline-header";

interface TimelineGridProps {
  staffMembers: TimelineStaff[];
  startDate: Date;
  days?: number;
}

export function TimelineGrid({
  staffMembers,
  startDate,
  days = 7,
}: TimelineGridProps) {
  return (
    <div className="flex flex-col h-full overflow-hidden rounded-2xl border border-border/40 bg-card shadow-sm">
      {/* Header */}
      <TimelineHeader startDate={startDate} days={days} />

      {/* Rows */}
      <div className="flex-1 overflow-y-auto divide-y divide-border/30">
        {staffMembers.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground">
            No staff members to display
          </div>
        ) : (
          staffMembers.map((staff) => (
            <TimelineRow
              key={staff.id}
              staff={staff}
              startDate={startDate}
              days={days}
            />
          ))
        )}
      </div>
    </div>
  );
}
