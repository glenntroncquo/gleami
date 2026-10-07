# Gleami marketplace web

The public, SEO-first Gleami website built with Next.js App Router.

It contains:

- the consumer salon marketplace;
- crawlable salon, city, and treatment pages;
- localized business marketing pages;
- reusable metadata, canonical, hreflang, and JSON-LD helpers;
- a segmented sitemap index.

The authenticated salon product remains at `app.gleami.eu` and is not part of
this application.

## Local development

```bash
cp .env.local.example .env.local
npm install
npm run dev
```

Without Supabase environment values the site uses clearly labelled
illustrative marketplace data. Those demo-backed pages emit `noindex` and are
excluded from sitemaps.
