/** Ghent city centre. Used when device location is unavailable or denied. */
export const GHENT = { lat: 51.0543, lng: 3.7174 };
/** @deprecated Prefer GHENT for the no-location fallback. */
export const BRUSSELS = GHENT;

/** Wide enough to include Ghent and Antwerp from Brussels. */
export const DEFAULT_RADIUS_KM = 70;

/** Small enough that the 12 example salons span two pages. */
export const PAGE_SIZE = 8;

export const BOOKING_WEB_ORIGIN =
  process.env.EXPO_PUBLIC_BOOKING_WEB_URL?.replace(/\/$/, '') || 'https://booking.salonify.co';

export const useMocks = process.env.EXPO_PUBLIC_USE_MOCKS === '1';

export const mapboxToken = process.env.EXPO_PUBLIC_MAPBOX_TOKEN?.trim() || '';

export const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() || '';

export const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() || '';

export const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() || '';

export const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() || '';

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
