"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getBrowserSupabase } from "@/lib/browser-supabase";
import { buildCatalog, itemKey, type CatalogItem } from "@/lib/booking/catalog";
import { dateKey, dayKeysFrom, dayNumber, today, weekdayLabel } from "@/lib/booking/dates";
import {
  itemToDraft,
  readDraft,
  slotToDraft,
  writeDraft,
  type BookingDraft,
  type DraftItem,
} from "@/lib/booking/draft";
import { mergeDaySlots, type AvailabilityDay } from "@/lib/booking/slots";
import { routeFor, type Locale } from "@/lib/i18n";
import {
  completeAccount,
  createAppointment,
  listAvailability,
  locationBySlug,
  lookupEmail,
  SlotTakenError,
  type PublicLocation,
} from "@/lib/marketplace-browser";
import { useMarketplaceUser } from "@/components/consumer-home/useMarketplaceUser";

type Step = "services" | "time" | "details" | "done";

type BookingFlowProps = {
  locale: Locale;
  city: string;
  slug: string;
  step: Step;
};

function salonPath(locale: Locale, city: string, slug: string): string {
  return routeFor(locale, { kind: "salon", city, salon: slug });
}

function stepPath(base: string, step: Step): string {
  if (step === "services") return `${base}/boeken`;
  if (step === "time") return `${base}/boeken/tijd`;
  if (step === "details") return `${base}/boeken/gegevens`;
  return `${base}/boeken/bevestiging`;
}

function money(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

export function BookingFlow({ locale, city, slug, step }: BookingFlowProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [salon, setSalon] = useState<PublicLocation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<BookingDraft | null>(null);

  useEffect(() => {
    setDraft(readDraft(slug));
    let cancelled = false;
    void locationBySlug(slug, locale.slice(0, 2))
      .then((location) => {
        if (!cancelled) setSalon(location);
      })
      .catch(() => {
        if (!cancelled) setError("This salon is not available to book.");
      });
    return () => {
      cancelled = true;
    };
  }, [slug, locale]);

  const save = (next: BookingDraft) => {
    setDraft(next);
    writeDraft(slug, next);
  };

  if (error) {
    return <p className="mx-auto max-w-xl px-5 py-16 text-muted">{error}</p>;
  }
  if (!salon || !draft) {
    return <p className="mx-auto max-w-xl px-5 py-16 text-muted">Loading…</p>;
  }

  const base = salonPath(locale, city, salon.slug);
  const go = (next: Step, query = "") => router.push(`${stepPath(base, next)}${query}`);

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <Link href={base} className="text-sm text-muted hover:text-ink">
        {salon.name}
      </Link>
      {step === "services" ? (
        <ServicesStep
          locale={locale}
          salon={salon}
          draft={draft}
          onSave={save}
          onContinue={() => go("time")}
        />
      ) : null}
      {step === "time" ? (
        <TimeStep
          locale={locale}
          salon={salon}
          draft={draft}
          onSave={save}
          onBack={() => go("services")}
          onContinue={() => go("details")}
          slotTaken={searchParams.get("taken") === "1"}
        />
      ) : null}
      {step === "details" ? (
        <DetailsStep
          locale={locale}
          salon={salon}
          draft={draft}
          onSave={save}
          onBack={() => go("time")}
          onTaken={() => {
            save({ ...draft, slot: null });
            go("time", "?taken=1");
          }}
          onDone={() => go("done")}
        />
      ) : null}
      {step === "done" ? (
        <DoneStep locale={locale} city={city} salon={salon} draft={draft} />
      ) : null}
    </div>
  );
}

