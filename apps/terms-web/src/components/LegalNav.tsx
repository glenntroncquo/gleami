"use client";

import Link from "next/link";
import { documents, documentPath, overviewPath, type DocId } from "@/content/documents";
import { getCopy } from "@/lib/copy";
import { languageOf } from "@/lib/i18n";
import { useLegalRoute } from "@/lib/route";

export function LegalNav() {
  const { locale, active } = useLegalRoute();
  const language = languageOf(locale);
  const copy = getCopy(language);
  const items: Array<{ id: DocId | "overview"; href: string; label: string }> = [
    { id: "overview", href: overviewPath(locale), label: copy.overview },
    ...documents.map((document) => ({
      id: document.id,
      href: documentPath(locale, document.id),
      label: document.nav[language],
    })),
  ];

  return (
    <nav aria-label={copy.documentsLabel} className="border-b border-line bg-page/85 backdrop-blur-md">
      <div className="no-scrollbar mx-auto flex max-w-7xl gap-6 overflow-x-auto px-5 md:px-8">
        {items.map((item) => {
          const current = item.id === active;
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={current ? "page" : undefined}
              className={`shrink-0 border-b-2 py-3.5 text-[15px] transition-colors duration-150 ${
                current
                  ? "border-ink font-semibold text-ink"
                  : "border-transparent font-medium text-muted hover:text-ink"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
