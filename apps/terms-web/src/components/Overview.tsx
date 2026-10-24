import Link from "next/link";
import { documentPath, documents } from "@/content/documents";
import { copy } from "@/lib/copy";

export function Overview() {
  return (
    <div className="mx-auto grid max-w-7xl gap-x-16 gap-y-14 px-5 py-14 sm:grid-cols-2 md:px-8 md:py-20 lg:grid-cols-3">
      {documents.map((document) => (
        <article key={document.id}>
          <h2 className="text-[22px] font-semibold tracking-tight text-ink">{document.nav}</h2>
          <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-muted">{document.summary}</p>
          <Link
            href={documentPath(document.id)}
            className="mt-5 inline-flex text-[15px] font-medium text-peri transition-colors duration-150 hover:text-peri-dark"
          >
            {copy.read[document.id]}
          </Link>
        </article>
      ))}
    </div>
  );
}
