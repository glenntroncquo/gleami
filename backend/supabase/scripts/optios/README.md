# Optios import tooling

One-off migration tooling for onboarding a salon from Optios. These are **local
operator scripts**, not edge functions, and they must stay that way.

## Why these are not edge functions

`optios-client-import` and `appointment-import-optios` used to be deployed edge
functions. Both ran with `SUPABASE_SERVICE_ROLE_KEY`, and `optios-client-import`
ran with `verify_jwt = false` and no caller check at all, so anyone on the
internet who knew the URL could drive a service-role write path. It also accepted
a caller-supplied `companyId` and linked any client it could match **by email**
into that company's primary location, which made it a cross-tenant client-linking
primitive.

Both functions were deleted from the Supabase project. A migration tool that runs
a handful of times per year should not be a permanently reachable HTTP endpoint.
Running it locally means the only credential path is a shell on a trusted machine.

## Running the client import

```bash
cd backend/supabase

SUPABASE_URL="https://<project-ref>.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="<service-role-key>" \
npx ts-node scripts/optios/import-clients.ts \
  --company <company-uuid> \
  --file ./optios-export.json \
  --batch 50 \
  --dry-run
```

Drop `--dry-run` to write. Start with `--dry-run` to confirm the company resolves
to the right primary location and the record counts look sane.

Never put the service-role key in a file that git can see. Export it into the
shell for the duration of the import, or source it from your password manager.

## Appointment import

`legacy/appointment-import-optios.deployed.ts` is the verbatim source recovered
from the deployed function before it was deleted, kept only as a reference.

**It does not run against the current schema.** It joins `client_company`, which
was dropped in `20260906075929_drop_client_company.sql`, and it writes
`treatment_id`, `price_option_id`, `duration_in_minutes`, `actual_start`,
`actual_end` and `image_url`, none of which exist on `appointment` any more.
Appointments are now modelled through booking segments and `service_variant`.

If appointment import is needed for a future Optios onboarding, it needs a
rewrite against the segment model rather than a port of this file.
