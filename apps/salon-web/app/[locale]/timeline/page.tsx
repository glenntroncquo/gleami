"use client";

import { useEffect, useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { addDays, startOfWeek, subDays, setHours, setMinutes } from "date-fns";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { ProtectedRoute } from "@/components/protected-route";
import { Button } from "@/components/ui/button";
import {
  TimelineGrid,
  TopNavigation,
  type TimelineStaff,
  type TimelineTask,
  type TimelineUnavailability,
  type TabFilter,
} from "@/components/timeline";

type Staff = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  image_path: string | null;
};

export default function TimelinePage() {
  const t = useTranslations();

  const [allStaff, setAllStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabFilter>("active");
  const [startDate, setStartDate] = useState(() => {
    // Start from Monday of the current week
    return startOfWeek(new Date(), { weekStartsOn: 1 });
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const supabase = createClient();

        // Fetch all staff for the timeline
        const { data: staffList } = await supabase
          .from("staff")
          .select("id, first_name, last_name, image_path")
          .order("first_name");

        if (staffList) {
          setAllStaff(staffList);
        }
      } catch (error) {
        console.error("Error fetching staff:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Sample unavailabilities
  const sampleUnavailabilities: TimelineUnavailability[] = useMemo(() => {
    const monday = startDate;

    const createTime = (day: Date, hour: number, minute: number) => {
      return setMinutes(setHours(day, hour), minute);
    };

    return [
      // Staff 1 - Wednesday unavailable (lunch break)
      {
        id: "u1",
        startTime: createTime(addDays(monday, 2), 12, 0),
        endTime: createTime(addDays(monday, 2), 13, 0),
        reason: "Lunch break",
      },
      // Staff 2 - Monday morning unavailable
      {
        id: "u2",
        startTime: createTime(monday, 8, 0),
        endTime: createTime(monday, 10, 0),
        reason: "Training",
      },
      // Staff 2 - Friday afternoon unavailable
      {
        id: "u3",
        startTime: createTime(addDays(monday, 4), 15, 0),
        endTime: createTime(addDays(monday, 4), 18, 0),
        reason: "Personal",
      },
      // Staff 3 - Tuesday unavailable (sick)
      {
        id: "u4",
        startTime: createTime(addDays(monday, 1), 9, 0),
        endTime: createTime(addDays(monday, 1), 17, 0),
        reason: "Sick leave",
      },
      // Staff 4 - Saturday morning unavailable
      {
        id: "u5",
        startTime: createTime(addDays(monday, 5), 9, 0),
        endTime: createTime(addDays(monday, 5), 12, 0),
      },
    ];
  }, [startDate]);

  // Sample appointments - hairdresser style with multiple per day
  const sampleTasks: TimelineTask[] = useMemo(() => {
    const monday = startDate;

    // Helper to create appointment time
    const createTime = (day: Date, hour: number, minute: number) => {
      return setMinutes(setHours(day, hour), minute);
    };

    return [
      // Staff 1 - Monday appointments
      {
        id: "1",
        title: "Haircut - Emma",
        startTime: createTime(monday, 9, 0),
        endTime: createTime(monday, 9, 45),
        color: "pink",
        staffId: allStaff[0]?.id || "1",
        staffName: allStaff[0]
          ? `${allStaff[0].first_name} ${allStaff[0].last_name}`
          : "Staff 1",
      },
      {
        id: "2",
        title: "Color & Cut - Sophie",
        startTime: createTime(monday, 10, 0),
        endTime: createTime(monday, 12, 0),
        color: "purple",
        staffId: allStaff[0]?.id || "1",
        staffName: allStaff[0]
          ? `${allStaff[0].first_name} ${allStaff[0].last_name}`
          : "Staff 1",
      },
      {
        id: "3",
        title: "Blowout - Lisa",
        startTime: createTime(monday, 14, 0),
        endTime: createTime(monday, 14, 45),
        color: "blue",
        staffId: allStaff[0]?.id || "1",
        staffName: allStaff[0]
          ? `${allStaff[0].first_name} ${allStaff[0].last_name}`
          : "Staff 1",
      },
      {
        id: "4",
        title: "Trim - Anna",
        startTime: createTime(monday, 15, 0),
        endTime: createTime(monday, 15, 30),
        color: "green",
        staffId: allStaff[0]?.id || "1",
        staffName: allStaff[0]
          ? `${allStaff[0].first_name} ${allStaff[0].last_name}`
          : "Staff 1",
      },
      // Staff 1 - Tuesday appointments
      {
        id: "5",
        title: "Highlights - Maria",
        startTime: createTime(addDays(monday, 1), 9, 30),
        endTime: createTime(addDays(monday, 1), 11, 30),
        color: "orange",
        staffId: allStaff[0]?.id || "1",
        staffName: allStaff[0]
          ? `${allStaff[0].first_name} ${allStaff[0].last_name}`
          : "Staff 1",
      },
      {
        id: "6",
        title: "Haircut - Tom",
        startTime: createTime(addDays(monday, 1), 13, 0),
        endTime: createTime(addDays(monday, 1), 13, 45),
        color: "teal",
        staffId: allStaff[0]?.id || "1",
        staffName: allStaff[0]
          ? `${allStaff[0].first_name} ${allStaff[0].last_name}`
          : "Staff 1",
      },
      // Staff 2 - Monday appointments
      {
        id: "7",
        title: "Balayage - Jessica",
        startTime: createTime(monday, 9, 0),
        endTime: createTime(monday, 11, 30),
        color: "purple",
        staffId: allStaff[1]?.id || "2",
        staffName: allStaff[1]
          ? `${allStaff[1].first_name} ${allStaff[1].last_name}`
          : "Staff 2",
      },
      {
        id: "8",
        title: "Haircut - David",
        startTime: createTime(monday, 12, 0),
        endTime: createTime(monday, 12, 45),
        color: "blue",
        staffId: allStaff[1]?.id || "2",
        staffName: allStaff[1]
          ? `${allStaff[1].first_name} ${allStaff[1].last_name}`
          : "Staff 2",
      },
      {
        id: "9",
        title: "Color Refresh - Laura",
        startTime: createTime(monday, 14, 30),
        endTime: createTime(monday, 16, 0),
        color: "pink",
        staffId: allStaff[1]?.id || "2",
        staffName: allStaff[1]
          ? `${allStaff[1].first_name} ${allStaff[1].last_name}`
          : "Staff 2",
      },
      // Staff 2 - Wednesday appointments
      {
        id: "10",
        title: "Full Color - Rachel",
        startTime: createTime(addDays(monday, 2), 10, 0),
        endTime: createTime(addDays(monday, 2), 12, 30),
        color: "orange",
        staffId: allStaff[1]?.id || "2",
        staffName: allStaff[1]
          ? `${allStaff[1].first_name} ${allStaff[1].last_name}`
          : "Staff 2",
      },
      {
        id: "11",
        title: "Men's Cut - James",
        startTime: createTime(addDays(monday, 2), 14, 0),
        endTime: createTime(addDays(monday, 2), 14, 30),
        color: "teal",
        staffId: allStaff[1]?.id || "2",
        staffName: allStaff[1]
          ? `${allStaff[1].first_name} ${allStaff[1].last_name}`
          : "Staff 2",
      },
      // Staff 3 appointments
      {
        id: "12",
        title: "Wedding Hair - Emily",
        startTime: createTime(addDays(monday, 3), 9, 0),
        endTime: createTime(addDays(monday, 3), 12, 0),
        color: "pink",
        staffId: allStaff[2]?.id || "3",
        staffName: allStaff[2]
          ? `${allStaff[2].first_name} ${allStaff[2].last_name}`
          : "Staff 3",
      },
      {
        id: "13",
        title: "Haircut - Sarah",
        startTime: createTime(addDays(monday, 3), 14, 0),
        endTime: createTime(addDays(monday, 3), 14, 45),
        color: "green",
        staffId: allStaff[2]?.id || "3",
        staffName: allStaff[2]
          ? `${allStaff[2].first_name} ${allStaff[2].last_name}`
          : "Staff 3",
      },
      {
        id: "14",
        title: "Blowout - Kate",
        startTime: createTime(addDays(monday, 4), 11, 0),
        endTime: createTime(addDays(monday, 4), 11, 45),
        color: "blue",
        staffId: allStaff[2]?.id || "3",
        staffName: allStaff[2]
          ? `${allStaff[2].first_name} ${allStaff[2].last_name}`
          : "Staff 3",
      },
      // Staff 4 appointments
      {
        id: "15",
        title: "Highlights - Nicole",
        startTime: createTime(addDays(monday, 4), 9, 0),
        endTime: createTime(addDays(monday, 4), 11, 0),
        color: "purple",
        staffId: allStaff[3]?.id || "4",
        staffName: allStaff[3]
          ? `${allStaff[3].first_name} ${allStaff[3].last_name}`
          : "Staff 4",
      },
      {
        id: "16",
        title: "Trim - Michelle",
        startTime: createTime(addDays(monday, 4), 13, 0),
        endTime: createTime(addDays(monday, 4), 13, 30),
        color: "teal",
        staffId: allStaff[3]?.id || "4",
        staffName: allStaff[3]
          ? `${allStaff[3].first_name} ${allStaff[3].last_name}`
          : "Staff 4",
      },
      {
        id: "17",
        title: "Color - Amanda",
        startTime: createTime(addDays(monday, 5), 10, 0),
        endTime: createTime(addDays(monday, 5), 12, 0),
        color: "orange",
        staffId: allStaff[3]?.id || "4",
        staffName: allStaff[3]
          ? `${allStaff[3].first_name} ${allStaff[3].last_name}`
          : "Staff 4",
      },
    ];
  }, [allStaff, startDate]);

  // Group tasks and unavailabilities by staff
  const staffWithTasks: TimelineStaff[] = useMemo(() => {
    // Use real staff or generate sample staff
    const staffList =
      allStaff.length > 0
        ? allStaff
        : Array.from({ length: 4 }, (_, i) => ({
            id: String(i + 1),
            first_name: `Hairdresser`,
            last_name: `${i + 1}`,
            image_path: null,
          }));

    return staffList.map((s, index) => ({
      id: s.id,
      name:
        `${s.first_name || ""} ${s.last_name || ""}`.trim() ||
        t("common.unknown"),
      avatar: s.image_path
        ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/company/${s.image_path}`
        : undefined,
      tasks: sampleTasks.filter((task) => task.staffId === s.id),
      unavailabilities: sampleUnavailabilities.filter((_, i) => {
        // Distribute unavailabilities among staff based on the sample data IDs
        if (index === 0) return ["u1"].includes(sampleUnavailabilities[i]?.id);
        if (index === 1)
          return ["u2", "u3"].includes(sampleUnavailabilities[i]?.id);
        if (index === 2) return ["u4"].includes(sampleUnavailabilities[i]?.id);
        if (index === 3) return ["u5"].includes(sampleUnavailabilities[i]?.id);
        return false;
      }),
    }));
  }, [allStaff, sampleTasks, sampleUnavailabilities]);

  const handlePreviousWeek = () => {
    setStartDate((prev) => subDays(prev, 7));
  };

  const handleNextWeek = () => {
    setStartDate((prev) => addDays(prev, 7));
  };

  const handleToday = () => {
    setStartDate(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <AppSidebar />
        <SidebarInset>
          <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">
                  {t("planning.title")}
                </h1>
                <p className="text-muted-foreground text-sm md:text-base">
                  {t("planning.description")}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-center h-64">
              <div className="text-muted-foreground">{t("common.loading")}</div>
            </div>
          </div>
        </SidebarInset>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AppSidebar />
      <SidebarInset>
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6 h-[calc(100vh-1rem)]">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">
                {t("planning.title")}
              </h1>
              <p className="text-muted-foreground text-sm md:text-base">
                {t("planning.description")}
              </p>
            </div>

            {/* Date Navigation - moved to header for mobile */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousWeek}
                aria-label={t("timeline.previousWeek")}
              >
                <ChevronLeftIcon size={16} />
              </Button>
              <Button variant="outline" size="sm" onClick={handleToday}>
                {t("timeline.today")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextWeek}
                aria-label={t("timeline.nextWeek")}
              >
                <ChevronRightIcon size={16} />
              </Button>
            </div>
          </div>

          {/* Top Navigation - hide on mobile for more space */}
          <div className="hidden md:block">
            <TopNavigation activeTab={activeTab} onTabChange={setActiveTab} />
          </div>

          {/* Timeline Grid - 7 days only */}
          <div className="flex-1 min-h-0">
            <TimelineGrid
              staffMembers={staffWithTasks}
              startDate={startDate}
              days={7}
            />
          </div>
        </div>
      </SidebarInset>
    </ProtectedRoute>
  );
}
