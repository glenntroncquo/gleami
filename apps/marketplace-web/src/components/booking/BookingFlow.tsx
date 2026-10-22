"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeftIcon, CheckIcon, PlusIcon, XIcon } from "lucide-react";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { authCopy } from "@/components/auth/copy";
import { useAuth } from "@/components/auth/AuthProvider";
import { readSavedContact, writeSavedContact } from "@/components/booking/saved-contact";
import { areaField, textField } from "@/components/ui/fields";
import { LoadingDots } from "@/components/ui/loading-dots";
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
  SlotTakenError,
  type PublicLocation,
} from "@/lib/marketplace-browser";

type Step = "services" | "time" | "details" | "done";

const salonCache = new Map<string, PublicLocation>();

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

export function BookingSkeleton() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-10" aria-busy="true">
      <span className="sr-only">Loading</span>
      <div className="h-4 w-28 rounded-full bg-navy/10 motion-safe:animate-pulse" aria-hidden="true" />
      <div className="mt-8 h-9 w-64 max-w-full rounded-full bg-navy/10 motion-safe:animate-pulse" aria-hidden="true" />
      <div className="mt-6 flex gap-2" aria-hidden="true">
        <div className="h-10 w-28 rounded-full bg-navy/10 motion-safe:animate-pulse" />
        <div className="h-10 w-24 rounded-full bg-navy/10 motion-safe:animate-pulse" />
        <div className="h-10 w-32 rounded-full bg-navy/10 motion-safe:animate-pulse" />
      </div>
      <div className="mt-6 divide-y divide-line overflow-hidden rounded-3xl bg-white px-5 ring-1 ring-line" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="flex items-center justify-between gap-4 py-4">
            <div>
              <div className="h-4 w-40 rounded-full bg-navy/10 motion-safe:animate-pulse" />
              <div className="mt-2 h-3 w-24 rounded-full bg-navy/10 motion-safe:animate-pulse" />
            </div>
            <div className="h-9 w-16 rounded-full bg-navy/10 motion-safe:animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SlotSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className="h-11 rounded-xl bg-navy/10 motion-safe:animate-pulse" aria-hidden="true" />
      ))}
    </>
  );
}