function ServicesStep({
  locale,
  salon,
  draft,
  onSave,
  onContinue,
}: {
  locale: Locale;
  salon: PublicLocation;
  draft: BookingDraft;
  onSave: (draft: BookingDraft) => void;
  onContinue: () => void;
}) {
  const catalog = useMemo(() => buildCatalog(salon.services), [salon.services]);
  const [activeId, setActiveId] = useState(catalog[0]?.id ?? "");
  const active = catalog.find((category) => category.id === activeId) ?? catalog[0];
  const selected = new Set(draft.items.map((item) => `${item.serviceId}:${item.variantId}`));

  const toggle = (item: CatalogItem) => {
    const key = itemKey(item);
    const items = selected.has(key)
      ? draft.items.filter((entry) => `${entry.serviceId}:${entry.variantId}` !== key)
      : [...draft.items, itemToDraft(item)];
    onSave({ ...draft, items, slot: null });
  };

  const price = draft.items.reduce((sum, item) => sum + item.price, 0);
  const minutes = draft.items.reduce((sum, item) => sum + item.durationMinutes, 0);

  return (
    <section className="mt-6">
      <h1 className="text-3xl font-semibold tracking-tight">Kies een behandeling</h1>
      {catalog.length > 1 ? (
        <div className="mt-6 flex gap-2 overflow-x-auto">
          {catalog.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setActiveId(category.id)}
              className={`rounded-full px-4 py-2 text-sm ${
                category.id === active?.id ? "bg-ink text-white" : "bg-white ring-1 ring-line"
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      ) : null}
      <ul className="mt-6 divide-y divide-line rounded-3xl bg-white px-5 ring-1 ring-line">
        {active?.items.map((item) => {
          const key = itemKey(item);
          const on = selected.has(key);
          return (
            <li key={key} className="flex items-center justify-between gap-4 py-4">
              <div>
                <p className="font-medium">{item.variant.name}</p>
                {item.variant.durationMinutes > 0 ? (
                  <p className="text-sm text-muted">
                    {item.service.name} · {item.variant.durationMinutes} min
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => toggle(item)}
                className={`rounded-full px-4 py-2 text-sm font-medium ${
                  on ? "bg-ink text-white" : "bg-canvas ring-1 ring-line"
                }`}
              >
                {salon.priced ? money(item.variant.price, locale) : on ? "Gekozen" : "Kies"}
              </button>
            </li>
          );
        })}
      </ul>
      <footer className="mt-8 flex items-center justify-between">
        <p className="text-sm text-muted">
          {draft.items.length}
          {minutes > 0 ? ` · ${minutes} min` : ""}
          {price > 0 ? ` · ${money(price, locale)}` : ""}
        </p>
        <button
          type="button"
          disabled={draft.items.length === 0}
          onClick={onContinue}
          className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
        >
          Kies een tijd
        </button>
      </footer>
    </section>
  );
}

function TimeStep({
  locale,
  salon,
  draft,
  onSave,
  onBack,
  onContinue,
  slotTaken,
}: {
  locale: Locale;
  salon: PublicLocation;
  draft: BookingDraft;
  onSave: (draft: BookingDraft) => void;
  onBack: () => void;
  onContinue: () => void;
  slotTaken: boolean;
}) {
  const base = useMemo(() => today(), []);
  const keys = useMemo(() => {
    const list = dayKeysFrom(base, 28);
    return { start: list[0] ?? dateKey(base), end: list[list.length - 1] ?? dateKey(base), list };
  }, [base]);
  const [days, setDays] = useState<Record<string, AvailabilityDay>>({});
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [dayKey, setDayKey] = useState(draft.dayKey);

  useEffect(() => {
    if (draft.items.length === 0) onBack();
    // Only the draft present on arrival should send the user back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (draft.items.length === 0) return;
    let cancelled = false;
    setLoading(true);
    void listAvailability({
      companyId: salon.companyId,
      locationId: salon.locationId,
      services: draft.items.map((item) => ({
        serviceId: item.serviceId,
        serviceVariantId: item.variantId,
      })),
      startDate: keys.start,
      endDate: keys.end,
    })
      .then((result) => {
        if (!cancelled) setDays(result);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [salon.companyId, salon.locationId, draft.items, keys.start, keys.end]);

  const slots = mergeDaySlots(dayKey ? days[dayKey] : undefined);

  return (
    <section className="mt-6">
      <h1 className="text-3xl font-semibold tracking-tight">Kies een moment</h1>
      {slotTaken ? (
        <p className="mt-4 text-sm text-muted">Dit moment is net geboekt. Kies een andere tijd.</p>
      ) : null}
      {failed ? <p className="mt-4 text-sm text-muted">Tijden laden lukt nu niet.</p> : null}
      <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
        {keys.list.map((key) => {
          const open = mergeDaySlots(days[key]).length > 0;
          return (
            <button
              key={key}
              type="button"
              disabled={!open && !loading}
              onClick={() => setDayKey(key)}
              className={`flex w-14 shrink-0 flex-col items-center rounded-2xl px-2 py-3 text-sm ${
                key === dayKey ? "bg-ink text-white" : "bg-white ring-1 ring-line"
              } disabled:opacity-40`}
            >
              <span className="text-xs uppercase">{weekdayLabel(key, locale)}</span>
              <span className="text-lg font-semibold">{dayNumber(key)}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {loading ? <p className="text-sm text-muted">Loading…</p> : null}
        {slots.map((slot) => {
          const chosen = draft.slot?.time === slot.time && draft.dayKey === dayKey;
          return (
            <button
              key={slot.time}
              type="button"
              onClick={() => {
                const option = slot.options[0];
                if (!option) return;
                onSave({ ...draft, dayKey, slot: slotToDraft(option) });
              }}
              className={`rounded-xl px-3 py-3 text-sm font-medium ${
                chosen ? "bg-ink text-white" : "bg-white ring-1 ring-line"
              }`}
            >
              {slot.time}
            </button>
          );
        })}
      </div>
      <footer className="mt-8 flex justify-between">
        <button type="button" onClick={onBack} className="text-sm text-muted">
          Terug
        </button>
        <button
          type="button"
          disabled={!draft.slot}
          onClick={onContinue}
          className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
        >
          Ga verder
        </button>
      </footer>
    </section>
  );
}

function DetailsStep({
  locale,
  salon,
  draft,
  onSave,
  onBack,
  onTaken,
  onDone,
}: {
  locale: Locale;
  salon: PublicLocation;
  draft: BookingDraft;
  onSave: (draft: BookingDraft) => void;
  onBack: () => void;
  onTaken: () => void;
  onDone: () => void;
}) {
  const { user, loading } = useMarketplaceUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [mode, setMode] = useState<"email" | "password" | "code" | "profile">("email");
  const [note, setNote] = useState(draft.note);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ready = Boolean(
    user?.profileComplete && user.firstName && user.lastName && user.phone && user.email,
  );
  const price = draft.items.reduce((sum, item) => sum + item.price, 0);

  useEffect(() => {
    if (user?.firstName) setFirstName(user.firstName);
    if (user?.lastName) setLastName(user.lastName);
    if (user?.phone) setPhone(user.phone);
  }, [user]);

  useEffect(() => {
    if (draft.items.length === 0 || !draft.slot) onBack();
    // Only the draft present on arrival should send the user back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const confirm = async () => {
    if (!user || !draft.slot) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await createAppointment({
        companyId: salon.companyId,
        locationId: salon.locationId,
        start: draft.slot.start,
        staffId: draft.slot.staffId,
        services: draft.items.map((item) => ({
          serviceId: item.serviceId,
          serviceVariantId: item.variantId,
        })),
        price,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        notes: note,
      });
      onSave({ ...draft, note, bookingId: result.bookingId });
      onDone();
    } catch (error) {
      if (error instanceof SlotTakenError) {
        setMessage("Dit moment is net geboekt. Kies een andere tijd.");
        onTaken();
        return;
      }
      setMessage("De afspraak kon niet worden bevestigd.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-6">
      <h1 className="text-3xl font-semibold tracking-tight">Bevestig</h1>
      <Summary locale={locale} items={draft.items} slotLabel={draft.slot?.time ?? ""} />
      {loading ? <p className="mt-6 text-sm text-muted">Loading…</p> : null}
      {!loading && !user && mode === "email" ? (
        <form
          className="mt-6 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            setBusy(true);
            setMessage(null);
            void lookupEmail(email.trim())
              .then(async (status) => {
                if (status.hasPassword) {
                  setMode("password");
                  return;
                }
                const supabase = getBrowserSupabase();
                if (!supabase) return;
                const { error } = await supabase.auth.signInWithOtp({
                  email: email.trim(),
                  options: { shouldCreateUser: true },
                });
                if (error) setMessage(error.message);
                else setMode("code");
              })
              .catch(() => setMessage("Dit e-mailadres kon niet worden gecontroleerd."))
              .finally(() => setBusy(false));
          }}
        >
          <label className="block text-sm font-medium">
            E-mail
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded-xl border border-line px-3 py-3"
            />
          </label>
          <button type="submit" disabled={busy} className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white">
            Ga verder
          </button>
        </form>
      ) : null}
      {!user && mode === "password" ? (
        <form
          className="mt-6 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            const supabase = getBrowserSupabase();
            if (!supabase) return;
            setBusy(true);
            void supabase.auth
              .signInWithPassword({ email: email.trim(), password })
              .then(({ error }) => {
                if (error) setMessage("E-mail of wachtwoord klopt niet.");
              })
              .finally(() => setBusy(false));
          }}
        >
          <label className="block text-sm font-medium">
            Wachtwoord
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded-xl border border-line px-3 py-3"
            />
          </label>
          <button type="submit" disabled={busy} className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white">
            Aanmelden
          </button>
        </form>
      ) : null}
      {!user && mode === "code" ? (
        <form
          className="mt-6 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            const supabase = getBrowserSupabase();
            if (!supabase) return;
            setBusy(true);
            void supabase.auth
              .verifyOtp({ email: email.trim(), token: code.trim(), type: "email" })
              .then(({ error }) => {
                if (error) setMessage("Die code klopt niet of is verlopen.");
                else setMode("profile");
              })
              .finally(() => setBusy(false));
          }}
        >
          <label className="block text-sm font-medium">
            Code uit je e-mail
            <input
              inputMode="numeric"
              required
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className="mt-1 w-full rounded-xl border border-line px-3 py-3"
            />
          </label>
          <button type="submit" disabled={busy} className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white">
            Bevestig code
          </button>
        </form>
      ) : null}
      {user && !ready ? (
        <form
          className="mt-6 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            setBusy(true);
            void completeAccount({
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              phone: phone.trim(),
              ...(password ? { password } : {}),
            })
              .catch(() => setMessage("Je gegevens konden niet worden opgeslagen."))
              .finally(() => setBusy(false));
          }}
        >
          <label className="block text-sm font-medium">
            Voornaam
            <input required value={firstName} onChange={(event) => setFirstName(event.target.value)} className="mt-1 w-full rounded-xl border border-line px-3 py-3" />
          </label>
          <label className="block text-sm font-medium">
            Achternaam
            <input required value={lastName} onChange={(event) => setLastName(event.target.value)} className="mt-1 w-full rounded-xl border border-line px-3 py-3" />
          </label>
          <label className="block text-sm font-medium">
            Telefoon
            <input required placeholder="+32470000000" value={phone} onChange={(event) => setPhone(event.target.value)} className="mt-1 w-full rounded-xl border border-line px-3 py-3" />
          </label>
          {mode === "profile" ? (
            <label className="block text-sm font-medium">
              Wachtwoord
              <input type="password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full rounded-xl border border-line px-3 py-3" />
            </label>
          ) : null}
          <button type="submit" disabled={busy} className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white">
            Opslaan
          </button>
        </form>
      ) : null}
      {ready && user ? (
        <div className="mt-6 space-y-4">
          <p className="text-sm">
            {user.firstName} {user.lastName}
            <span className="block text-muted">{user.email}</span>
          </p>
          <label className="block text-sm font-medium">
            Opmerking
            <textarea
              value={note}
              onChange={(event) => {
                const value = event.target.value;
                setNote(value);
                onSave({ ...draft, note: value });
              }}
              className="mt-1 w-full rounded-xl border border-line px-3 py-3"
              rows={3}
            />
          </label>
          <button
            type="button"
            disabled={busy || (!salon.priced && price <= 0)}
            onClick={() => void confirm()}
            className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            {salon.priced || price > 0 ? `Bevestig · ${money(price, locale)}` : "Prijs niet beschikbaar"}
          </button>
        </div>
      ) : null}
      {message ? <p className="mt-4 text-sm text-muted">{message}</p> : null}
      <button type="button" onClick={onBack} className="mt-8 text-sm text-muted">
        Terug
      </button>
    </section>
  );
}

function Summary({
  locale,
  items,
  slotLabel,
}: {
  locale: string;
  items: DraftItem[];
  slotLabel: string;
}) {
  const price = items.reduce((sum, item) => sum + item.price, 0);
  const minutes = items.reduce((sum, item) => sum + item.durationMinutes, 0);
  return (
    <ul className="mt-6 rounded-3xl bg-white px-5 py-4 ring-1 ring-line">
      {items.map((item) => (
        <li key={`${item.serviceId}:${item.variantId}`} className="flex justify-between py-2 text-sm">
          <span>
            {item.serviceName} · {item.variantName}
          </span>
          <span>{money(item.price, locale)}</span>
        </li>
      ))}
      <li className="flex justify-between border-t border-line pt-3 text-sm font-medium">
        <span>
          {slotLabel} · {minutes} min
        </span>
        <span>{money(price, locale)}</span>
      </li>
    </ul>
  );
}

function DoneStep({
  locale,
  city,
  salon,
  draft,
}: {
  locale: Locale;
  city: string;
  salon: PublicLocation;
  draft: BookingDraft;
}) {
  return (
    <section className="mt-6">
      <h1 className="text-3xl font-semibold tracking-tight">Je bent geboekt</h1>
      <p className="mt-3 text-muted">
        {salon.name}
        {draft.slot ? ` · ${draft.slot.time}` : ""}
        {draft.bookingId ? ` · ${draft.bookingId}` : ""}
      </p>
      <Summary locale={locale} items={draft.items} slotLabel={draft.slot?.time ?? ""} />
      <Link
        href={salonPath(locale, city, salon.slug)}
        className="mt-8 inline-flex rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white"
      >
        Terug naar de salon
      </Link>
    </section>
  );
}
