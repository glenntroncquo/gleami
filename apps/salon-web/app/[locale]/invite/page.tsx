"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { acceptInvitation, previewInvitation, type InvitationPreview } from "@/lib/api/invitation/invitation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/providers/auth-provider";

const ROLE_LABELS = new Set(["owner", "admin", "manager", "stylist", "staff", "freelancer"]);

function InviteContent() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const { user, signOut, refreshMemberships } = useAuth();
  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [needsSignIn, setNeedsSignIn] = useState(false);

  useEffect(() => {
    if (!/^[0-9a-f]{64}$/i.test(token)) {
      setPreview({ success: false, error: "invalid" });
      setLoading(false);
      return;
    }
    let cancelled = false;
    void previewInvitation(token).then((result) => {
      if (cancelled) return;
      setPreview(result);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const roleName = preview?.roleName && ROLE_LABELS.has(preview.roleName)
    ? t(`staff.invite.roles.${preview.roleName}`)
    : preview?.roleName;

  const signedInAsInvitee =
    Boolean(user?.email) && user?.email?.toLowerCase() === preview?.email?.toLowerCase();
  const signedInAsSomeoneElse = Boolean(user?.email) && !signedInAsInvitee && preview?.success;

  const finish = async (email: string, nextPassword?: string) => {
    if (nextPassword) {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: nextPassword,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
    }
    await refreshMemberships();
    router.push(`/${locale}/calendar`);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!preview?.success) return;
    if (!signedInAsInvitee && password !== confirmPassword) {
      toast.error(t("auth.passwordsDontMatch"));
      return;
    }
    setSubmitting(true);
    try {
      const result = await acceptInvitation({
        token,
        password: signedInAsInvitee ? undefined : password,
      });
      if (result.error === "sign_in_required") {
        setNeedsSignIn(true);
        return;
      }
      if (!result.success || !result.email) {
        toast.error(t(`auth.invite.errors.${acceptErrorKey(result.error)}`));
        return;
      }
      await finish(result.email, signedInAsInvitee ? undefined : password);
    } catch {
      toast.error(t("auth.invite.errors.generic"));
    } finally {
      setSubmitting(false);
    }
  };

  const loginHref = `/${locale}/login?next=${encodeURIComponent(`/${locale}/invite?token=${token}`)}`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("auth.invite.title")}</CardTitle>
          <CardDescription>
            {loading
              ? t("auth.invite.loading")
              : preview?.success
                ? t("auth.invite.description", {
                    company: preview.companyName ?? "",
                    role: roleName ?? "",
                  })
                : t("auth.invite.invalid")}
          </CardDescription>
        </CardHeader>
        {preview?.success && (
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {preview.roleScope === "location" && preview.locationName
                ? t("auth.invite.locationLine", { location: preview.locationName })
                : t("auth.invite.companyLine")}
            </p>
            <p className="text-sm mb-4">{preview.email}</p>
            {signedInAsSomeoneElse ? (
              <div className="space-y-3">
                <p className="text-sm">{t("auth.invite.wrongAccount")}</p>
                <Button type="button" variant="outline" onClick={() => void signOut()}>
                  {t("auth.signOut")}
                </Button>
              </div>
            ) : needsSignIn || (preview.accountExists && !signedInAsInvitee) ? (
              <div className="space-y-3">
                {preview.accountExists && (
                  <p className="text-sm">{t("auth.invite.existingAccount")}</p>
                )}
                <Button asChild className="w-full">
                  <Link href={loginHref}>{t("auth.invite.signInToAccept")}</Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {!signedInAsInvitee && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="invite-password">{t("auth.password")}</Label>
                      <PasswordInput
                        id="invite-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        required
                        minLength={8}
                        showPasswordLabel={t("auth.showPassword")}
                        hidePasswordLabel={t("auth.hidePassword")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="invite-confirm">{t("auth.confirmPassword")}</Label>
                      <PasswordInput
                        id="invite-confirm"
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        required
                        minLength={8}
                        showPasswordLabel={t("auth.showPassword")}
                        hidePasswordLabel={t("auth.hidePassword")}
                      />
                    </div>
                  </>
                )}
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting
                    ? t(preview.accountExists ? "auth.invite.linking" : "auth.invite.joining")
                    : t(preview.accountExists ? "auth.invite.link" : "auth.invite.join")}
                </Button>
              </form>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}

function acceptErrorKey(code: string | undefined): string {
  switch (code) {
    case "weak_password":
      return "weakPassword";
    case "already_member":
      return "alreadyMember";
    case "sign_in_required":
      return "signInRequired";
    default:
      return "generic";
  }
}

export default function InvitePage() {
  return (
    <Suspense fallback={null}>
      <InviteContent />
    </Suspense>
  );
}
