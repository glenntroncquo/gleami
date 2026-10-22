"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { authCopy } from "@/components/auth/copy";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { routeFor, type Locale } from "@/lib/i18n";
import {
  listFavorites,
  listMyAppointments,
  type FavoriteSalon,
  type MyAppointment,
} from "@/lib/marketplace-browser";

type AccountViewProps = {
  locale: Locale;
  view: "appointments" | "favorites";
};

export function AccountView({ locale, view }: AccountViewProps) {
  const copy = authCopy(locale);
  const { user, loading, openAuth } = useAuth();
  const [appointments, setAppointments] = useState<MyAppointment[]>([]);
  const [favorites, setFavorites] = useState<FavoriteSalon[]>([]);
  const [failed, setFailed] = useState(false);
  const route = view === "favorites" ? { kind: "favorites" as const } : { kind: "account" as const };

  useEffect(() => {
    if (!user) return;
    let active = true;
    setFailed(false);
    const load =
      view === "favorites"
        ? listFavorites(user.id).then((rows) => {
            if (active) setFavorites(rows);
          })
        : listMyAppointments().then((rows) => {
            if (active) setAppointments(rows);
          });
    void load.catch(() => {
      if (active) setFailed(true);
    });
    return () => {
      active = false;
    };
  }, [user, view]);

  return (
    <>
      <SiteHeader locale={locale} route={route} />
      <main id="main" className="mx-auto min-h-[60vh] max-w-3xl px-5 py-12">
        <div className="flex gap-2">
          <Link
            href={routeFor(locale, { kind: "account" })}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              view === "appointments" ? "bg-ink text-white" : "bg-white text-ink ring-1 ring-line"
            }`}
          >
            {copy.appointments}
          </Link>
          <Link
            href={routeFor(locale, { kind: "favorites" })}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              view === "favorites" ? "bg-ink text-white" : "bg-white text-ink ring-1 ring-line"
            }`}
          >
            {copy.favorites}
          </Link>
        </div>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">
          {view === "favorites" ? copy.favorites : copy.appointments}
        </h1>
        {!loading && !user ? (
          <div className="mt-6">
            <p className="text-muted">{copy.signInPrompt}</p>
            <button
              type="button"
              onClick={() => openAuth({ purpose: "account" })}
              className="mt-4 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white"
            >
              {copy.login}
            </button>
          </div>
        ) : null}
        {failed ? <p className="mt-6 text-sm text-muted">{copy.profileError}</p> : null}
        {user && view === "appointments" && appointments.length === 0 && !failed ? (
          <p className="mt-6 text-muted">{copy.noAppointments}</p>
        ) : null}
        {user && view === "favorites" && favorites.length === 0 && !failed ? (
          <p className="mt-6 text-muted">{copy.noFavorites}</p>
        ) : null}
        {view === "appointments" ? (
          <ul className="mt-6 space-y-3">
            {appointments.map((item) => (
              <li key={item.id} className="rounded-3xl bg-white px-5 py-4 ring-1 ring-line">
                <p className="font-semibold">{item.locationName}</p>
                <p className="mt-1 text-sm text-muted">
                  {item.startsAt ? new Date(item.startsAt).toLocaleString(locale) : ""}
                  {item.services.length > 0 ? ` · ${item.services.join(", ")}` : ""}
                </p>
                {item.isCanceled ? <p className="mt-2 text-sm text-muted">{copy.canceled}</p> : null}
              </li>
            ))}
          </ul>
        ) : (
          <ul className="mt-6 space-y-3">
            {favorites.map((item) => (
              <li key={item.locationId}>
                <Link
                  href={routeFor(locale, { kind: "salon", city: item.city ?? item.slug, salon: item.slug })}
                  className="block rounded-3xl bg-white px-5 py-4 ring-1 ring-line"
                >
                  <p className="font-semibold">{item.name}</p>
                  {item.city ? <p className="mt-1 text-sm text-muted">{item.city}</p> : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
      <SiteFooter locale={locale} route={route} />
    </>
  );
}
