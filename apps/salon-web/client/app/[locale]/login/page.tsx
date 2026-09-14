"use client";

import { Suspense } from "react";
import LoginPageContent from "./login-content";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}
