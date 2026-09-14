# Salonify Booking

Public booking site for `booking.salonify.co`.

Visitors open `/{companyId}` and see the booking widget embedded via iframe.
This repo does **not** query booking-domain tables (`service` /
`service_variant` / `staff_schedule_*` / `appointment_segment`, or the legacy
`treatment` / `price_option` / `availability` names). Catalog, availability, and
booking writes live in [`booking-widget`](https://github.com/glenntroncquo/booking-widget).
The only Supabase call here is `company-get`, for public company metadata (SEO /
404).

There is no npm embed package to pin — the widget is loaded by URL
(`NEXT_PUBLIC_WIDGET_DOMAIN`).

## Routes

- `/` — 404 (no landing page)
- `/{companyId}` — booking page (embeds the widget iframe)
- `/{companyId}?staff={uuid}` — optional preselected staff member(s)
- `/{companyId}/{staffSlug}` — staff-scoped booking page
- `/{companyId}?serviceIds={uuid}&serviceVariantIds={uuid}` — optional service /
  variant preselection forwarded to the widget (segments API)

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
