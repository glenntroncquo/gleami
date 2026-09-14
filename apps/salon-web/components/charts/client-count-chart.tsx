"use client";

import { useEffect, useState } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { useTranslations } from "next-intl";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { CustomTooltipContent } from "@/components/charts/charts-extra";
import {
  fetchMonthlyClients,
  type MonthlyCount,
} from "@/lib/api/dashboard/queries";
import { useCompanyId, useLocationId } from "@/lib/company-util";

const chartConfig = {
  count: {
    label: "Clients",
    color: "hsl(0, 0%, 0%)",
  },
} satisfies ChartConfig;

export function ClientCountChart() {
  const t = useTranslations();
  const companyId = useCompanyId();
  const locationId = useLocationId();
  const [chartData, setChartData] = useState<MonthlyCount[]>([]);
  const [loading, setLoading] = useState(true);
  const currentMonthClients = chartData[chartData.length - 1]?.count || 0;
  const yearlyClients = chartData
    .slice(Math.max(chartData.length - 12, 0))
    .reduce((sum, month) => sum + month.count, 0);

  useEffect(() => {
    async function loadData() {
      if (!companyId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data, error } = await fetchMonthlyClients(companyId, locationId);
      if (error) {
        console.error("Error fetching monthly clients:", error);
        setLoading(false);
        return;
      }
      if (data) {
        setChartData(data.monthlyData);
      }
      setLoading(false);
    }

    loadData();
  }, [companyId, locationId]);

  if (loading) {
    return (
      <Card className="gap-4">
        <CardHeader>
          <CardTitle>{t("dashboard.clientsPerMonth")}</CardTitle>
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
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-0.5">
            <CardTitle>{t("dashboard.clientsPerMonth")}</CardTitle>
            <div className="font-semibold text-2xl">
              {currentMonthClients.toLocaleString()}
            </div>
          </div>
          <div className="space-y-0.5 text-right">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">
              {t("dashboard.yearlyLabel")}
            </div>
            <div className="text-base font-semibold">{yearlyClients.toLocaleString()}</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="h-60 flex items-center justify-center text-muted-foreground">
            {t("dashboard.noClientData")}
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
                    colorMap={{ count: "hsl(0, 0%, 0%)" }}
                    labelMap={{ count: t("dashboard.clients") }}
                    dataKeys={["count"]}
                    valueFormatter={(value) => `${value.toLocaleString()}`}
                  />
                }
                cursor={false}
              />
              <Line
                type="linear"
                dataKey="count"
                stroke="hsl(0, 0%, 0%)"
                strokeWidth={2}
                dot={false}
                activeDot={{
                  r: 5,
                  fill: "hsl(0, 0%, 0%)",
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
