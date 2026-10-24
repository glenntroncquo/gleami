import { NextResponse, type NextRequest } from "next/server";
import { isLocale } from "@/lib/i18n";

export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const first = request.nextUrl.pathname.split("/").filter(Boolean)[0];
  if (first && isLocale(first)) requestHeaders.set("x-locale", first);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
