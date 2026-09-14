"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ReferralsDashboardPage() {
  const t = useTranslations();

  return (
    <div className="grid gap-6">
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>{t("referrals.dashboard.title")}</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          {t("referrals.dashboard.description")}
        </CardContent>
      </Card>
    </div>
  );
}

