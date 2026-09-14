import { updateSession } from "@/lib/supabase/middleware";
import { type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { locales, defaultLocale } from "./i18n/config";

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always",
  localeDetection: true,
});

export async function middleware(request: NextRequest) {
  // Check if user is accessing root path without locale
  if (request.nextUrl.pathname === "/") {
    const savedLocale = request.cookies.get("locale")?.value;
    if (
      savedLocale &&
      locales.includes(savedLocale as (typeof locales)[number])
    ) {
      const url = request.nextUrl.clone();
      url.pathname = `/${savedLocale}`;
      return Response.redirect(url);
    }
  }

  // First handle internationalization
  const intlResponse = intlMiddleware(request);

  // If it's a redirect, return it immediately
  if (intlResponse.status === 302 || intlResponse.status === 307) {
    return intlResponse;
  }

  // Then handle Supabase session
  const supabaseResponse = await updateSession(request);

  // Merge any headers from intl response into supabase response
  intlResponse.headers.forEach((value, key) => {
    if (key.toLowerCase().startsWith("x-")) {
      supabaseResponse.headers.set(key, value);
    }
  });

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
