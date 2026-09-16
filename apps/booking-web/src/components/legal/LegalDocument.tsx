import Link from "next/link";

type LegalDocumentProps = {
  title: string;
  children: React.ReactNode;
};

export function LegalDocument({ title, children }: LegalDocumentProps) {
  return (
    <article className="mx-auto max-w-2xl px-6 py-12">
      <p className="text-sm font-medium tracking-wide text-neutral-400 uppercase">
        Salonify
      </p>
      <h1 className="mt-3 text-2xl font-semibold text-neutral-900">{title}</h1>
      <p className="mt-2 text-sm text-neutral-500">
        Last updated: 6 September 2026 · Draft — not legal advice
      </p>

      <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        This is a short placeholder policy for store listing and public
        reference. It has not been reviewed by legal counsel. Final text will
        replace this draft.
      </div>

      <div className="mt-8 space-y-6 text-sm leading-6 text-neutral-700">
        {children}
      </div>

      <nav className="mt-12 flex gap-4 border-t border-neutral-200 pt-6 text-sm">
        <Link className="text-neutral-700 underline underline-offset-2" href="/privacy">
          Privacy Policy
        </Link>
        <Link className="text-neutral-700 underline underline-offset-2" href="/terms">
          Terms of Service
        </Link>
      </nav>
    </article>
  );
}
