"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import Link from "next/link";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const locale = useLocale();
  const t = useTranslations();
  const supabase = createClient();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/${locale}/update-password`,
      });

      if (error) throw error;

      setIsSubmitted(true);
      toast.success(t("auth.passwordResetEmailSent"));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("common.errorOccurred")
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-primary-100 to-primary-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto w-12 h-12 bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl shadow-lg flex items-center justify-center text-white text-2xl mb-4">
            🔒
          </div>
          <CardTitle className="text-2xl font-bold">
            {t("auth.resetPasswordTitle")}
          </CardTitle>
          <CardDescription>
            {isSubmitted
              ? t("auth.resetPasswordSent")
              : t("auth.resetPasswordDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isSubmitted ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                {t("auth.resetPasswordInstructions")}
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link href={`/${locale}/login`}>{t("auth.backToSignIn")}</Link>
              </Button>
            </div>
          ) : (
            <>
              <form onSubmit={handleReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t("auth.email")}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={t("auth.email")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-primary-600 hover:bg-primary-700"
                  disabled={isLoading}
                >
                  {isLoading ? t("common.loading") : t("auth.resetPassword")}
                </Button>
              </form>

              <div className="text-center text-sm">
                <Link
                  href={`/${locale}/login`}
                  className="text-muted-foreground hover:text-primary-600 hover:underline"
                >
                  {t("auth.backToSignIn")}
                </Link>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
