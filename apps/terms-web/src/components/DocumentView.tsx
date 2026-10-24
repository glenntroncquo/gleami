import Link from "next/link";
import { documentPath, getDocument, type DocId, type Section } from "@/content/documents";
import { getCopy } from "@/lib/copy";
import { languageOf, type Locale } from "@/lib/i18n";

const MAIL = "support@gleami.be";

export function DocumentView({ locale, id }: { locale: Locale; id: DocId }) {
  const language = languageOf(locale);
  const copy = getCopy(language);
  const document = getDocument(id);
  const sections = document.sections[language];

  return (
    <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 md:px-8 md:py-16 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-16">
      <nav aria-label={copy.onThisPage} className="lg:sticky lg:top-36 lg:max-h-[calc(100vh-10rem)] lg:self-start lg:overflow-y-auto">
        <ol className="flex gap-x-4 gap-y-2 overflow-x-auto lg:block lg:space-y-2.5">
          {sections.map((section) => (
            <li key={section.id} className="shrink-0">
              <a
                href={`#${section.id}`}
                className="text-[14px] font-medium text-peri transition-colors duration-150 hover:text-peri-dark"
              >
                {section.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>
      <article className="min-w-0 lg:border-l lg:border-line lg:pl-12">
        <h1 className="text-[32px] font-semibold tracking-tight text-ink md:text-[40px]">
          {document.title[language]}
        </h1>
        <p className="mt-3 text-[14px] text-muted">{copy.draft}</p>
        <div className="mt-10 max-w-3xl space-y-10">
          {sections.map((section) => (
            <SectionView key={section.id} locale={locale} section={section} />
          ))}
        </div>
      </article>
    </div>
  );
}

function SectionView({ locale, section }: { locale: Locale; section: Section }) {
  return (
    <section aria-labelledby={section.id}>
      <h2 id={section.id} className="legal-heading text-[22px] font-semibold tracking-tight text-ink">
        {section.title}
      </h2>
      <div className="mt-3 space-y-4 text-[15px] leading-7 text-ink-soft">
        {section.body.map((block, index) =>
          Array.isArray(block) ? (
            <ul key={index} className="list-disc space-y-2 pl-5">
              {block.map((item) => (
                <li key={item}>
                  <RichText locale={locale} text={item} />
                </li>
              ))}
            </ul>
          ) : (
            <p key={index}>
              <RichText locale={locale} text={block} />
            </p>
          ),
        )}
      </div>
    </section>
  );
}

function RichText({ locale, text }: { locale: Locale; text: string }) {
  const parts = text.split(/\{(privacy|terms|service|partner|data|cookies|mail)\}/g);
  return parts.map((part, index) => {
    if (index % 2 === 0) return part;
    if (part === "mail") {
      return (
        <a key={index} href={`mailto:${MAIL}`} className="font-medium text-peri hover:text-peri-dark">
          {MAIL}
        </a>
      );
    }
    const id = part as DocId;
    const document = getDocument(id);
    return (
      <Link
        key={index}
        href={documentPath(locale, id)}
        className="font-medium text-peri hover:text-peri-dark"
      >
        {document.nav[languageOf(locale)].toLowerCase()}
      </Link>
    );
  });
}
