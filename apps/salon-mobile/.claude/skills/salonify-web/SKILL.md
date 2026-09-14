---
name: salonify-web
description: Reference for the Salonify Next.js web app that this Expo/React Native app is a mobile port of — route/screen mapping, domain model (appointments, staff scheduling, orders/payments), Supabase schema and multi-tenancy pattern, and i18n terminology (Dutch default). Use whenever building, changing, or reviewing a mobile screen that has a web counterpart, to keep copy, field lists, status logic, and business rules consistent between the two apps.
---

# Salonify Web (source of truth for this mobile app)

This Expo app (`platform-app`) is a mobile port of a Next.js web app that lives in a sibling directory:

```
/Users/glenntroncquo/Documents/salonify/platform/client
```

They are separate codebases (different frameworks, different component libraries) with **no shared code** — but the same product, same Supabase backend/project, and the same business rules. When a mobile screen has a web counterpart, read the web files below *before* implementing or changing behavior, to confirm the field list, copy/terminology, status logic, and edge cases the web app already solved. Port the **behavior and domain rules**, not the JSX/component code — the two UI layers are intentionally different (native sheets/headers vs. Radix dialogs/sheets).

Do not assume the web app is bug-free or that its exact UI should be copied pixel-for-pixel — it's a reference for *domain correctness*, not a spec to blindly mirror.

## Screen mapping (mobile → web)

| Mobile file (`platform-app`) | Web equivalent (`platform/client`) |
|---|---|
| `app/(tabs)/index.tsx` (calendar tab) | `app/[locale]/calendar/page.tsx` + `components/event-calendar/` (`month-view.tsx`, `week-view.tsx`, `day-view.tsx`, `agenda-view.tsx`) |
| `app/day/[date].tsx` | `components/event-calendar/day-view.tsx`, `app/[locale]/timeline/page.tsx` |
| `app/appointment-new.tsx`, `app/appointment/[id].tsx` | `components/appointment-sheet.tsx` (large — full appointment lifecycle: client search, treatments, staff, payment) + `components/event-calendar/event-dialog.tsx` |
| `app/(tabs)/list.tsx`, `app/client/[id].tsx`, `app/client/new.tsx` | `app/[locale]/client/page.tsx` + `components/client-sheet.tsx` (create/edit) + `components/client-detail-sheet.tsx` (read view) |
| `app/staff/index.tsx`, `app/staff/[id].tsx`, `app/staff/[id]/availability.tsx`, `app/staff/[id]/schedule.tsx`, `app/staff/[id]/time-off.tsx`, `app/staff/new.tsx`, `app/staff/time-off-new.tsx` | `app/[locale]/staff/page.tsx` + `app/[locale]/staff/[staffId]/` + `components/staff-schedule/` + `components/availability-selector-dialog.tsx` + `components/unavailability-dialog.tsx` |
| `app/treatments/index.tsx`, `app/treatments/[id].tsx`, `app/treatments/new.tsx`, `app/treatments/price-option.tsx` | `app/[locale]/treatment/page.tsx` + `components/treatment-sheet.tsx` + `lib/treatment-colors.ts` |
| `app/orders/index.tsx`, `app/orders/[id].tsx` | `app/[locale]/orders/page.tsx` |
| `app/checkout/[appointmentId].tsx` | `components/embedded-pos/` (reusable POS/payment module, also used inline inside `appointment-sheet.tsx`) + `app/[locale]/pos/` |
| `app/dashboard/index.tsx` | `app/[locale]/dashboard/page.tsx` |
| `app/settings/index.tsx` | `app/[locale]/settings/page.tsx` |
| `app/(tabs)/more.tsx` | No direct equivalent — web uses a persistent sidebar (`app-sidebar.tsx`) instead of a "more" menu, since it's not space-constrained like a phone. |

Products, referrals/marketing and the public booking widget exist on web (`app/[locale]/products/`, `app/[locale]/marketing/referrals/`, `components/booking-widget/`) with no mobile screen yet.

