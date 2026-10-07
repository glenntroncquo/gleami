import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const segments = pathname.split("/").filter(Boolean);

  if (pathname === `/${defaultLocale}`) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url, 308);
  }

  const first = segments[0]?.toLowerCase();
  if (first && isLocale(first) && segments[0] !== first) {
    const url = request.nextUrl.clone();
    url.pathname = `/${[first, ...segments.slice(1)].join("/")}`;
    return NextResponse.redirect(url, 308);
  }

  const legacyLocales: Record<string, Locale> = {
    nl: "nl-be",
    fr: "fr-be",
    de: "de-de",
  };
  if (first && legacyLocales[first]) {
    const url = request.nextUrl.clone();
    url.pathname = `/${[legacyLocales[first], ...segments.slice(1)].join("/")}`;
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/nl-be", "/nl/:path*", "/fr/:path*", "/de/:path*", "/NL-BE/:path*", "/FR-BE/:path*", "/NL-NL/:path*", "/FR-FR/:path*", "/DE-DE/:path*"],
};
