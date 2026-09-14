"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { z } from "zod";
import { toast } from "sonner";
import { registerSalonOwner } from "@/lib/api/auth/register-salon-owner";
import { useAuth } from "@/providers/auth-provider";
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
import { Separator } from "@/components/ui/separator";

const signupSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    phone: z.string().optional(),
    companyName: z.string().min(1),
    companyEmail: z.string().email().optional().or(z.literal("")),
    street: z.string().optional(),
    city: z.string().optional(),
    postalCode: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "passwordsDontMatch",
    path: ["confirmPassword"],
  });

export default function SignupPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("");
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      router.push(`/${locale}/calendar`);
    }
  }, [user, router, locale]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const parsed = signupSchema.safeParse({
        email,
        password,
        confirmPassword,
        firstName,
        lastName,
        phone: phone || undefined,
        companyName,
        companyEmail: companyEmail || undefined,
        street: street || undefined,
        city: city || undefined,
        postalCode: postalCode || undefined,
        state: state || undefined,
        country: country || undefined,
      });

      if (!parsed.success) {
        const firstIssue = parsed.error.issues[0];
        if (firstIssue?.message === "passwordsDontMatch") {
          toast.error(t("auth.passwordsDontMatch"));
        } else if (firstIssue?.path[0] === "password") {
          toast.error(t("auth.passwordMinLength"));
        } else {
          toast.error(t("auth.signupValidationError"));
        }
        return;
      }

      const result = await registerSalonOwner({
        email: parsed.data.email,
        password: parsed.data.password,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        phone: parsed.data.phone,
        locale,
        emailRedirectTo: `${window.location.origin}/auth/callback?locale=${locale}`,
        company: {
          name: parsed.data.companyName,
          email: parsed.data.companyEmail || undefined,
          street: parsed.data.street,
          city: parsed.data.city,
          postalCode: parsed.data.postalCode,
          state: parsed.data.state,
          country: parsed.data.country,
        },
      });

      if (!result.success) {
        toast.error(result.message ?? result.error ?? t("auth.signupFailed"));
        return;
      }

      router.push(
        `/${locale}/signup/check-email?email=${encodeURIComponent(parsed.data.email)}`
      );
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
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto w-12 h-12 bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl shadow-lg flex items-center justify-center text-white text-2xl mb-4">
            💇‍♀️
          </div>
          <CardTitle className="text-2xl font-bold">
            {t("auth.signUpTitle")}
          </CardTitle>
          <CardDescription>{t("auth.signUpDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {t("auth.accountSection")}
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="email">{t("auth.email")}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">{t("auth.password")}</Label>
                  <PasswordInput
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    showPasswordLabel={t("auth.showPassword")}
                    hidePasswordLabel={t("auth.hidePassword")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">
                    {t("auth.confirmPassword")}
                  </Label>
                  <PasswordInput
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    showPasswordLabel={t("auth.showPassword")}
                    hidePasswordLabel={t("auth.hidePassword")}
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {t("auth.ownerSection")}
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">{t("auth.firstName")}</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">{t("auth.lastName")}</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="phone">{t("common.phone")}</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {t("auth.companySection")}
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="companyName">{t("auth.companyName")}</Label>
                  <Input
                    id="companyName"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="companyEmail">
                    {t("auth.companyEmail")}
                  </Label>
                  <Input
                    id="companyEmail"
                    type="email"
                    value={companyEmail}
                    onChange={(e) => setCompanyEmail(e.target.value)}
                    placeholder={t("auth.companyEmailPlaceholder")}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="street">{t("auth.street")}</Label>
                  <Input
                    id="street"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">{t("auth.city")}</Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postalCode">{t("auth.postalCode")}</Label>
                  <Input
                    id="postalCode"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">{t("auth.state")}</Label>
                  <Input
                    id="state"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">{t("auth.country")}</Label>
                  <Input
                    id="country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-primary-600 hover:bg-primary-700"
              disabled={isLoading}
            >
              {isLoading ? t("common.loading") : t("auth.createAccount")}
            </Button>
          </form>

          <div className="text-center text-sm">
            <Link
              href={`/${locale}/login`}
              className="text-primary-600 hover:text-primary-700 hover:underline"
            >
              {t("auth.backToSignIn")}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
