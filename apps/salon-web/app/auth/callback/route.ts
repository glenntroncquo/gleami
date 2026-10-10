import { createClient } from "@/lib/supabase/server";
import { accountDestinationPath, safeInvitePath } from "@/lib/auth/account-access";
import { destinationForSnapshot, loadAccountSnapshot } from "@/lib/auth/account-resolver";
import { NextResponse } from "next/server";
import { defaultLocale, locales } from "@/i18n/config";

function resolveLocale(value: string | null): string {
  if (value && locales.includes(value as (typeof locales)[number])) {
    return value;
  }

  return defaultLocale;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const locale = resolveLocale(searchParams.get("locale"));
  const requestedNext = searchParams.get("next");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const userLocale = resolveLocale(
        (user?.user_metadata?.locale as string | undefined) ?? locale
      );
      const snapshot = await loadAccountSnapshot(
        supabase as unknown as Parameters<typeof loadAccountSnapshot>[0],
      );
      const destination = await destinationForSnapshot(
        snapshot,
        safeInvitePath(requestedNext, userLocale),
      );
      const redirectPath = accountDestinationPath(userLocale, destination);

      return NextResponse.redirect(`${origin}${redirectPath}`);
    }
  }

  return NextResponse.redirect(`${origin}/${locale}/login?error=auth_callback`);
}
