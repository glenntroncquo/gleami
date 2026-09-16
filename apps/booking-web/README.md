# Salonify Booking

Public booking site for `booking.salonify.co`.

Visitors open `/{companyId}` and see the booking widget embedded via iframe.
This repo does **not** call `service-list`, `availability-list`,
`appointment-create`, `appointment-cancel`, or `appointment-list`. Those folded
v1 slugs live in [`booking-widget`](https://github.com/glenntroncquo/booking-widget).
This site never used the additive `*-v2` slugs and does not call
`treatment-list`. No new public RPCs are added here.

Supabase usage on the host:

- `company-get` — public company metadata (SEO / 404). Optional
  `deposit_enabled` / `deposit_amount` fields are forwarded to the widget when
  present; they are not required.
- anon `GET /rest/v1/location` — existing RLS `location select (anon public booking)`
  to verify a location pin and read its name for title/canonical. Unknown
  locations 404 (or `noindex` + empty state if that read is unavailable).

There is no npm embed package to pin — the widget is loaded by URL
(`NEXT_PUBLIC_WIDGET_DOMAIN`).

## Routes

Path segments accept a company / location / staff **uuid or slug**. The host
resolves the company via `company-get`, verifies the location pin via anon
`location` SELECT, and forwards location/staff keys to the widget (`locationId`
/ `locationSlug`, `staffIds` / `staffSlugs`). The widget still resolves staff.
No booking-domain RPCs are added here. Titles include the location name when
known; canonical URLs prefer slugs. There is no sitemap. First-segment slugs
`privacy` and `terms` are reserved public legal pages (not company slugs).

- `/` — 404 unless `?companyId=` or `?companySlug=` (redirects to `/{company}`)
- `/privacy` — public Privacy Policy (draft; store / App URL)
- `/terms` — public Terms of Service (draft; store / App URL)
- `/{company}` — company booking page (no location; widget shows a location
  picker when the company has more than one)
- `/{company}/{location}` — location-scoped booking page
- `/{company}/{location}/{staff}` — location + staff preselect
- `/{company}?staff={uuid}` — optional staff preselect without a location
- `/{company}?serviceIds={uuid}&serviceVariantIds={uuid}` — optional service /
  variant preselection forwarded to the widget (`serviceIds` /
  `serviceVariantIds` only; no `treatmentId` / `priceOptionId` aliases)

### Test URL examples

```
/{company-uuid}
/{acme-salon}
/{acme-salon}/{ghent}
/{acme-salon}/{location-uuid}
/{acme-salon}/{ghent}/{anna}
/{acme-salon}/{ghent}/{staff-uuid}
/{company-uuid}/{location-uuid}/{staff-uuid}
/{acme-salon}/{ghent}?serviceIds={service-uuid}
```

There is **no shim** for the old `/{company}/{staff}` staff deep-link. That path
is unused in production and is now the **location** route. Staff preselect is
`/{company}/{location}/{staff}` only.

## Deposits (Stripe Checkout)

When the company has deposits enabled and the amount is > 0, public
`appointment-create` (called by the **widget**, not this host) returns a
**hold**, not a booking:

- `hold_id`
- `checkout_url`
- `hold_expires_at` / `expires_at`
- `status`: `hold_active`

There is **no `booking_id`** until pay (webhook creates the appointment).
The widget must postMessage `checkout_url` to the parent; this site
redirects the top window to Stripe Checkout (`checkout.stripe.com` only).
`booking_id` is never required for that redirect. Extra hold fields on the
postMessage are ignored.

Deposit-off create still returns **no** `checkout_url`. The widget confirms
in-place; this host does not redirect.

Stripe success / cancel should return to the same booking path:

```
/{company}?deposit=success
/{company}/{location}?deposit=cancel
```

The host always injects those absolute `https://` URLs into the widget iframe
(`successUrl` / `cancelUrl` and `success_url` / `cancel_url`) and via
`widget-config`, so create can send them when deposits apply.

`checkout=success|cancel` and Stripe `session_id` are also treated as a return.

Stripe only redirects to `success_url` after a paid Checkout session. The
host forwards `deposit=success` into the widget iframe so that screen is
the same **Tot snel!** + confetti as a normal / widget book — not a
separate host interstitial. Appointment create stays webhook-owned; the
host does **not** poll hold/appointment status. Cancel still shows the
soft-fail banner and leaves the widget up so the customer can retry.
Confirm-step deposit copy lives in the widget. No new public RPCs.

## Development

```bash
cp .env.local.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000/{company-uuid}`.

## Environment

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_WIDGET_DOMAIN=https://booking-widget-nine.vercel.app  # widget deployment
```
