"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { SetupResumeBanner } from "@/components/onboarding/setup-resume-banner";
import { useAuth } from "@/providers/auth-provider";

const AUTH_ROUTES = [
  "/login",
  "/setup",
  "/workspaces",
  "/account-unavailable",
  "/reset-password",
  "/update-password",
  "/invite",
];
const PUBLIC_ROUTES = [
  "/login",
  "/setup",
  "/workspaces",
  "/account-unavailable",
  "/reset-password",
  "/update-password",
  "/invite",
  "/cancel-appointment",
];

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, membershipReady, membershipError } = useAuth();

  const route = pathname.replace(/^\/[a-z]{2}/, "") || "/";
  const isAuthPage = AUTH_ROUTES.some((authRoute) => route.startsWith(authRoute));
  const isPublicPage = PUBLIC_ROUTES.some((publicRoute) => route.startsWith(publicRoute));
  const checkingCompanyMembership = Boolean(user && !isPublicPage && !membershipReady);

  useEffect(() => {
    if (isAuthPage || isPublicPage) {
      document.body.className = document.body.className.replace("bg-sidebar", "bg-background");
    } else if (!document.body.className.includes("bg-sidebar")) {
      document.body.className = document.body.className.replace("bg-background", "bg-sidebar");
    }
  }, [pathname, isAuthPage, isPublicPage]);

  if (membershipError && user && !isPublicPage) {
    return (
      <main className="grid min-h-screen place-items-center bg-white px-6 text-center text-[#101114]">
        <div className="max-w-md">
          <h1 className="text-2xl font-semibold">Your salons could not be loaded</h1>
          <p className="mt-3 text-[#737989]">This is a temporary problem. Your account was not sent to setup.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 h-12 rounded-full bg-[#071D43] px-6 font-semibold text-white"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  if (checkingCompanyMembership) return null;

  if (isAuthPage || isPublicPage) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider>
      <SetupResumeBanner />
      {children}
    </SidebarProvider>
  );
}
