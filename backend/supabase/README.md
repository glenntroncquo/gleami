# Salonify Supabase Integration Project

This guide explains how to set up and run integration tests for the Salonify Supabase Backend/Edge Functions.

## 1. Prerequisites

- **Docker** installed globally ([Install Docker](https://docs.docker.com/get-docker/))
- **Supabase CLI** installed globally:
  ```sh
  npm install -g supabase
  ```
- **Node.js** and **npm** installed ([Install Node.js](https://nodejs.org/))

## 2. Link to Your Supabase Project

Link your local project to your Supabase project:

```sh
supabase link --project-ref your-project-ref
```

Replace `your-project-ref` with your actual Supabase project reference.

## 3. Pull the Latest Database Schema

Fetch the latest schema from your Supabase project:

```sh
supabase db pull
```

## 4. Install Dependencies

If you haven’t already, install the project dependencies:

```sh
npm install
```

## 5. Run Integration Tests

Run your integration tests:

```sh
npm run test
```

---

## Automatic Edge Function deploys

Pushes to `main` in the **gleami** monorepo that change files under `backend/supabase/supabase/functions/` run [`.github/workflows/deploy-edge-functions.yml`](../../.github/workflows/deploy-edge-functions.yml) at the repo root.

- If any file under `…/functions/<name>/` changes and `<name>` is not `_shared`, that function is deployed.
- If `_shared`, `import_map.json`, or other shared paths under `…/functions/` change, every top-level function folder except `_shared` is redeployed.
- `_shared` is never treated as a deployable function name.
- You can also run **Actions → Deploy Edge Functions → Run workflow** to deploy every function.

The workflow runs `supabase functions deploy` from `backend/supabase` (where `supabase/config.toml` lives). It does not disable JWT verification.

### One-time GitHub secrets (required)

In the **`glenntroncquo/gleami`** repo: **Settings → Secrets and variables → Actions → New repository secret**.

| Secret | Where to get it |
| --- | --- |
| `SUPABASE_ACCESS_TOKEN` | [Supabase Account tokens](https://supabase.com/dashboard/account/tokens). Create a personal access token that can access the SalonFlow project. |
| `SUPABASE_PROJECT_ID` | SalonFlow project ref: `kvhinnhnwgvdpzggdnxs`. Stored as a secret so the target project can change without a code change. |

`SUPABASE_PROJECT_ID` may instead be a repository **variable** with the same name. If both exist, the secret wins.

Do not commit tokens. After this workflow is on `main` and both values are set, later merges that touch Edge Functions deploy automatically.

(The old standalone `Gleami-Salon-Software/backend` repo is retired; deploy from this monorepo only.)

---

## Troubleshooting

- Ensure you have the correct project reference when linking. The password of the db is also required.
- If you encounter issues with the Supabase CLI, try updating it: `npm install -g supabase@latest`.
- For persistent issues, check your Supabase project settings and database connectivity.
