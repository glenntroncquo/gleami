import { SITE_ORIGIN } from "@/lib/seo";
import { getPublishedSalonCount } from "@/data/marketplace";

export const revalidate = 3600;

const SALON_RECORDS_PER_SITEMAP = 5_000;
const fixedSitemaps = [
  "/sitemaps/static/0.xml",
  "/sitemaps/cities/0.xml",
  "/sitemaps/treatments/0.xml",
  "/sitemaps/blog/0.xml",
];

export async function GET() {
  const salonCount = await getPublishedSalonCount();
  const salonSitemapCount = Math.max(
    1,
    Math.ceil(salonCount / SALON_RECORDS_PER_SITEMAP),
  );
  const sitemapPaths = [
    ...fixedSitemaps,
    ...Array.from(
      { length: salonSitemapCount },
      (_, page) => `/sitemaps/salons/${page}.xml`,
    ),
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapPaths
  .map(
    (path) => `  <sitemap>
    <loc>${SITE_ORIGIN}${path}</loc>
  </sitemap>`,
  )
  .join("\n")}
</sitemapindex>`;

  return new Response(body, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
