"use client";

import { useEffect, useState } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { useTranslations } from "next-intl";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { CustomTooltipContent } from "@/components/charts/charts-extra";
import {
  fetchDashboardServices,
  fetchMonthlyAppointments,
  type DashboardServiceOption,
  type MonthlyCount,
} from "@/lib/api/dashboard/queries";
import { useCompanyId, useLocationId } from "@/lib/company-util";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const chartConfig = {
  count: {
    label: "Appointments",
    color: "hsl(0, 0%, 20%)",
  },
} satisfies ChartConfig;

export function AppointmentCountChart() {
  const t = useTranslations();
  const companyId = useCompanyId();
  const locationId = useLocationId();
  const [chartData, setChartData] = useState<MonthlyCount[]>([]);
  const [services, setServices] = useState<DashboardServiceOption[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const currentMonthAppointments = chartData[chartData.length - 1]?.count || 0;
  const yearlyAppointments = chartData
    .slice(Math.max(chartData.length - 12, 0))
    .reduce((sum, month) => sum + month.count, 0);

  useEffect(() => {
    async function loadData() {
      if (!companyId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data, error } = await fetchMonthlyAppointments(
        companyId,
        selectedServiceIds.length > 0 ? selectedServiceIds : undefined,
        locationId,
      );
      if (error) {
        console.error("Error fetching monthly appointments:", error);
        setLoading(false);
        return;
      }
      if (data) {
        setChartData(data.monthlyData);
      }
      setLoading(false);
    }

    loadData();
  }, [companyId, locationId, selectedServiceIds]);

  useEffect(() => {
    async function loadTreatments() {
      if (!companyId) return;
      const { data } = await fetchDashboardServices(companyId, locationId);
      setServices(data);
    }

    loadTreatments();
  }, [companyId, locationId]);

  if (loading) {
    return (
      <Card className="gap-4">
        <CardHeader>
          <CardTitle>{t("dashboard.appointmentsPerMonth")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-60 flex items-center justify-center text-muted-foreground">
            {t("common.loading")}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
      <Card className="gap-4">
        <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-0.5">
            <CardTitle>{t("dashboard.appointmentsPerMonth")}</CardTitle>
            <div className="font-semibold text-2xl">
              {currentMonthAppointments.toLocaleString()}
            </div>
          </div>
          <div className="space-y-0.5 text-right">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">
              {t("dashboard.yearlyLabel")}
            </div>
            <div className="text-base font-semibold">
              {yearlyAppointments.toLocaleString()}
            </div>
          </div>
          <div className="w-full sm:w-56">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <span className="truncate">
                    {selectedServiceIds.length === 0
                      ? t("appointments.form.all")
                      : selectedServiceIds.length === 1
                        ? (services.find((treatment) => treatment.id === selectedServiceIds[0])?.name ||
                          t("appointments.form.treatment"))
                        : `${selectedServiceIds.length} ${t("appointments.form.treatment")}`}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 max-h-80 overflow-y-auto">
                <DropdownMenuCheckboxItem
                  checked={selectedServiceIds.length === 0}
                  onCheckedChange={() => setSelectedServiceIds([])}
                >
                  {t("appointments.form.all")}
                </DropdownMenuCheckboxItem>
                {services.map((treatment) => (
                  <DropdownMenuCheckboxItem
                    key={treatment.id}
                    checked={selectedServiceIds.includes(treatment.id)}
                    onCheckedChange={(checked) => {
                      setSelectedServiceIds((prev) => {
                        if (checked) {
                          return prev.includes(treatment.id) ? prev : [...prev, treatment.id];
                        }
                        return prev.filter((id) => id !== treatment.id);
                      });
                    }}
                  >
                    {treatment.name}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="h-60 flex items-center justify-center text-muted-foreground">
            {t("dashboard.noAppointmentData")}
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="aspect-auto h-60 w-full">
            <LineChart
              accessibilityLayer
              data={chartData}
              margin={{ left: -12, right: 12, top: 12 }}
            >
              <CartesianGrid vertical={false} strokeDasharray="2 2" stroke="var(--border)" />
              <XAxis
                dataKey="month"
                tickLine={false}
                tickMargin={12}
                tickFormatter={(value) => value.slice(0, 3)}
                stroke="var(--border)"
              />
              <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
              <ChartTooltip
                content={
                  <CustomTooltipContent
                    colorMap={{ count: "hsl(0, 0%, 20%)" }}
                    labelMap={{ count: t("dashboard.appointments") }}
                    dataKeys={["count"]}
                    valueFormatter={(value) => `${value.toLocaleString()}`}
                  />
                }
                cursor={false}
              />
              <Line
                type="linear"
                dataKey="count"
                stroke="hsl(0, 0%, 20%)"
                strokeWidth={2}
                dot={false}
                activeDot={{
                  r: 5,
                  fill: "hsl(0, 0%, 20%)",
                  stroke: "var(--background)",
                  strokeWidth: 2,
                }}
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
