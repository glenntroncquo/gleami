import { headers } from "next/headers";
import { originFromRequestHeaders } from "@/lib/public-origin";
import { APP_URL } from "@/lib/supabase/config";

/** Prefer the incoming Host so Stripe returns to this deployment, not a typo'd env URL. */
export async function getBookingOrigin(): Promise<string> {
  const origin = originFromRequestHeaders(await headers());
  return origin || APP_URL;
}
