/**
 * Pure account routing. Established salon access and unfinished setup
 * drafts are separate. A lookup failure is never the same result as an
 * account with no memberships.
 */

export const COMPANY_COOKIE = "gleami_company_id";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type AccountCompany = {
  id: string;
  name: string;
  via: "company" | "location";
};

export type AccountDraft = {
  id: string;
  companyId: string;
  name: string;
  currentStep: number;
};

export type AccountSnapshot =
  | { ok: false; reason: "unauthenticated" | "lookup_error" }
  | {
      ok: true;
      emailConfirmed: boolean;
      companies: AccountCompany[];
      drafts: AccountDraft[];
    };

export type AccountDestination =
  | { type: "unauthenticated" }
  | { type: "lookup_error" }
  | { type: "verify_email" }
  | { type: "invite"; path: string }
  | { type: "start_setup" }
  | { type: "resume_setup"; setupId: string }
  | { type: "choose_setup" }
  | { type: "enter_app"; companyId: string; drafts: AccountDraft[] }
  | { type: "choose_salon" };

const ANONYMOUS_PREFIXES = [
  "/login",
  "/reset-password",
  "/update-password",
  "/invite",
  "/cancel-appointment",
  "/auth",
];

export function isUuid(value: string | null | undefined): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

export function readCompanyCookieValue(value: string | undefined): string | null {
  return isUuid(value) ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readCompany(value: unknown): AccountCompany | null {
  if (!isRecord(value)) return null;
  const id = value.id;
  const name = value.name;
  if (typeof id !== "string" || !isUuid(id)) return null;
  if (typeof name !== "string" || name.trim() === "") return null;
  if (value.via !== "company" && value.via !== "location") return null;
  return { id, name, via: value.via };
}

function readDraft(value: unknown): AccountDraft | null {
  if (!isRecord(value)) return null;
  const id = value.id;
  const companyId = value.companyId;
  const name = value.name;
  const currentStep = value.currentStep;
  if (typeof id !== "string" || !isUuid(id)) return null;
  if (typeof companyId !== "string" || !isUuid(companyId)) return null;
  if (typeof name !== "string" || name.trim() === "") return null;
  if (typeof currentStep !== "number" || !Number.isInteger(currentStep)) return null;
  if (currentStep < 1 || currentStep > 6) return null;
  return { id, companyId, name, currentStep };
}

/**
 * A malformed payload is a lookup error. Dropping bad rows would make a
 * failed read look like a confirmed empty account and could start a draft.
 */
export function parseAccountSnapshot(data: unknown): AccountSnapshot {
  if (!isRecord(data)) return { ok: false, reason: "lookup_error" };
  if (data.error === "unauthenticated") return { ok: false, reason: "unauthenticated" };
  if (typeof data.emailConfirmed !== "boolean") return { ok: false, reason: "lookup_error" };
  if (!Array.isArray(data.companies) || !Array.isArray(data.drafts)) {
    return { ok: false, reason: "lookup_error" };
  }

  const companies: AccountCompany[] = [];
  for (const row of data.companies) {
    const company = readCompany(row);
    if (!company) return { ok: false, reason: "lookup_error" };
    companies.push(company);
  }

  const drafts: AccountDraft[] = [];
  for (const row of data.drafts) {
    const draft = readDraft(row);
    if (!draft) return { ok: false, reason: "lookup_error" };
    drafts.push(draft);
  }

  return {
    ok: true,
    emailConfirmed: data.emailConfirmed,
    companies,
    drafts,
  };
}

export function safeInvitePath(path: string | null | undefined, locale: string): string | null {
  if (!path) return null;
  const prefix = `/${locale}/invite`;
  if (!path.startsWith(prefix)) return null;
  if (path.startsWith("//") || path.includes("\\")) return null;
  return path;
}

export function resolveAccountDestination(input: {
  snapshot: AccountSnapshot;
  selectedCompanyId?: string | null;
  invitePath?: string | null;
}): AccountDestination {
  const { snapshot } = input;
  if (!snapshot.ok) {
    return snapshot.reason === "unauthenticated"
      ? { type: "unauthenticated" }
      : { type: "lookup_error" };
  }

  if (input.invitePath) return { type: "invite", path: input.invitePath };

  if (!snapshot.emailConfirmed) return { type: "verify_email" };

  const { companies, drafts } = snapshot;
  if (companies.length === 0 && drafts.length === 0) return { type: "start_setup" };
  if (companies.length === 0 && drafts.length === 1) {
    return { type: "resume_setup", setupId: drafts[0].id };
  }
  if (companies.length === 0) return { type: "choose_setup" };

  if (companies.length === 1) {
    return { type: "enter_app", companyId: companies[0].id, drafts };
  }

  const selected = input.selectedCompanyId;
  if (selected && companies.some((company) => company.id === selected)) {
    return { type: "enter_app", companyId: selected, drafts };
  }
  return { type: "choose_salon" };
}

export function accountDestinationPath(locale: string, destination: AccountDestination): string {
  switch (destination.type) {
    case "unauthenticated":
      return `/${locale}/login`;
    case "lookup_error":
      return `/${locale}/account-unavailable`;
    case "verify_email":
      return `/${locale}/login?error=confirm_email`;
    case "invite":
      return destination.path;
    case "start_setup":
      return `/${locale}/setup`;
    case "resume_setup":
      return `/${locale}/setup?draft=${destination.setupId}`;
    case "choose_setup":
    case "choose_salon":
      return `/${locale}/workspaces`;
    case "enter_app":
      return `/${locale}/calendar`;
  }
}

export function routeWithoutLocale(pathname: string): string {
  const route = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, "") || "/";
  return route.startsWith("/") ? route : `/${route}`;
}

export function isAnonymousRoute(route: string): boolean {
  return ANONYMOUS_PREFIXES.some(
    (prefix) => route === prefix || route.startsWith(`${prefix}/`),
  );
}

export function gateAccountPath(input: {
  pathname: string;
  locale: string;
  destination: AccountDestination;
}): { redirect: string | null } {
  const route = routeWithoutLocale(input.pathname);
  const { destination, locale } = input;

  if (destination.type === "unauthenticated") {
    if (isAnonymousRoute(route) || route === "/account-unavailable") return { redirect: null };
    return { redirect: `/${locale}/login` };
  }

  if (destination.type === "lookup_error") {
    if (route === "/account-unavailable") return { redirect: null };
    return { redirect: `/${locale}/account-unavailable` };
  }

  if (destination.type === "verify_email") {
    if (route === "/login" || isAnonymousRoute(route)) return { redirect: null };
    return { redirect: `/${locale}/login?error=confirm_email` };
  }

  if (route === "/account-unavailable") {
    const next = accountDestinationPath(locale, destination);
    if (next === `/${locale}/account-unavailable`) return { redirect: null };
    return { redirect: next };
  }

  if (isAnonymousRoute(route)) {
    return { redirect: null };
  }

  if (route === "/setup" || route.startsWith("/setup/") || route === "/workspaces") {
    return { redirect: null };
  }

  if (destination.type === "enter_app") return { redirect: null };
  return { redirect: accountDestinationPath(locale, destination) };
}
