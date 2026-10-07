import Link from "next/link";
import { ArrowRightIcon, ChevronRightIcon } from "lucide-react";
import { blogPosts, type BlogPost } from "@/data/blog";
import { getCopy } from "@/lib/copy";
import {
  blogPostSlugs,
  localeConfig,
  routeFor,
  type BlogPostKey,
  type Locale,
} from "@/lib/i18n";

export function BlogIndex({ locale }: { locale: Locale }) {
  const copy = getCopy(locale);
  const language = localeConfig[locale].language;
  const posts = Object.keys(blogPostSlugs) as BlogPostKey[];

  return (
    <div className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-24">
      <p className="text-[14px] font-medium text-rose-600">
        {copy.footer.company}
      </p>
      <h1 className="mt-4 max-w-4xl text-balance text-[48px] font-semibold leading-[1.03] tracking-tightest md:text-[72px]">
        {language === "fr"
          ? "Conseils pour faire grandir votre salon."
          : language === "de"
            ? "Ideen für einen ruhigen Salonalltag."
            : "Inzichten voor een salon die vlot draait."}
      </h1>
      <div className="mt-16 grid gap-5 md:grid-cols-2">
        {posts.map((postKey) => {
          const post = blogPosts[postKey][language];
          return (
            <article
              key={postKey}
              className="rounded-[28px] bg-white p-8 ring-1 ring-line"
            >
              <p className="text-[13px] font-medium text-rose-700">
                {post.category}
              </p>
              <h2 className="mt-4 text-[28px] font-semibold leading-tight tracking-tight">
                {post.title}
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-muted">
                {post.description}
              </p>
              <Link
                href={routeFor(locale, { kind: "blog-post", post: postKey })}
                className="mt-8 inline-flex items-center gap-2 text-[14px] font-medium"
              >
                {copy.actions.viewSalon.replace(
                  /salon|le salon|Salon/,
                  language === "fr" ? "l’article" : language === "de" ? "Artikel" : "artikel",
                )}
                <ArrowRightIcon aria-hidden="true" className="h-4 w-4" />
              </Link>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export function BlogArticle({
  locale,
  post,
}: {
  locale: Locale;
  post: BlogPost;
}) {
  const copy = getCopy(locale);

  return (
    <article className="mx-auto max-w-4xl px-5 pb-24 pt-10 md:px-8 md:pb-32 md:pt-14">
      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center gap-1.5 text-[13px] text-muted"
      >
        <Link href={routeFor(locale, { kind: "home" })}>Gleami</Link>
        <ChevronRightIcon aria-hidden="true" className="h-3.5 w-3.5" />
        <Link href={routeFor(locale, { kind: "blog" })}>
          {copy.footer.company}
        </Link>
        <ChevronRightIcon aria-hidden="true" className="h-3.5 w-3.5" />
        <span className="text-ink">{post.category}</span>
      </nav>

      <header className="mt-12">
        <p className="text-[14px] font-medium text-rose-600">{post.category}</p>
        <h1 className="mt-4 text-balance text-[46px] font-semibold leading-[1.03] tracking-tightest md:text-[70px]">
          {post.title}
        </h1>
        <p className="mt-6 max-w-2xl text-[19px] leading-relaxed text-muted">
          {post.description}
        </p>
        <p className="mt-6 text-[13px] text-subtle">
          <time dateTime={post.publishedAt}>{post.publishedAt}</time> ·{" "}
          {post.readingTime}
        </p>
      </header>

      <div className="mt-14 rounded-[28px] bg-white p-7 text-[18px] leading-8 text-ink ring-1 ring-line md:p-10">
        {post.intro}
      </div>

      <div className="mt-16 space-y-16">
        {post.sections.map((section) => (
          <section key={section.title}>
            <h2 className="text-[30px] font-semibold tracking-tight md:text-[38px]">
              {section.title}
            </h2>
            <div className="mt-5 space-y-5 text-[17px] leading-8 text-muted">
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            {section.bullets ? (
              <ul className="mt-6 space-y-3 rounded-[24px] bg-sage-50 p-6 ring-1 ring-sage-100">
                {section.bullets.map((bullet) => (
                  <li
                    key={bullet}
                    className="flex gap-3 text-[15px] leading-relaxed text-muted"
                  >
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sage-600" />
                    {bullet}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>

      <aside className="mt-20 rounded-[28px] bg-ink p-8 text-white md:p-10">
        <h2 className="text-[28px] font-semibold">{copy.business.finalTitle}</h2>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-white/65">
          {copy.business.finalBody}
        </p>
        <Link
          href={routeFor(locale, { kind: "business" })}
          className="mt-7 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-[14px] font-medium text-ink"
        >
          {copy.nav.business}
          <ArrowRightIcon aria-hidden="true" className="h-4 w-4" />
        </Link>
      </aside>
    </article>
  );
}
