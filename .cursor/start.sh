#!/usr/bin/env bash
# Per-boot runtime configuration. Writes the local env files the web apps read.
# The Supabase project URL and widget domain are public (they are committed in
# apps/booking-web/.env.local.example); only the publishable anon key is a
# secret and is injected as an environment variable.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-https://kvhinnhnwgvdpzggdnxs.supabase.co}"
ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}"
WIDGET_DOMAIN="${NEXT_PUBLIC_WIDGET_DOMAIN:-https://booking-widget-nine.vercel.app}"

# salon-web (Next.js management app) -> http://localhost:3000
cat > "$ROOT/apps/salon-web/.env.local" <<EOF
NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY
NEXT_PUBLIC_WIDGET_DOMAIN=$WIDGET_DOMAIN
EOF

# booking-web (Next.js public booking site) -> http://localhost:3002
cat > "$ROOT/apps/booking-web/.env.local" <<EOF
NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY
NEXT_PUBLIC_APP_URL=http://localhost:3002
NEXT_PUBLIC_WIDGET_DOMAIN=$WIDGET_DOMAIN
EOF

# booking-widget (Vite) -> http://localhost:5173
cat > "$ROOT/apps/booking-widget/.env" <<EOF
VITE_SUPABASE_URL=$SUPABASE_URL
VITE_SUPABASE_ANON_KEY=$ANON_KEY
EOF

if [ -z "$ANON_KEY" ]; then
  echo "WARNING: NEXT_PUBLIC_SUPABASE_ANON_KEY is not set. The salon-web and" >&2
  echo "         booking-web apps will return HTTP 500 (Supabase client needs a" >&2
  echo "         key) until the secret is provided in the environment." >&2
fi

echo "==> start: wrote env files for salon-web, booking-web, booking-widget"
