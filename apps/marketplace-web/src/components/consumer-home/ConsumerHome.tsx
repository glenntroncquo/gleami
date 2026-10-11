"use client";

import { useCallback, useMemo, useState } from "react";
import { Figtree } from "next/font/google";
import { BusinessSection } from "./BusinessSection";
import { ExploreSection } from "./ExploreSection";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { Hero } from "./Hero";
import { VenueDrawer } from "./VenueDrawer";
import { venues } from "./data";
import { filterVenues } from "./slots";
import type { Category, Venue } from "./types";

const figtree = Figtree({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

type ConsumerHomeProps = {
  homeHref?: string;
  businessHref?: string;
};

export function ConsumerHome({ homeHref = "/", businessHref = "/for-businesses" }: ConsumerHomeProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"All" | Category>("All");
  const [selected, setSelected] = useState<Venue | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const results = useMemo(() => filterVenues(venues, category, query), [category, query]);

  const handleSearch = (nextQuery: string) => {
    setQuery(nextQuery.trim());
    setCategory("All");
    document.getElementById("explore")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const toggleFavorite = (id: string) => {
    setFavorites((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const closeDrawer = useCallback(() => setSelected(null), []);

  return (
    <div className={`${figtree.className} min-h-screen w-full bg-page text-navy`}>
      <Header homeHref={homeHref} businessHref={businessHref} />
      <main id="main">
        <Hero onSearch={handleSearch} onOpenVenue={setSelected} />
        <ExploreSection
          venues={results}
          query={query}
          category={category}
          favorites={favorites}
          onCategoryChange={setCategory}
          onClearQuery={() => setQuery("")}
          onOpenVenue={setSelected}
          onToggleFavorite={toggleFavorite}
        />
        <BusinessSection businessHref={businessHref} />
      </main>
      <Footer />
      <VenueDrawer venue={selected} onClose={closeDrawer} />
    </div>
  );
}
