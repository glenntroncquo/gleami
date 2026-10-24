"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Figtree } from "next/font/google";
import { BusinessSection } from "./BusinessSection";
import { ExploreSection } from "./ExploreSection";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { Hero } from "./Hero";
import type { HomeSalon } from "./VenueCard";
import { useAuth } from "@/components/auth/AuthProvider";
import { rememberLike } from "@/components/auth/pending-like";
import { cityKeyFromName, localizedCitySlug, routeFor, type Locale } from "@/lib/i18n";
import { homeCopy } from "./messages";
import {
  BELGIUM_BBOX,
  SEARCH_RADIUS_KM,
  listCategories,
  listFavorites,
  searchSalons,
  setLike,
  type MarketplaceCategory,
  type SearchSalon,
} from "@/lib/marketplace-browser";

const figtree = Figtree({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

type ConsumerHomeProps = {
  locale?: Locale;
  homeHref?: string;
  businessHref?: string;
};

function salonHref(locale: Locale, slug: string, city: string | null): string {
  const key = city ? cityKeyFromName(city) : null;
  return routeFor(locale, {
    kind: "salon",
    city: key ?? localizedCitySlug(locale, city || "merelbeke"),
    salon: slug,
  });
}

function toCard(
  locale: Locale,
  item: SearchSalon,
  categories: MarketplaceCategory[],
): HomeSalon {
  const category = categories.find((entry) => item.categoryIds?.includes(entry.id));
  return {
    id: item.locationId,
    name: item.name,
    href: salonHref(locale, item.slug, item.city),
    image: item.imageUrl,
    city: item.city?.trim() || "",
    distance: item.distanceKm != null ? `${item.distanceKm.toFixed(1)} km` : null,
    category: category?.name ?? "",
    rating: item.rating,
    reviews: item.reviewCount ?? 0,
  };
}

export function ConsumerHome({
  locale = "nl-be",
  homeHref = "/",
  businessHref = routeFor("nl-be", { kind: "business" }),
}: ConsumerHomeProps) {
  const copy = homeCopy(locale);
  const { user, openAuth } = useAuth();
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [categoriesReady, setCategoriesReady] = useState(false);
  const [salons, setSalons] = useState<SearchSalon[]>([]);
  const [favorites, setFavorites] = useState<HomeSalon[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCenter({ lat: position.coords.latitude, lng: position.coords.longitude });
      },
      () => {
        setCenter(null);
      },
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    setCategoriesReady(false);
    void listCategories(locale.slice(0, 2))
      .then((rows) => {
        if (!cancelled) setCategories(rows);
      })
      .catch(() => {
        if (!cancelled) setCategories([]);
      })
      .finally(() => {
        if (!cancelled) setCategoriesReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [locale]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void searchSalons({
      q: query,
      categoryIds: categoryId ? [categoryId] : [],
      center,
      radiusKm: center ? SEARCH_RADIUS_KM : undefined,
      bbox: center ? null : BELGIUM_BBOX,
      limit: 24,
    })
      .then((items) => {
        if (!cancelled) setSalons(items);
      })
      .catch(() => {
        if (!cancelled) setSalons([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query, categoryId, center]);

  useEffect(() => {
    if (!user) {
      setFavorites([]);
      setSavedIds(new Set());
      return;
    }
    let cancelled = false;
    void listFavorites(user.id)
      .then((rows) => {
        if (cancelled) return;
        setFavorites(
          rows.map((row) => ({
            id: row.locationId,
            name: row.name,
            href: salonHref(locale, row.slug, row.city),
            image: row.imageUrl,
            city: row.city ?? "",
            distance: null,
            category: "",
            rating: null,
            reviews: 0,
          })),
        );
        setSavedIds(new Set(rows.map((row) => row.locationId)));
      })
      .catch(() => {
        if (!cancelled) setFavorites([]);
      });
    return () => {
      cancelled = true;
    };
  }, [user, locale]);

  const cards = useMemo(
    () => salons.map((item) => toCard(locale, item, categories)),
    [salons, locale, categories],
  );

  const handleSearch = (nextQuery: string) => {
    setQuery(nextQuery.trim());
    setCategoryId(null);
    document.getElementById("explore")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    const refresh = () => {
      if (!user) return;
      void listFavorites(user.id)
        .then((rows) => {
          setFavorites(
            rows.map((row) => ({
              id: row.locationId,
              name: row.name,
              href: salonHref(locale, row.slug, row.city),
              image: row.imageUrl,
              city: row.city ?? "",
              distance: null,
              category: "",
              rating: null,
              reviews: 0,
            })),
          );
          setSavedIds(new Set(rows.map((row) => row.locationId)));
        })
        .catch(() => undefined);
    };
    window.addEventListener("gleami-likes", refresh);
    return () => window.removeEventListener("gleami-likes", refresh);
  }, [user, locale]);

  const toggleFavorite = useCallback(
    (id: string) => {
      if (!user) {
        rememberLike(id);
        openAuth({ purpose: "save" });
        return;
      }
      const liked = !savedIds.has(id);
      setSavedIds((previous) => {
        const next = new Set(previous);
        if (liked) next.add(id);
        else next.delete(id);
        return next;
      });
      setFavorites((previous) => {
        if (!liked) return previous.filter((item) => item.id !== id);
        if (previous.some((item) => item.id === id)) return previous;
        const card = cards.find((item) => item.id === id);
        return card ? [card, ...previous] : previous;
      });
      void setLike(user.id, id, liked).catch(() => {
        setSavedIds((previous) => {
          const next = new Set(previous);
          if (liked) next.delete(id);
          else next.add(id);
          return next;
        });
      });
    },
    [user, savedIds, cards, openAuth],
  );

  const pills = [
    { id: null, name: copy.allTreatments },
    ...categories.map((category) => ({ id: category.id, name: category.name })),
  ];

  return (
    <div className={`${figtree.className} min-h-screen w-full bg-page text-navy`}>
      <Header locale={locale} homeHref={homeHref} businessHref={businessHref} copy={copy} />
      <main id="main">
        <Hero copy={copy} nearby={center != null} onSearch={handleSearch} />
        <ExploreSection
          venues={cards}
          favorites={favorites}
          savedIds={savedIds}
          showFavorite
          query={query}
          nearby={center != null}
          copy={copy}
          categoryId={categoryId}
          categories={pills}
          seeAllHref={routeFor(locale, { kind: "salons" })}
          loading={loading}
          categoriesReady={categoriesReady}
          onCategoryChange={setCategoryId}
          onClearQuery={() => setQuery("")}
          onToggleFavorite={toggleFavorite}
        />
        <BusinessSection locale={locale} copy={copy} />
      </main>
      <Footer locale={locale} copy={copy} />
    </div>
  );
}
