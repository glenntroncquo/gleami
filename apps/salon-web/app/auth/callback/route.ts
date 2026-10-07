import { createClient } from "@/lib/supabase/server";
import { loadMembershipSnapshot, type MembershipSupabase } from "@/lib/auth";
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
  const inviteNext = requestedNext?.startsWith(`/${locale}/invite`) && !requestedNext.startsWith("//") && !requestedNext.includes("\\")
    ? requestedNext
    : null;

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
      const membership = user
        ? await loadMembershipSnapshot(
            supabase as unknown as MembershipSupabase,
            user.id,
          )
        : null;
      const destination = membership?.companyIds.length
        ? `/${userLocale}/calendar`
        : `/${userLocale}/setup`;
      const redirectPath = inviteNext ?? destination;

      return NextResponse.redirect(`${origin}${redirectPath}`);
    }
  }

  return NextResponse.redirect(`${origin}/${locale}/login?error=auth_callback`);
}
