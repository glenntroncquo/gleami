function clean(value: string | undefined): string {
  return (value ?? "").trim().replace(/^["']|["']$/g, "");
}

export const SUPABASE_URL =
  clean(process.env.NEXT_PUBLIC_SUPABASE_URL).replace(/\/+$/, "") ||
  "https://kvhinnhnwgvdpzggdnxs.supabase.co";

export const SUPABASE_ANON_KEY = clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export const APP_URL =
  clean(process.env.NEXT_PUBLIC_APP_URL) || "https://booking.salonify.co";
