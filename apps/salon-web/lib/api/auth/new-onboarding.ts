import { createClient } from "@/lib/supabase/client";

const endpoint = (name: string) => `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${name}`;

export async function lookupAuthEmail(email: string) {
  const response = await fetch(endpoint("marketplace-auth-lookup"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
    },
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "Unable to check this email");
  return result as { exists: boolean; hasPassword: boolean };
}

export async function startEmailAuth(email: string) {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { shouldCreateUser: false },
  });
  if (error) throw error;
}

export async function startSocialAuth(provider: "google" | "apple", locale: string, next?: string) {
  const supabase = createClient();
  const callback = new URLSearchParams({ locale });
  if (next) callback.set("next", next);
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${window.location.origin}/auth/callback?${callback.toString()}` },
  });
  if (error) throw error;
}

export type SetupDraft = {
  id: string;
  companyId: string;
  locationId: string | null;
  currentStep: number;
  status: "in_progress" | "completed";
  businessName: string | null;
  website: string | null;
  categories: string[];
  teamSize: string | null;
  currentSoftware: string | null;
  address: Record<string, string>;
  openingHours: Record<string, { closed?: boolean; start?: string; end?: string }>;
  completedAt: string | null;
};

type SetupRpc = {
  rpc: (
    fn: string,
    args?: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: { message?: string } | null }>;
};

function setupClient() {
  return createClient() as unknown as SetupRpc;
}

function rpcError(error: { message?: string } | null, fallback: string) {
  return new Error(error?.message || fallback);
}

export async function loadSalonSetup(setupId?: string | null): Promise<SetupDraft | null> {
  const { data, error } = await setupClient().rpc("get_salon_setup", {
    p_setup_id: setupId ?? null,
  });
  if (error) throw rpcError(error, "Could not load setup");
  if (!data) return null;
  return data as SetupDraft;
}

export async function saveSalonSetup(
  step: number,
  data: unknown,
  setupId: string | null,
  idempotencyKey: string | null,
): Promise<SetupDraft> {
  const { data: saved, error } = await setupClient().rpc("save_salon_setup", {
    p_step: step,
    p_payload: data ?? {},
    p_setup_id: setupId,
    p_idempotency_key: idempotencyKey,
  });
  if (error || !saved) throw rpcError(error, "Could not save setup");
  return saved as SetupDraft;
}

export async function discardSalonSetup(setupId: string): Promise<void> {
  const { error } = await setupClient().rpc("discard_salon_setup", { p_setup_id: setupId });
  if (error) throw rpcError(error, "Could not discard this setup");
}
