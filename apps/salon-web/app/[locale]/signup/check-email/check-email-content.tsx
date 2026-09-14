"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SignupCheckEmailContent() {
  const t = useTranslations();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-primary-100 to-primary-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto w-12 h-12 bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl shadow-lg flex items-center justify-center text-white text-2xl mb-4">
            ✉️
          </div>
          <CardTitle className="text-2xl font-bold">
            {t("auth.checkEmailTitle")}
          </CardTitle>
          <CardDescription>
            {email
              ? t("auth.checkEmailDescriptionWithEmail", { email })
              : t("auth.checkEmailDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            {t("auth.checkEmailInstructions")}
          </p>
          <Button asChild className="w-full bg-primary-600 hover:bg-primary-700">
            <Link href={`/${locale}/login`}>{t("auth.backToSignIn")}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
