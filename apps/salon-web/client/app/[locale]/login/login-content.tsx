"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
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
import { useAuth } from "@/providers/auth-provider";

export default function LoginPageContent() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const t = useTranslations();
  const supabase = createClient();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      router.push(`/${locale}/calendar`);
    }
  }, [user, router, locale]);

  useEffect(() => {
    if (searchParams.get("error") === "auth_callback") {
      toast.error(t("auth.authCallbackError"));
    }
  }, [searchParams, t]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.toLowerCase().includes("email not confirmed")) {
          toast.error(t("auth.emailNotConfirmed"));
        } else {
          throw error;
        }
        return;
      }

      router.push(`/${locale}/calendar`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("common.errorOccurred")
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email) {
      toast.error(t("auth.enterEmailToResend"));
      return;
    }

    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?locale=${locale}`,
      },
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(t("auth.confirmationEmailResent"));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-primary-100 to-primary-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto w-12 h-12 bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl shadow-lg flex items-center justify-center text-white text-2xl mb-4">
            💇‍♀️
          </div>
          <CardTitle className="text-2xl font-bold">
            {t("auth.signIn")}
          </CardTitle>
          <CardDescription>{t("auth.signInDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSignIn} className="space-y-4">
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

            <div className="space-y-2">
              <Label htmlFor="password">{t("auth.password")}</Label>
              <PasswordInput
                id="password"
                placeholder={t("auth.password")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                showPasswordLabel={t("auth.showPassword")}
                hidePasswordLabel={t("auth.hidePassword")}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-primary-600 hover:bg-primary-700"
              disabled={isLoading}
            >
              {isLoading ? t("common.loading") : t("auth.signIn")}
            </Button>
          </form>

          <div className="text-center text-sm space-y-2">
            <button
              type="button"
              className="text-muted-foreground hover:text-primary-600 hover:underline"
              onClick={handleResendConfirmation}
            >
              {t("auth.resendConfirmation")}
            </button>
            <div>
              <Link
                href={`/${locale}/signup`}
                className="text-primary-600 hover:text-primary-700 hover:underline"
              >
                {t("auth.createSalonAccount")}
              </Link>
            </div>
            <div>
              <Link
                href={`/${locale}/reset-password`}
                className="text-muted-foreground hover:text-primary-600 hover:underline"
              >
                {t("auth.forgotPassword")}
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
