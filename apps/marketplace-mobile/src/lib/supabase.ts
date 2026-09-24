import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

import { supabaseAnonKey, supabaseConfigured, supabaseUrl } from '@/src/config';
import { authStorage } from '@/src/lib/secure-store';

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (client) return client;
  if (!supabaseConfigured) {
    throw new Error(
      'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. Add them to your .env file.',
    );
  }
  client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: authStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  return client;
}

if (Platform.OS !== 'web' || typeof window !== 'undefined') {
  AppState.addEventListener('change', (state) => {
    if (!client) return;
    if (state === 'active') {
      client.auth.startAutoRefresh();
    } else {
      client.auth.stopAutoRefresh();
    }
  });
}
