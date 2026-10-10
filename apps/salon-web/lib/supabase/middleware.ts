import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function nextWithPath(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-pathname", request.nextUrl.pathname);
  const cookie = request.cookies
    .getAll()
    .map((entry) => `${entry.name}=${entry.value}`)
    .join("; ");
  if (cookie) headers.set("cookie", cookie);
  return NextResponse.next({ request: { headers } });
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = nextWithPath(request);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = nextWithPath(request);
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (
    !user &&
    // These retired paths have been removed; allow Next.js to return 404.
    !/^\/[a-z]{2}\/(?:start|signup)(?:\/|$)/.test(request.nextUrl.pathname) &&
    !request.nextUrl.pathname.includes("/login") &&
    !request.nextUrl.pathname.includes("/auth") &&
    !request.nextUrl.pathname.includes("/reset-password") &&
    !request.nextUrl.pathname.includes("/update-password") &&
    !request.nextUrl.pathname.includes("/invite") &&
    !request.nextUrl.pathname.includes("/cancel-appointment")
  ) {
    // No user, redirect to the unified email-first auth entry point.
    // Extract locale from current path or use default
    const pathSegments = request.nextUrl.pathname.split("/");
    const validLocales = ["en", "nl", "fr", "pt"];
    const locale =
      pathSegments[1] && validLocales.includes(pathSegments[1])
        ? pathSegments[1]
        : "en";

    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    url.search = "";
    return NextResponse.redirect(url);
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object here instead of the supabaseResponse object

  return supabaseResponse;
}
