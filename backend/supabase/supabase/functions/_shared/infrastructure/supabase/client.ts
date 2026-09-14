import { createClient, SupabaseClient } from "supabase";
import type { Database } from "@/types/database";

export type TypedSupabaseClient = SupabaseClient<Database>;

export const createSupabaseClient = (): TypedSupabaseClient => {
  return createClient<Database>(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
};

// Shared singleton for repositories: an edge function isolate serves many
// requests, so one admin client per isolate is reused rather than
// constructed and threaded through on every call.
export const supabaseAdmin: TypedSupabaseClient = createSupabaseClient();