## Domain model — things the web app already figured out

- **Appointments have many treatments, not one.** Join table `appointment_treatment` (→ `treatment`/`price_option`). Legacy single `treatment_id`/`price_option_id` columns still exist on `appointment` for old rows but new appointments populate the join table. Model the mobile appointment form/detail around a treatment **list**, not a single treatment field.
- **No DB enums.** `appointment.status`, `order.payment_status` etc. are plain `string | null` — there's no canonical shared TS union to import. Cancellation is tracked by the boolean `appointment.is_canceled`, *not* a status string — check that field, don't string-match a "cancelled" status.
- **Observed `payment_status` values**: `"unpaid" | "pending" | "paid" | "partial" | "completed" | "failed"` (see `lib/client-history/history-display-utils.ts`, and `orders.statusLabels` in `messages/*.json`).
- **Staff scheduling is two tables**: `availability` (recurring weekly rows: `day_of_week` 0–6, `start`/`end` time, `recurring: boolean`) and `unavailability` (one-off blocks: nullable `start`/`end` timestamps). Query reference: `lib/api/staff/queries/fetch-week-schedule.ts`.
- **Multi-tenancy via Supabase RLS, not app-level filters.** Queries generally do *not* add `.eq("company_id", ...)` manually — Postgres RLS policies scope every table. `companyId` comes from Supabase Auth `user.app_metadata.company_ids[0]` (array reserved for future multi-company support; currently always a single company). The mobile app's Supabase client must rely on the same RLS policies rather than adding its own tenant filtering.
- **Checkout/POS is a distinct reusable module** (`components/embedded-pos/`) with its own cart, split-payment (`SplitPayment` type), and order creation (`lib/api/pos/mutations/create-order.ts`). It's invoked both standalone (`/pos`) and inline from the appointment sheet — mirrors how `app/checkout/[appointmentId].tsx` should relate to a future standalone POS screen on mobile.
- **Authoritative DB schema**: `lib/types/supabase-types.ts` in the web repo (generated via `npm run codegen` from the live Supabase project `kvhinnhnwgvdpzggdnxs`) — check this file for real column names/types before guessing.

## Calendar event color palette

Treatments have a `color` string mapped through `lib/treatment-colors.ts` to a fixed 12-value palette (also defined as CSS vars in `app/globals.css` and as the `EventColor` type in `components/event-calendar/types.ts`):

```
blue, orange, violet, rose, emerald, cyan, lime, pink, indigo, amber, teal, purple
```

Keep this exact palette (name-for-name) in the mobile app's theme so an appointment shows the same color on both platforms.

## i18n / terminology

Web uses `next-intl`, default locale **`nl`** (Dutch), also `en`/`fr`/`pt`, in `messages/{locale}.json` — nested by feature (`common`, `appointments`, `clients`, `staff`, `treatments`, `orders`, `appointments.orderPanel.*`, etc.), same key structure across all four locale files. This mobile app's `lib/i18n/locales/{en,nl,pt}.json` is a separate, smaller key set — when adding a mobile string that has a web equivalent, reuse the same Dutch/English wording (e.g. `common.save` → `"Opslaan"`) rather than inventing new copy, so the two apps read the same to a salon owner switching between them.

## When porting a screen

1. Open the mapped web file(s) above and read the fields, validation, and any status/edge-case handling.
2. Check `lib/api/<domain>/queries|mutations/*.ts` in the web repo for the actual Supabase query shape (selects, joins) for that domain — reuse the same relational selects rather than re-deriving them, since the mobile app hits the same tables under the same RLS.
3. Match Dutch copy from `messages/nl.json` where a string overlaps.
4. Don't port UI mechanics (Radix `Sheet`, `react-hook-form`, desktop/mobile responsive branching) — the native equivalents (React Navigation modal presentation, plain `useState` forms as already used in this app) are the right tool here.
