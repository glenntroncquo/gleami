"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Figtree } from "next/font/google";
import { BusinessSection } from "./BusinessSection";
import { ExploreSection } from "./ExploreSection";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { Hero } from "./Hero";
import type { HomeSalon } from "./VenueCard";
import { useMarketplaceUser } from "./useMarketplaceUser";
import { cityKeyFromName, localizedCitySlug, routeFor, type Locale } from "@/lib/i18n";
import {
  GHENT,
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
    city: key ?? localizedCitySlug(locale, city || "gent"),
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
  const { user } = useMarketplaceUser();
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [salons, setSalons] = useState<SearchSalon[]>([]);
  const [favorites, setFavorites] = useState<HomeSalon[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [center, setCenter] = useState(GHENT);
  const [placeLabel, setPlaceLabel] = useState("Gent");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCenter({ lat: position.coords.latitude, lng: position.coords.longitude });
        setPlaceLabel("jou");
      },
      () => {
        setCenter(GHENT);
        setPlaceLabel("Gent");
      },
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    void listCategories(locale.slice(0, 2))
      .then((rows) => {
        if (!cancelled) setCategories(rows);
      })
      .catch(() => {
        if (!cancelled) setCategories([]);
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
      radiusKm: SEARCH_RADIUS_KM,
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

  const toggleFavorite = useCallback(
    (id: string) => {
      if (!user) return;
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
    [user, savedIds, cards],
  );

  const pills = [
    { id: null, name: "All treatments" },
    ...categories.map((category) => ({ id: category.id, name: category.name })),
  ];

  return (
    <div className={`${figtree.className} min-h-screen w-full bg-page text-navy`}>
      <Header homeHref={homeHref} businessHref={businessHref} />
      <main id="main">
        <Hero placeLabel={placeLabel} tiles={cards.slice(0, 5)} onSearch={handleSearch} />
        <ExploreSection
          venues={cards}
          favorites={favorites}
          savedIds={savedIds}
          showFavorite={Boolean(user)}
          query={query}
          placeLabel={placeLabel}
          categoryId={categoryId}
          categories={pills}
          seeAllHref={routeFor(locale, { kind: "salons" })}
          loading={loading}
          onCategoryChange={setCategoryId}
          onClearQuery={() => setQuery("")}
          onToggleFavorite={toggleFavorite}
        />
        <BusinessSection businessHref={businessHref} />
      </main>
      <Footer />
    </div>
  );
}
