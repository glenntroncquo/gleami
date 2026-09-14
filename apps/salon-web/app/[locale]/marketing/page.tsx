"use client";

import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Calendar,
  Mail,
  Megaphone,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";

export default function MarketingPage() {
  const t = useTranslations();

  return (
    <div className="grid gap-6">
      <Card className="border-dashed">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Megaphone className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">{t("marketing.comingSoonTitle")}</CardTitle>
          <CardDescription className="text-lg">
            {t("marketing.comingSoonDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground mb-6">
            {t("marketing.comingSoonMessage")}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="opacity-60">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">{t("marketing.emailCampaigns")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>{t("marketing.emailCampaignsDescription")}</CardDescription>
          </CardContent>
        </Card>

        <Card className="opacity-60">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">
                {t("marketing.customerSegmentation")}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>
              {t("marketing.customerSegmentationDescription")}
            </CardDescription>
          </CardContent>
        </Card>

        <Card className="opacity-60">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">{t("marketing.analytics")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>{t("marketing.analyticsDescription")}</CardDescription>
          </CardContent>
        </Card>

        <Card className="opacity-60">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">{t("marketing.promotions")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>{t("marketing.promotionsDescription")}</CardDescription>
          </CardContent>
        </Card>

        <Card className="opacity-60">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">{t("marketing.loyaltyProgram")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>{t("marketing.loyaltyProgramDescription")}</CardDescription>
          </CardContent>
        </Card>

        <Card className="opacity-60">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">{t("marketing.socialMedia")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>{t("marketing.socialMediaDescription")}</CardDescription>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
