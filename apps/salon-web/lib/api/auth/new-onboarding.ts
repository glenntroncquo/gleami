import { createClient } from "@/lib/supabase/client";

const endpoint = (name: string) => `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${name}`;

export async function startEmailAuth(email: string, locale: string) {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { emailRedirectTo: `${window.location.origin}/auth/callback?locale=${locale}&next=/${locale}/setup` },
  });
  if (error) throw error;
}

export async function startSocialAuth(provider: "google" | "apple", locale: string) {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${window.location.origin}/auth/callback?locale=${locale}&next=/${locale}/setup` },
  });
  if (error) throw error;
}

export type SetupDraft = {
  user_id: string;
  company_id: string | null;
  location_id: string | null;
  current_step: number;
  business_name: string | null;
  website: string | null;
  categories: string[];
  team_size: string | null;
  current_software?: string | null;
  address: Record<string, string>;
  opening_hours: Record<string, { closed?: boolean; start?: string; end?: string }>;
  completed_at: string | null;
};

async function callSetup(functionName: string, body?: unknown) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Sign in to continue setup");
  const response = await fetch(endpoint(functionName), {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json", apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, Authorization: `Bearer ${session.access_token}` },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "Unable to save setup");
  return result;
}

export async function loadSalonSetup(): Promise<SetupDraft | null> {
  const result = await callSetup("salon-setup-get");
  return result.setup;
}

export async function saveSalonSetup(step: number, data: unknown): Promise<SetupDraft> {
  const result = await callSetup("salon-setup-save", { step, data });
  return result.setup;
}
