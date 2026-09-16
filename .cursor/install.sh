#!/usr/bin/env bash
# Idempotent dependency install for the gleami monorepo.
# Runs after the repository is checked out. Each app pins its own lockfile,
# so we install per package directory with `npm ci`.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

install_app() {
  local dir="$1"
  if [ -f "$ROOT/$dir/package-lock.json" ]; then
    echo "==> npm ci in $dir"
    (cd "$ROOT/$dir" && npm ci --no-audit --no-fund)
  else
    echo "==> skip $dir (no package-lock.json)"
  fi
}

# Web apps that run and are demoable in the cloud VM.
install_app "apps/salon-web"
install_app "apps/booking-web"
install_app "apps/booking-widget"

# Supabase backend (edge functions + vitest integration tests).
install_app "backend/supabase"

# Expo / React Native apps. Installed so agents can lint and edit them; they
# cannot be launched in a headless cloud VM.
install_app "apps/salon-mobile"
install_app "apps/marketplace-web/airbnb-clone-react-native"

echo "==> install complete"
