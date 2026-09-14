"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function StaffNotFound() {
  const params = useParams();
  const locale = params.locale as string;
  const t = useTranslations();

  return (
    <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
      <h2 className="text-2xl font-semibold">{t("staff.messages.notFound")}</h2>
      <p className="text-muted-foreground">
        {t("staff.messages.staffNotFoundDescription")}
      </p>
      <Button asChild>
        <Link href={`/${locale}/staff`}>
          {t("staff.backToStaffList")}
        </Link>
      </Button>
    </div>
  );
}

