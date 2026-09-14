"use client";

import { useId, useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart";
import { CustomTooltipContent } from "@/components/charts/charts-extra";
import { fetchRevenue, type MonthlyRevenue } from "@/lib/api/dashboard/queries";
import { useCompanyId, useLocationId } from "@/lib/company-util";
import { useTranslations } from "next-intl";

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(0, 0%, 0%)",
  },
  revenueExclVat: {
    label: "Revenue excl. BTW",
    color: "hsl(0, 0%, 35%)",
  },
} satisfies ChartConfig;

export function RevenueChart() {
  const id = useId();
  const t = useTranslations();
  const companyId = useCompanyId();
  const locationId = useLocationId();
  const [chartData, setChartData] = useState<MonthlyRevenue[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalRevenueExclVat, setTotalRevenueExclVat] = useState(0);
  const [loading, setLoading] = useState(true);
  const currentMonthRevenue = chartData[chartData.length - 1]?.revenue || 0;
  const currentMonthRevenueExclVat =
    chartData[chartData.length - 1]?.revenueExclVat || 0;

  useEffect(() => {
    async function loadRevenue() {
      if (!companyId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const { data, error } = await fetchRevenue(companyId, locationId);

      if (error) {
        console.error("Error fetching revenue:", error);
        setLoading(false);
        return;
      }

      if (data) {
        setChartData(data.monthlyData);
        setTotalRevenue(data.totalRevenue);
        setTotalRevenueExclVat(data.totalRevenueExclVat);
      }
      setLoading(false);
    }

    loadRevenue();
  }, [companyId, locationId]);

  if (loading) {
    return (
      <Card className="gap-4">
        <CardHeader>
          <CardTitle>{t("dashboard.monthlyRevenue")}</CardTitle>
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <CardTitle>{t("dashboard.monthlyRevenue")}</CardTitle>
            <div className="flex items-start gap-2">
              <div className="font-semibold text-2xl">
                €{currentMonthRevenue.toLocaleString()}
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              {t("dashboard.monthlyLabel")}: €{currentMonthRevenueExclVat.toLocaleString()} {t("dashboard.revenueExclVat")}
            </div>
          </div>
          <div className="space-y-0.5 text-right">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">
              {t("dashboard.yearlyLabel")}
            </div>
            <div className="text-base font-semibold">
              €{totalRevenue.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">
              €{totalRevenueExclVat.toLocaleString()} {t("dashboard.revenueExclVat")}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <div
                aria-hidden="true"
                className="size-1.5 shrink-0 rounded-xs"
                style={{ backgroundColor: "hsl(0, 0%, 0%)" }}
              ></div>
              <div className="text-[13px]/3 text-muted-foreground/50">
                Revenue
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div
                aria-hidden="true"
                className="size-1.5 shrink-0 rounded-xs"
                style={{ backgroundColor: "hsl(0, 0%, 35%)" }}
              ></div>
              <div className="text-[13px]/3 text-muted-foreground/50">
                Revenue excl. BTW
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="h-60 flex items-center justify-center text-muted-foreground">
            {t("dashboard.noRevenueData")}
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-60 w-full"
          >
            <LineChart
              accessibilityLayer
              data={chartData}
              margin={{ left: -12, right: 12, top: 12 }}
            >
              <defs>
                <linearGradient id={`${id}-gradient`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="hsl(0, 0%, 20%)" />
                  <stop offset="100%" stopColor="hsl(0, 0%, 0%)" />
                </linearGradient>
              </defs>
              <CartesianGrid
                vertical={false}
                strokeDasharray="2 2"
                stroke="var(--border)"
              />
              <XAxis
                dataKey="month"
                tickLine={false}
                tickMargin={12}
                tickFormatter={(value) => value.slice(0, 3)}
                stroke="var(--border)"
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => {
                  if (value === 0) return "€0";
                  return `€${value / 1000}k`;
                }}
                interval="preserveStartEnd"
              />
              <ChartTooltip
                content={
                  <CustomTooltipContent
                    colorMap={{
                      revenue: "hsl(0, 0%, 0%)",
                      revenueExclVat: "hsl(0, 0%, 35%)",
                    }}
                    labelMap={{
                      revenue: "Revenue",
                      revenueExclVat: "Revenue excl. BTW",
                    }}
                    dataKeys={["revenue", "revenueExclVat"]}
                    valueFormatter={(value) => `€${value.toLocaleString()}`}
                  />
                }
                cursor={false}
              />
              <Line
                type="linear"
                dataKey="revenue"
                stroke={`url(#${id}-gradient)`}
                strokeWidth={2}
                dot={false}
                activeDot={{
                  r: 5,
                  fill: "hsl(0, 0%, 0%)",
                  stroke: "var(--background)",
                  strokeWidth: 2,
                }}
              />
              <Line
                type="linear"
                dataKey="revenueExclVat"
                stroke="hsl(0, 0%, 35%)"
                strokeWidth={2}
                dot={false}
                activeDot={{
                  r: 4,
                  fill: "hsl(0, 0%, 35%)",
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
