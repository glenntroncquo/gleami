import { redirect } from "next/navigation";
import { defaultLocale } from "@/i18n/config";
import { isAuthorizationId, readOAuthConsent, scopeLabel } from "@/lib/auth/oauth-consent";
import { createClient } from "@/lib/supabase/server";

export default async function OAuthConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ authorization_id?: string }>;
}) {
  const { authorization_id: authorizationId } = await searchParams;
  if (!isAuthorizationId(authorizationId)) {
    return <ConsentShell title="This link is missing an approval request." />;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const next = `/oauth/consent?authorization_id=${authorizationId}`;
    redirect(`/${defaultLocale}/login?next=${encodeURIComponent(next)}`);
  }

  let details: Awaited<ReturnType<typeof readOAuthConsent>>;
  try {
    details = await readOAuthConsent(authorizationId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "This approval request is no longer valid.";
    return <ConsentShell title={message} />;
  }

  if (details.alreadyApprovedRedirect) {
    redirect(details.alreadyApprovedRedirect);
  }

  return (
    <ConsentShell title={`Allow ${details.clientName} to use your Gleami account?`}>
      <p className="mt-3 text-base leading-6 text-[#777A82]">
        This lets that app read your salon as you. It can only see the shops your login can already open.
      </p>
      {details.scopes.length > 0 && (
        <ul className="mt-6 space-y-2 text-left text-[15px] text-[#17181B]">
          {details.scopes.map((scope) => (
            <li key={scope} className="rounded-2xl bg-[#F7F8FC] px-4 py-3">
              {scopeLabel(scope)}
            </li>
          ))}
        </ul>
      )}
      {details.redirectUri && (
        <p className="mt-4 break-all text-sm text-[#777A82]">Returns to {details.redirectUri}</p>
      )}
      <form action="/api/oauth/decision" method="POST" className="mt-8 flex flex-col gap-3">
        <input type="hidden" name="authorization_id" value={authorizationId} />
        <button
          type="submit"
          name="decision"
          value="approve"
          className="h-[58px] w-full rounded-full bg-[#0B1C3F] text-[17px] font-semibold text-white"
        >
          Approve
        </button>
        <button
          type="submit"
          name="decision"
          value="deny"
          className="h-[56px] w-full rounded-full border border-[#D7D7D9] bg-white text-[16px] font-semibold text-[#17181B]"
        >
          Deny
        </button>
      </form>
    </ConsentShell>
  );
}

function ConsentShell({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-start justify-center px-6 pb-10 pt-16">
      <div className="w-full max-w-[460px] text-center">
        <p className="text-sm font-semibold tracking-wide text-[#4361DB]">Gleami</p>
        <h1 className="mt-4 text-[30px] font-semibold leading-tight tracking-[-0.035em]">{title}</h1>
        {children}
      </div>
    </main>
  );
}
