"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NewReferralCodeRoute() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/marketing/referrals/codes");
  }, [router]);

  return null;
}

