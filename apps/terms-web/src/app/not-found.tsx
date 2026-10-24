import Link from "next/link";
import { overviewPath } from "@/content/documents";
import { copy } from "@/lib/copy";

export default function NotFound() {
  return (
    <main id="main" className="mx-auto max-w-7xl px-5 py-24 md:px-8">
      <h1 className="text-[32px] font-semibold tracking-tight">{copy.notFoundTitle}</h1>
      <p className="mt-3 text-[15px] text-muted">{copy.notFoundBody}</p>
      <Link href={overviewPath} className="mt-6 inline-flex text-[15px] font-medium text-peri">
        {copy.notFoundBack}
      </Link>
    </main>
  );
}
