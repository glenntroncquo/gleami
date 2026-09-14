"use client";

import { Suspense } from "react";
import SignupCheckEmailContent from "./check-email-content";

export default function SignupCheckEmailPage() {
  return (
    <Suspense fallback={null}>
      <SignupCheckEmailContent />
    </Suspense>
  );
}
