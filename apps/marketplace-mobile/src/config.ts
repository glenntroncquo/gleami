/** Brussels city centre. Used until the user shares a location. */
export const BRUSSELS = { lat: 50.8503, lng: 4.3517 };

/** Wide enough to include Ghent and Antwerp from Brussels. */
export const DEFAULT_RADIUS_KM = 70;

/** Small enough that the 12 example salons span two pages. */
export const PAGE_SIZE = 8;

export const BOOKING_WEB_ORIGIN =
  process.env.EXPO_PUBLIC_BOOKING_WEB_URL?.replace(/\/$/, '') || 'https://booking.salonify.co';

export const useMocks = process.env.EXPO_PUBLIC_USE_MOCKS === '1';

export const mapboxToken = process.env.EXPO_PUBLIC_MAPBOX_TOKEN?.trim() || '';

export const appleSignInEnabled = process.env.EXPO_PUBLIC_ENABLE_APPLE_SIGN_IN === '1';

export const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() || '';

export const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() || '';

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
