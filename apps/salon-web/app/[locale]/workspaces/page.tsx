import Link from "next/link";
import { redirect } from "next/navigation";
import { selectEstablishedCompany } from "@/lib/auth/select-company";
import { loadAccountSnapshot } from "@/lib/auth/account-resolver";

export default async function WorkspacesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const snapshot = await loadAccountSnapshot();
  if (!snapshot.ok) redirect(`/${locale}/account-unavailable`);
  if (!snapshot.emailConfirmed) redirect(`/${locale}/login?error=confirm_email`);

  return (
    <main className="min-h-screen bg-white px-6 py-16 text-[#101114]">
      <div className="mx-auto max-w-xl">
        <p className="text-sm font-semibold text-[#737989]">Your salons</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em]">Choose where to continue</h1>
        <p className="mt-4 text-[#737989]">
          An unfinished company stays in setup. It does not replace a salon you already use.
        </p>

        {snapshot.companies.length > 0 && (
          <section className="mt-10 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[#737989]">Open a salon</h2>
            {snapshot.companies.map((company) => (
              <form key={company.id} action={selectEstablishedCompany}>
                <input type="hidden" name="companyId" value={company.id} />
                <input type="hidden" name="locale" value={locale} />
                <button
                  type="submit"
                  className="flex w-full items-center justify-between rounded-2xl border border-[#E5E9F2] px-5 py-4 text-left font-semibold hover:border-[#817BFA]"
                >
                  <span>{company.name}</span>
                  <span className="text-sm font-medium text-[#737989]">
                    {company.via === "location" ? "Location access" : "Open"}
                  </span>
                </button>
              </form>
            ))}
          </section>
        )}

        {snapshot.drafts.length > 0 && (
          <section className="mt-10 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[#737989]">Continue setup</h2>
            {snapshot.drafts.map((draft) => (
              <Link
                key={draft.id}
                href={`/${locale}/setup?draft=${draft.id}`}
                className="flex items-center justify-between rounded-2xl border border-[#E5E9F2] px-5 py-4 font-semibold hover:border-[#817BFA]"
              >
                <span>{draft.name}</span>
                <span className="text-sm font-medium text-[#737989]">Step {draft.currentStep} of 6</span>
              </Link>
            ))}
          </section>
        )}

        <Link
          href={`/${locale}/setup?new=1&fresh=1`}
          className="mt-10 inline-flex font-semibold text-[#4361DB]"
        >
          Start a new salon
        </Link>
      </div>
    </main>
  );
}
