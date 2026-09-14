"use client";

import { useId, useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

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

export function RevenueBarChart() {
  const id = useId();
  const t = useTranslations();
  const companyId = useCompanyId();
  const locationId = useLocationId();
  const [chartData, setChartData] = useState<MonthlyRevenue[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalRevenueExclVat, setTotalRevenueExclVat] = useState(0);
  const [loading, setLoading] = useState(true);

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
          <CardTitle>{t("dashboard.totalRevenue")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-60 flex items-center justify-center text-muted-foreground">
            {t("common.loading")}
          </div>
        </CardContent>
      </Card>
    );
  }

  const firstMonth = chartData[0]?.month as string;
  const lastMonth = chartData[chartData.length - 1]?.month as string;

  return (
    <Card className="gap-4">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <CardTitle>{t("dashboard.totalRevenue")}</CardTitle>
            <div className="flex items-start gap-2">
              <div className="font-semibold text-2xl">
                €{totalRevenue.toLocaleString()}
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              Revenue excl. BTW: €{totalRevenueExclVat.toLocaleString()}
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
            <BarChart
              accessibilityLayer
              data={chartData}
              maxBarSize={20}
              margin={{ left: -12, right: 12, top: 12 }}
            >
              <defs>
                <linearGradient id={`${id}-gradient`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(0, 0%, 0%)" />
                  <stop offset="100%" stopColor="hsl(0, 0%, 20%)" />
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
                ticks={[firstMonth, lastMonth]}
                stroke="var(--border)"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
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
              <Bar dataKey="revenue" fill={`url(#${id}-gradient)`} radius={[4, 4, 0, 0]} />
              <Bar dataKey="revenueExclVat" fill="hsl(0, 0%, 35%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
