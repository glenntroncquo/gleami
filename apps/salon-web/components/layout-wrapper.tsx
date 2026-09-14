"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";

const AUTH_ROUTES = ["/login", "/signup", "/reset-password", "/update-password"];
const PUBLIC_ROUTES = [
  "/login",
  "/signup",
  "/reset-password",
  "/update-password",
  "/cancel-appointment",
];

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Remove locale prefix to check the actual route
  const route = pathname.replace(/^\/[a-z]{2}/, "") || "/";
  const isAuthPage = AUTH_ROUTES.some((authRoute) =>
    route.startsWith(authRoute)
  );
  const isPublicPage = PUBLIC_ROUTES.some((publicRoute) =>
    route.startsWith(publicRoute)
  );

  useEffect(() => {
    // Update body class based on page type
    if (isAuthPage || isPublicPage) {
      document.body.className = document.body.className.replace(
        "bg-sidebar",
        "bg-background"
      );
    } else {
      if (!document.body.className.includes("bg-sidebar")) {
        document.body.className = document.body.className.replace(
          "bg-background",
          "bg-sidebar"
        );
      }
    }
  }, [pathname, isAuthPage, isPublicPage]);

  // For auth pages and public pages, render children without SidebarProvider wrapper
  if (isAuthPage || isPublicPage) {
    return <>{children}</>;
  }

  // For protected pages, wrap with SidebarProvider
  return <SidebarProvider>{children}</SidebarProvider>;
}
