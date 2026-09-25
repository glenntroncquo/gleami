#!/usr/bin/env bash
# Apply the schema migration on a throwaway database and run the RLS proof.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DB="marketplace_rls_$$"

sudo -u postgres psql -v ON_ERROR_STOP=1 -c "drop database if exists ${DB};" >/dev/null
sudo -u postgres psql -v ON_ERROR_STOP=1 -c "create database ${DB};" >/dev/null
sudo -u postgres psql -v ON_ERROR_STOP=1 -d "$DB" -f "$ROOT/tests/marketplace/stub.sql" >/dev/null
sudo -u postgres psql -v ON_ERROR_STOP=1 -d "$DB" -f "$ROOT/supabase/migrations/20260924183000_marketplace_schema.sql" >/dev/null
sudo -u postgres psql -v ON_ERROR_STOP=1 -d "$DB" -f "$ROOT/tests/marketplace/rls-check.sql"
sudo -u postgres psql -v ON_ERROR_STOP=1 -c "drop database ${DB};" >/dev/null