function DetailsSkeleton() {
  return (
    <div className="mt-6 space-y-3" aria-busy="true">
      <span className="sr-only">Loading</span>
      <div className="h-4 w-16 rounded-full bg-navy/10 motion-safe:animate-pulse" aria-hidden="true" />
      <div className="h-12 w-full rounded-xl bg-navy/10 motion-safe:animate-pulse" aria-hidden="true" />
      <div className="h-12 w-32 rounded-full bg-navy/10 motion-safe:animate-pulse" aria-hidden="true" />
    </div>
  );
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

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    const cached = salonCache.get(`${locale}:${slug}`);
    if (cached) setSalon(cached);
    setDraft(readDraft(slug));
  }, [locale, slug]);

  useEffect(() => {
    if (step === "time") router.prefetch(stepPath(salonPath(locale, city, slug), "details"));
  }, [step, router, locale, city, slug]);

  useEffect(() => {
    let cancelled = false;
    void locationBySlug(slug, locale.slice(0, 2))
      .then((location) => {
        if (cancelled) return;
        if (!location) {
          setError("This salon is not available to book.");
          return;
        }
        salonCache.set(`${locale}:${slug}`, location);
        setSalon(location);
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
    return <BookingSkeleton />;
  }

  const base = salonPath(locale, city, salon.slug);
  const go = (next: Step, query = "") => router.push(`${stepPath(base, next)}${query}`);

  return (
    <div key={step} className="booking-step mx-auto max-w-3xl px-5 py-10">
      {step === "services" ? (
        <ServicesStep
          locale={locale}
          salon={salon}
          draft={draft}
          onSave={save}
          onContinue={() => go("time")}
          onClose={() => router.push(base)}
        />
      ) : null}
      {step === "time" ? (
        <TimeStep
          locale={locale}
          salon={salon}
          draft={draft}
          onSave={save}
          onBack={() => go("services")}
          onClose={() => router.push(base)}
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
          onClose={() => router.push(base)}
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

function BookingNav({ onBack, onClose }: { onBack: () => void; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <button
        type="button"
        onClick={onBack}
        aria-label="Terug"
        className="flex h-11 w-11 items-center justify-center rounded-full text-ink hover:bg-white"
      >
        <ArrowLeftIcon aria-hidden="true" className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={onClose}
        aria-label="Sluiten"
        className="flex h-11 w-11 items-center justify-center rounded-full text-ink hover:bg-white"
      >
        <XIcon aria-hidden="true" className="h-5 w-5" />
      </button>
    </div>
  );
}

function ServicesStep({
  locale,
  salon,
  draft,
  onSave,
  onContinue,
  onClose,
}: {
  locale: Locale;
  salon: PublicLocation;
  draft: BookingDraft;
  onSave: (draft: BookingDraft) => void;
  onContinue: () => void;
  onClose: () => void;
}) {
  const catalog = useMemo(() => buildCatalog(salon.services), [salon.services]);
  const [activeId, setActiveId] = useState(catalog[0]?.id ?? "");
  const [breakdown, setBreakdown] = useState(false);
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

  const countLabel =
    draft.items.length === 1
      ? "1 behandeling"
      : `${draft.items.length} behandelingen`;

  useEffect(() => {
    if (draft.items.length === 0) setBreakdown(false);
  }, [draft.items.length]);

  useEffect(() => {
    if (!breakdown) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setBreakdown(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [breakdown]);

  return (
    <section className="pb-28 lg:pb-0">
      <BookingNav onBack={onClose} onClose={onClose} />
      <h1 className="mt-4 text-[32px] font-semibold tracking-tight">Kies een behandeling</h1>
      {catalog.length > 1 ? (
        <div className="mt-6 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {catalog.map((category) => {
            const chosen = category.id === active?.id;
            return (
              <button
                key={category.id}
                type="button"
                aria-pressed={chosen}
                onClick={() => setActiveId(category.id)}
                className={`h-10 shrink-0 whitespace-nowrap rounded-full px-4 text-sm font-semibold ${
                  chosen ? "bg-ink text-white" : "bg-white text-ink ring-1 ring-line"
                }`}
              >
                {category.name}
              </button>
            );
          })}
        </div>
      ) : null}
      <ul className="mt-6 space-y-3">
        {active?.items.map((item) => {
          const key = itemKey(item);
          const on = selected.has(key);
          return (
            <li key={key}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => toggle(item)}
                className={`flex w-full items-center gap-4 rounded-2xl bg-white px-5 py-4 text-left ring-1 transition ${
                  on ? "ring-2 ring-ink" : "ring-line hover:ring-ink/25"
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-semibold">{item.variant.name}</span>
                  {item.variant.durationMinutes > 0 ? (
                    <span className="mt-1 block text-sm text-muted">
                      {item.variant.durationMinutes} min
                    </span>
                  ) : null}
                  {salon.priced ? (
                    <span className="mt-3 block text-[16px] font-semibold">
                      {money(item.variant.price, locale)}
                    </span>
                  ) : null}
                </span>
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                    on ? "bg-ink text-white" : "text-ink ring-1 ring-line"
                  }`}
                >
                  {on ? (
                    <CheckIcon aria-hidden="true" className="h-5 w-5" />
                  ) : (
                    <PlusIcon aria-hidden="true" className="h-5 w-5" />
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <footer className="mt-8 hidden items-center justify-between lg:flex">
        <button
          type="button"
          disabled={draft.items.length === 0}
          onClick={() => setBreakdown(true)}
          className="text-left text-sm text-muted disabled:opacity-60"
        >
          {draft.items.length === 0
            ? "Kies een behandeling"
            : `${countLabel}${minutes > 0 ? ` · ${minutes} min` : ""}${price > 0 ? ` · ${money(price, locale)}` : ""}`}
        </button>
        <button
          type="button"
          disabled={draft.items.length === 0}
          onClick={onContinue}
          className="h-12 rounded-full bg-ink px-6 text-sm font-semibold text-white disabled:opacity-40"
        >
          Kies een tijd
        </button>
      </footer>
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-4 border-t border-line bg-white px-5 py-3 lg:hidden">
        <button
          type="button"
          disabled={draft.items.length === 0}
          onClick={() => setBreakdown(true)}
          className="min-w-0 text-left disabled:opacity-60"
        >
          <span className="block text-base font-semibold">
            {price > 0 ? money(price, locale) : draft.items.length === 0 ? "—" : countLabel}
          </span>
          <span className="block truncate text-sm text-muted">
            {draft.items.length === 0
              ? "Kies een behandeling"
              : `${countLabel}${minutes > 0 ? ` · ${minutes} min` : ""}`}
          </span>
        </button>
        <button
          type="button"
          disabled={draft.items.length === 0}
          onClick={onContinue}
          className="h-12 shrink-0 rounded-full bg-ink px-5 text-sm font-semibold text-white disabled:opacity-40"
        >
          Kies een tijd
        </button>
      </div>
      {breakdown ? (
        <div className="fixed inset-0 z-40">
          <button
            type="button"
            aria-label="Sluiten"
            className="absolute inset-0 bg-ink/45"
            onClick={() => setBreakdown(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Prijsoverzicht"
            className="absolute inset-x-0 bottom-0 rounded-t-[28px] bg-white px-5 pb-6 pt-4 shadow-float"
          >
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setBreakdown(false)}
                aria-label="Sluiten"
                className="flex h-11 w-11 items-center justify-center rounded-full text-ink"
              >
                <XIcon aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>
            <h2 className="text-[28px] font-semibold tracking-tight">Prijsoverzicht</h2>
            <ul className="mt-6">
              {draft.items.map((item) => (
                <li
                  key={`${item.serviceId}:${item.variantId}`}
                  className="flex items-start justify-between gap-4 border-t border-line py-4 first:border-t-0 first:pt-0"
                >
                  <span>
                    <span className="block font-medium">{item.variantName}</span>
                    {item.durationMinutes > 0 ? (
                      <span className="mt-1 block text-sm text-muted">
                        {item.durationMinutes} min
                      </span>
                    ) : null}
                  </span>
                  {salon.priced ? (
                    <span className="font-medium">{money(item.price, locale)}</span>
                  ) : null}
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between border-t border-line pt-4 text-[16px] font-semibold">
              <span>Totaal</span>
              <span>{salon.priced ? money(price, locale) : countLabel}</span>
            </div>
            <button
              type="button"
              onClick={onContinue}
              className="mt-6 flex h-14 w-full items-center justify-center rounded-full bg-ink text-[16px] font-semibold text-white"
            >
              Kies een tijd
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function TimeStep({
  locale,
  salon,
  draft,
  onSave,
  onBack,
  onClose,
  onContinue,
  slotTaken,
}: {
  locale: Locale;
  salon: PublicLocation;
  draft: BookingDraft;
  onSave: (draft: BookingDraft) => void;
  onBack: () => void;
  onClose: () => void;
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
    <section>
      <BookingNav onBack={onBack} onClose={onClose} />
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Kies een moment</h1>
      {slotTaken ? (
        <p className="mt-4 text-sm text-muted">Dit moment is net geboekt. Kies een andere tijd.</p>
      ) : null}
      {failed ? <p className="mt-4 text-sm text-muted">Tijden laden lukt nu niet.</p> : null}
      <div className="no-scrollbar mt-6 flex gap-2 overflow-x-auto pb-1">
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
      {loading ? <span className="sr-only">Loading times</span> : null}
      <div className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-4" aria-busy={loading}>
        {loading ? <SlotSkeleton /> : null}
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
  onClose,
  onTaken,
  onDone,
}: {
  locale: Locale;
  salon: PublicLocation;
  draft: BookingDraft;
  onSave: (draft: BookingDraft) => void;
  onBack: () => void;
  onClose: () => void;
  onTaken: () => void;
  onDone: () => void;
}) {
  const { user, loading } = useAuth();
  const copy = authCopy(locale);
  const [guest, setGuest] = useState(false);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [remember, setRemember] = useState(false);
  const [rememberReady, setRememberReady] = useState(false);
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(draft.note);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const identified = Boolean(user?.firstName && user?.lastName && user?.email);
  const price = draft.items.reduce((sum, item) => sum + item.price, 0);
  const confirmClass =
    "mt-5 flex h-[58px] w-full items-center justify-center rounded-full bg-ink text-[17px] font-semibold text-white disabled:opacity-40 data-[busy=true]:opacity-100";

  useEffect(() => {
    if (!user) return;
    setFirstName(user.firstName);
    setLastName(user.lastName);
    setEmail(user.email);
    setPhone(user.phone);
    setEditing(!user.phone);
  }, [user?.id, user?.firstName, user?.lastName, user?.email, user?.phone]);

  useEffect(() => {
    if (user) return;
    const saved = readSavedContact();
    if (saved && (saved.firstName || saved.lastName || saved.email || saved.phone)) {
      setFirstName(saved.firstName);
      setLastName(saved.lastName);
      setEmail(saved.email);
      setPhone(saved.phone);
      setRemember(true);
    }
    setRememberReady(true);
  }, [user]);

  useEffect(() => {
    if (!rememberReady || user) return;
    if (!remember) {
      writeSavedContact(null);
      return;
    }
    writeSavedContact({ firstName, lastName, email, phone });
  }, [rememberReady, remember, firstName, lastName, email, phone, user]);

  useEffect(() => {
    if (draft.items.length === 0 || !draft.slot) onBack();
    // Only the draft present on arrival should send the user back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const book = async (contact: { firstName: string; lastName: string; email: string; phone: string } | null) => {
    if (!draft.slot) return;
    const person = contact ?? (user ? {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
    } : null);
    if (!person) return;
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
        firstName: person.firstName,
        lastName: person.lastName,
        email: person.email,
        phone: person.phone,
        notes: note,
      });
      if (user) {
        await completeAccount({
          firstName: person.firstName,
          lastName: person.lastName,
          phone: person.phone,
        }).catch(() => undefined);
      }
      onSave({ ...draft, note, bookingId: result.bookingId, contact: user ? null : contact });
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
    <section>
      <BookingNav onBack={onBack} onClose={onClose} />
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">{copy.confirm}</h1>
      <Summary locale={locale} items={draft.items} slotLabel={draft.slot?.time ?? ""} />
      {loading ? <DetailsSkeleton /> : null}
      {!loading && !identified && !guest ? (
        <AuthDialog
          locale={locale}
          open
          embedded
          purpose="book"
          allowGuest
          onClose={onBack}
          onGuest={() => setGuest(true)}
        />
      ) : null}
      {!loading && !identified && guest ? (
        <form
          className="mt-6"
          onSubmit={(event) => {
            event.preventDefault();
            void book({
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              email: email.trim(),
              phone: phone.trim(),
            });
          }}
        >
          <h2 className="text-[22px] font-semibold tracking-tight">{copy.guestTitle}</h2>
          <p className="mt-2 text-sm text-muted">{copy.guestBody}</p>
          <label className="mt-4 block text-[15px] font-semibold">
            {copy.firstName}
            <input
              required
              autoComplete="given-name"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              className={textField}
            />
          </label>
          <label className="mt-4 block text-[15px] font-semibold">
            {copy.lastName}
            <input
              required
              autoComplete="family-name"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              className={textField}
            />
          </label>
          <label className="mt-4 block text-[15px] font-semibold">
            {copy.email}
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={textField}
            />
          </label>
          <label className="mt-4 block text-[15px] font-semibold">
            {copy.phone}
            <input
              required
              autoComplete="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className={textField}
            />
          </label>
          <label className="mt-4 flex items-start gap-3 text-sm font-medium text-ink">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[#5B7CF0]"
            />
            {copy.rememberDetails}
          </label>
          <label className="mt-4 block text-[15px] font-semibold">
            {copy.note}
            <textarea
              value={note}
              onChange={(event) => {
                const value = event.target.value;
                setNote(value);
                onSave({ ...draft, note: value });
              }}
              className={areaField}
              rows={3}
            />
          </label>
          <button
            type="submit"
            disabled={busy || (!salon.priced && price <= 0)}
            data-busy={busy || undefined}
            className={confirmClass}
          >
            {busy ? (
              <LoadingDots label={copy.working} />
            ) : salon.priced || price > 0 ? (
              `${copy.confirm} · ${money(price, locale)}`
            ) : (
              copy.priceUnavailable
            )}
          </button>
        </form>
      ) : null}
      {!loading && identified && user ? (
        <div className="mt-6">
          <h2 className="text-[22px] font-semibold tracking-tight">{copy.guestTitle}</h2>
          {editing ? (
            <form
              className="mt-4"
              onSubmit={(event) => {
                event.preventDefault();
                setBusy(true);
                setMessage(null);
                void completeAccount({
                  firstName: firstName.trim(),
                  lastName: lastName.trim(),
                  phone: phone.trim(),
                })
                  .then(() => setEditing(false))
                  .catch(() => setMessage(copy.profileError))
                  .finally(() => setBusy(false));
              }}
            >
              <label className="block text-[15px] font-semibold">
                {copy.firstName}
                <input
                  required
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  className={textField}
                />
              </label>
              <label className="mt-4 block text-[15px] font-semibold">
                {copy.lastName}
                <input
                  required
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  className={textField}
                />
              </label>
              <p className="mt-4 text-[15px] font-semibold">
                {copy.email}
                <span className="mt-2 block font-normal text-muted">{user.email}</span>
              </p>
              <label className="mt-4 block text-[15px] font-semibold">
                {copy.phone}
                <input
                  required
                  autoComplete="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className={textField}
                />
              </label>
              <button type="submit" disabled={busy} data-busy={busy || undefined} className={confirmClass}>
                {busy ? <LoadingDots label={copy.working} /> : copy.saveProfile}
              </button>
            </form>
          ) : (
            <div className="mt-3">
              <p className="text-[15px] font-medium">
                {user.firstName} {user.lastName}
                <span className="block font-normal text-muted">{user.email}</span>
                {user.phone ? <span className="block font-normal text-muted">{user.phone}</span> : null}
              </p>
              <button type="button" onClick={() => setEditing(true)} className="mt-3 text-sm font-semibold text-peri-dark">
                {copy.editDetails}
              </button>
            </div>
          )}
          <label className="mt-4 block text-[15px] font-semibold">
            {copy.note}
            <textarea
              value={note}
              onChange={(event) => {
                const value = event.target.value;
                setNote(value);
                onSave({ ...draft, note: value });
              }}
              className={areaField}
              rows={3}
            />
          </label>
          <button
            type="button"
            disabled={busy || !firstName.trim() || !lastName.trim() || !phone.trim() || (!salon.priced && price <= 0)}
            data-busy={busy || undefined}
            onClick={() =>
              void book({
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                email: user.email,
                phone: phone.trim(),
              })
            }
            className={confirmClass}
          >
            {busy ? (
              <LoadingDots label={copy.working} />
            ) : salon.priced || price > 0 ? (
              `${copy.confirm} · ${money(price, locale)}`
            ) : (
              copy.priceUnavailable
            )}
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
  const copy = authCopy(locale);
  const { user, openAuth } = useAuth();
  return (
    <section className="mt-6">
      <h1 className="text-3xl font-semibold tracking-tight">{copy.booked}</h1>
      <p className="mt-3 text-muted">
        {salon.name}
        {draft.slot ? ` · ${draft.slot.time}` : ""}
      </p>
      <Summary locale={locale} items={draft.items} slotLabel={draft.slot?.time ?? ""} />
      {draft.contact && !user ? (
        <div className="mt-6 rounded-3xl bg-white px-5 py-5 ring-1 ring-line">
          <p className="text-[17px] font-semibold">{copy.keepAppointment}</p>
          <p className="mt-2 text-sm text-muted">{copy.keepAppointmentBody}</p>
          <button
            type="button"
            onClick={() => openAuth({ purpose: "account", email: draft.contact?.email })}
            className="mt-4 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white"
          >
            {copy.login}
          </button>
        </div>
      ) : null}
      <Link
        href={salonPath(locale, city, salon.slug)}
        className="mt-8 inline-flex rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white"
      >
        {copy.backToSalon}
      </Link>
    </section>
  );
}
