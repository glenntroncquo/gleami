"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRightIcon, ChevronDownIcon, LayoutListIcon, MapIcon, MapPinIcon, SlidersHorizontalIcon, StarIcon, XIcon } from "lucide-react";
import { RecoveryPanel } from "@/components/recovery/RecoveryPanel";
import type { SalonSearchCard } from "@/data/marketplace";
import { homeCopy } from "@/components/consumer-home/messages";
import type { WhenValue } from "@/components/consumer-home/WhenField";
import { SiteHeader } from "@/components/SiteHeader";
import { cityKeyFromName, localeConfig, routeFor, type Locale } from "@/lib/i18n";
import {
  BELGIUM_BBOX,
  SEARCH_RADIUS_KM,
  listCategories,
  searchSalons,
  type MarketplaceCategory,
  type SearchSalon,
} from "@/lib/marketplace-browser";
import type { MapPoint } from "@/lib/places";
import { DiscoverSearch } from "./DiscoverSearch";
import { SalonSearchMap, type SalonPin } from "./SalonSearchMap";
import { SalonPhoto } from "./SalonPhoto";
import { SalonResultCard } from "./SalonResultCard";
import { CategoryIcon } from "./CategoryIcon";
import { categoryIconKey, primarySalonCategory } from "./category-icons";
import { explorerCopy } from "./explorer-copy";
import { filterSalons, readExplorerSearch, type ExplorerWhenPart, type SalonSort } from "./salon-explorer-utils";
import { useSalonFavorites } from "./useSalonFavorites";
import styles from "./SalonExplorer.module.css";

type SalonExplorerProps = {
  locale: Locale;
  title: string;
  live: boolean;
  salons: SalonSearchCard[];
  initialQuery?: string;
  initialWhere?: string | null;
  initialLat?: number | null;
  initialLng?: number | null;
  initialDate?: string | null;
  initialPart?: ExplorerWhenPart;
};

type Place = MapPoint & { label: string };

function iso(date: Date): string {
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}-${`${date.getDate()}`.padStart(2, "0")}`;
}

function isNearLabel(label: string, near: string, current: string) {
  return label === near || label === current;
}

function toSearchCard(item: SearchSalon, categories: MarketplaceCategory[]): SalonSearchCard {
  const city = item.city?.trim() || "";
  return {
    id: item.locationId,
    companyId: item.companyId,
    name: item.name,
    slug: item.slug,
    imageUrl: item.imageUrl,
    images: item.images,
    city,
    cityKey: city ? cityKeyFromName(city) : null,
    countryCode: "BE",
    address: item.address,
    treatmentNames: [],
    minimumPrice: null,
    rating: item.rating,
    reviewCount: item.reviewCount,
    likeCount: item.likeCount,
    source: "live",
    latitude: item.latitude,
    longitude: item.longitude,
    categories: categories.filter((category) => item.categoryIds.includes(category.id)),
    services: [],
  };
}

function byRating(left: SalonSearchCard, right: SalonSearchCard): number {
  return (right.reviewCount > 0 ? right.rating ?? 0 : 0) -
    (left.reviewCount > 0 ? left.rating ?? 0 : 0) || right.reviewCount - left.reviewCount;
}

export function SalonExplorer({
  locale,
  title,
  live,
  salons,
  initialQuery = "",
  initialWhere = null,
  initialLat = null,
  initialLng = null,
  initialDate = null,
  initialPart = "any",
}: SalonExplorerProps) {
  const home = homeCopy(locale);
  const copy = explorerCopy(locale);
  const language = localeConfig[locale].htmlLang;
  const openingPlace = initialLat != null && initialLng != null
    ? { label: initialWhere ?? "", lat: initialLat, lng: initialLng }
    : null;
  const [draft, setDraft] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const [city, setCity] = useState<string | null>(initialWhere);
  const [place, setPlace] = useState<Place | null>(openingPlace);
  const [user, setUser] = useState<MapPoint | null>(
    openingPlace && isNearLabel(openingPlace.label, home.placeNear, home.currentLocation)
      ? openingPlace
      : null,
  );
  const [when, setWhen] = useState<WhenValue>({ date: initialDate, part: initialPart });
  const [category, setCategory] = useState<string | null>(null);
  const [sort, setSort] = useState<Exclude<SalonSort, "price">>("recommended");
  const [catalog, setCatalog] = useState<MarketplaceCategory[]>([]);
  const [found, setFound] = useState<SearchSalon[]>([]);
  const [searching, setSearching] = useState(live);
  const [searchFailed, setSearchFailed] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [mapHidden, setMapHidden] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const filterRef = useRef<HTMLDetailsElement>(null);
  const filterId = useId();
  const favorites = useSalonFavorites();
  const pending = draft.trim() !== query;

  const searched = useMemo(
    () => found.map((item) => toSearchCard(item, catalog)),
    [found, catalog],
  );
  const visible = useMemo(() => {
    if (!live) {
      return filterSalons(salons, { query, category, sort, place, area: null });
    }
    return sort === "rating" ? [...searched].sort(byRating) : searched;
  }, [live, salons, searched, query, category, sort, place]);
  const categories = useMemo(() => {
    if (live) return catalog;
    return [...new Map(salons.flatMap((salon) => salon.categories).map((item) => [item.id, item])).values()];
  }, [live, catalog, salons]);
  const selected = visible.find((salon) => salon.id === selectedId) ?? null;
  const selectedCategory = selected ? primarySalonCategory(selected.categories, category) : null;
  const activeId = hoveredId ?? selected?.id ?? null;
  const pins = useMemo<SalonPin[]>(
    () => visible.flatMap((salon) =>
      salon.latitude == null || salon.longitude == null ? [] : [{
        id: salon.id,
        name: salon.name,
        category: primarySalonCategory(salon.categories, category),
        latitude: salon.latitude,
        longitude: salon.longitude,
      }],
    ),
    [visible, category],
  );
  const chips = useMemo(() => {
    const { anyDay, whenToday, whenTomorrow } = homeCopy(locale);
    const dayLanguage = localeConfig[locale].htmlLang;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return [
      { date: null, label: anyDay },
      ...Array.from({ length: 8 }, (_, index) => {
        const date = new Date(start);
        date.setDate(start.getDate() + index);
        return {
          date: iso(date),
          label: index === 0 ? whenToday : index === 1 ? whenTomorrow :
            new Intl.DateTimeFormat(dayLanguage, { weekday: "short", day: "numeric" }).format(date),
        };
      }),
    ];
  }, [locale]);

  useEffect(() => {
    const trimmed = draft.trim();
    if (trimmed === query) return;
    const timer = window.setTimeout(() => setQuery(trimmed), 240);
    return () => window.clearTimeout(timer);
  }, [draft, query]);

  useEffect(() => {
    if (!live) return;
    let cancelled = false;
    void listCategories(locale.slice(0, 2))
      .then((rows) => {
        if (!cancelled) setCatalog(rows);
      })
      .catch(() => {
        if (!cancelled) setCatalog([]);
      });
    return () => {
      cancelled = true;
    };
  }, [live, locale]);

  useEffect(() => {
    if (!live) return;
    let cancelled = false;
    setSearching(true);
    setSearchFailed(false);
    const center = place ? { lat: place.lat, lng: place.lng } : null;
    void searchSalons({
      q: query || undefined,
      categoryIds: category ? [category] : undefined,
      center,
      radiusKm: center && !query ? SEARCH_RADIUS_KM : undefined,
      bbox: center || query ? null : BELGIUM_BBOX,
      limit: 50,
    })
      .then((items) => {
        if (!cancelled) setFound(items);
      })
      .catch(() => {
        if (!cancelled) {
          setFound([]);
          setSearchFailed(true);
        }
      })
      .finally(() => {
        if (!cancelled) setSearching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [live, query, category, place]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const set = (key: string, value: string | null) => {
      if (value) url.searchParams.set(key, value);
      else url.searchParams.delete(key);
    };
    set("q", query || null);
    set("where", place?.label || null);
    set("lat", place ? String(place.lat) : null);
    set("lng", place ? String(place.lng) : null);
    set("date", when.date);
    set("part", when.part === "any" ? null : when.part);
    const next = `${url.pathname}${url.search}${url.hash}`;
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (next !== current) window.history.replaceState(null, "", next);
  }, [query, place, when]);

  useEffect(() => {
    const restoreQuery = () => {
      const params = new URL(window.location.href).searchParams;
      const next = readExplorerSearch({
        q: params.get("q"),
        where: params.get("where"),
        lat: params.get("lat"),
        lng: params.get("lng"),
        date: params.get("date"),
        part: params.get("part"),
      });
      setDraft(next.query);
      setQuery(next.query);
      if (next.lat != null && next.lng != null) {
        const label = next.where ?? "";
        setCity(next.where);
        setPlace({ label, lat: next.lat, lng: next.lng });
        setUser(isNearLabel(label, home.placeNear, home.currentLocation) ? { lat: next.lat, lng: next.lng } : null);
      } else {
        setCity(null);
        setPlace(null);
        setUser(null);
      }
      setWhen({ date: next.date, part: next.part });
    };
    window.addEventListener("popstate", restoreQuery);
    return () => window.removeEventListener("popstate", restoreQuery);
  }, [home.currentLocation, home.placeNear]);

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        filterRef.current.open = false;
      }
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && filterRef.current?.open) {
        filterRef.current.open = false;
        filterRef.current.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, []);

  function commitSearch(value = draft) {
    const trimmed = value.trim();
    setDraft(trimmed);
    setQuery(trimmed);
  }

  function resetFilters() {
    commitSearch("");
    setCategory(null);
    setSort("recommended");
  }

  function selectSalon(id: string) {
    setSelectedId(id);
    if (window.matchMedia("(min-width: 1024px)").matches) {
      document.getElementById(`salon-${id}`)?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
        block: "nearest",
      });
    }
  }

  const heading = query ? home.exploreResults(query) : city ? copy.near(city) : home.exploreBelgium;
  const activeCategory = categories.find((item) => item.id === category);
  const hasFilters = Boolean(query || category);

  return (
    <div className={styles.explorer}>
      <SiteHeader
        locale={locale}
        route={{ kind: "salons" }}
        search={
          <DiscoverSearch
            locale={locale}
            copy={home}
            treatment={draft}
            city={city}
            when={when}
            pending={pending}
            onTreatment={setDraft}
            onCity={(label, point) => {
              setCity(label);
              setPlace(label && point ? { label, ...point } : null);
              if (point && label === home.currentLocation) setUser(point);
            }}
            onWhen={setWhen}
            onSearch={() => commitSearch()}
          />
        }
      />
      <div className={styles.workspace} data-map-hidden={mapHidden} data-mobile-map={mapOpen}>
        <section className={styles.list} aria-labelledby="salon-results-title">
          <div className={styles.toolbar}>
            <div className={styles.headingRow}>
              <div className={styles.heading}>
                <h1 id="salon-results-title" title={title}>{heading}</h1>
                <p role="status" aria-live="polite">
                  {pending || searching ? home.loading : copy.results(visible.length)}
                  <span className={styles.resultsSort}> · {sort === "rating" ? copy.topRated : copy.recommended}</span>
                </p>
              </div>
              <div className={styles.toolbarActions}>
                <details ref={filterRef} className={styles.filters}>
                  <summary className={styles.pillButton} aria-controls={filterId}>
                    <SlidersHorizontalIcon size={15} aria-hidden="true" />
                    <span>{copy.filters}</span>
                    {category || sort !== "recommended" ? <span className={styles.filterDot} /> : null}
                  </summary>
                  <div id={filterId} className={styles.filterPanel}>
                    <div className={styles.filterPanelHeading}>
                      <h2>{copy.filters}</h2>
                      <button type="button" aria-label={home.pickerDone} onClick={() => { if (filterRef.current) filterRef.current.open = false; }}><XIcon size={18} /></button>
                    </div>
                    {categories.length > 0 ? (
                      <fieldset>
                        <legend>{copy.categories}</legend>
                        <div className={styles.filterOptions}>
                          {[{ id: null, name: copy.all, slug: "all" }, ...categories].map((item) => (
                            <button type="button" key={item.id ?? "all"} aria-pressed={category === item.id} onClick={() => setCategory(item.id)} data-selected={category === item.id}>
                              <CategoryIcon icon={categoryIconKey(item.slug)} size={17} />
                              {item.name}
                            </button>
                          ))}
                        </div>
                      </fieldset>
                    ) : null}
                    <label className={styles.sortLabel} htmlFor={`${filterId}-sort`}>{copy.sort}</label>
                    <div className={styles.sortControl}>
                      <select id={`${filterId}-sort`} value={sort} onChange={(event) => setSort(event.target.value === "rating" ? "rating" : "recommended")}>
                        <option value="recommended">{copy.recommended}</option>
                        <option value="rating">{copy.topRated}</option>
                      </select>
                      <ChevronDownIcon size={16} aria-hidden="true" />
                    </div>
                    <div className={styles.filterFooter}>
                      <button type="button" onClick={() => { setCategory(null); setSort("recommended"); }}>{copy.reset}</button>
                      <button type="button" onClick={() => { if (filterRef.current) filterRef.current.open = false; }}>{copy.done}</button>
                    </div>
                  </div>
                </details>
                <button type="button" onClick={() => setMapHidden((hidden) => !hidden)} className={`${styles.pillButton} ${styles.desktopMapToggle}`} aria-pressed={!mapHidden}>
                  <MapIcon size={15} aria-hidden="true" />
                  {mapHidden ? home.showMapBar : home.hideMap}
                </button>
              </div>
            </div>
            <div className={styles.dateRail} aria-label={home.when}>
              {chips.map((chip) => (
                <button key={chip.date ?? "any"} type="button" aria-pressed={when.date === chip.date} onClick={() => setWhen({ ...when, date: chip.date })} data-selected={when.date === chip.date}>
                  {chip.label}
                </button>
              ))}
              {when.date && !chips.some((chip) => chip.date === when.date) ? (
                <button type="button" aria-pressed="true" data-selected="true">{new Intl.DateTimeFormat(language, { day: "numeric", month: "short" }).format(new Date(`${when.date}T12:00:00`))}</button>
              ) : null}
            </div>
            {hasFilters ? (
              <div className={styles.activeFilters}>
                {query ? <button type="button" onClick={() => commitSearch("")}>{query}<XIcon size={12} aria-hidden="true" /><span className="sr-only">{home.clearSearch}</span></button> : null}
                {activeCategory ? <button type="button" onClick={() => setCategory(null)}>{activeCategory.name}<XIcon size={12} aria-hidden="true" /><span className="sr-only">{copy.reset}</span></button> : null}
              </div>
            ) : null}
            {when.date || when.part !== "any" ? <p className={styles.dateHint}>{copy.dateHint}</p> : null}
            <span className={styles.searchProgress} data-pending={pending || searching} aria-hidden="true" />
          </div>

          <div className={styles.resultBody} aria-busy={pending || searching} data-pending={pending || searching}>
            {favorites.error ? <p role="alert" className={styles.saveError}>{copy.saveError}</p> : null}
            {searching && visible.length === 0 && !searchFailed ? (
              <div className={styles.cards} aria-hidden="true">
                {Array.from({ length: 4 }, (_, index) => (
                  <div key={index}>
                    <div className={`${styles.skeleton} ${styles.skeletonImage}`} />
                    <div className={`${styles.skeleton} ${styles.skeletonName}`} />
                    <div className={`${styles.skeleton} ${styles.skeletonLocation}`} />
                  </div>
                ))}
              </div>
            ) : visible.length > 0 ? (
              <ul className={styles.cards}>
                {visible.map((salon, index) => (
                  <li key={salon.id} id={`salon-${salon.id}`} className={styles.cardItem} style={{ animationDelay: `${Math.min(index, 5) * 45}ms` }}>
                    <SalonResultCard
                      salon={salon}
                      locale={locale}
                      place={place}
                      active={activeId === salon.id}
                      saved={favorites.ids.has(salon.id)}
                      saving={favorites.loading || favorites.pendingIds.has(salon.id)}
                      eager={index < 2}
                      onSave={() => void favorites.toggle(salon.id)}
                      onHover={(hovered) => setHoveredId(hovered ? salon.id : null)}
                    />
                  </li>
                ))}
              </ul>
            ) : searchFailed ? (
              <p role="alert" className={styles.saveError}>{copy.loadError}</p>
            ) : (
              <RecoveryPanel locale={locale} compact onReset={hasFilters ? resetFilters : undefined} />
            )}
          </div>
        </section>

        <aside className={styles.mapPane} aria-label={copy.mapLabel}>
          <div className={styles.mapFrame}>
            <SalonSearchMap
              salons={pins}
              activeId={activeId}
              place={place}
              user={user}
              locale={locale}
              fitResults={!place}
              onSelect={selectSalon}
            />
            <div className={styles.mapCount}><span /><MapPinIcon size={13} aria-hidden="true" />{copy.results(pins.length)}</div>
            {selected ? (
              <div key={selected.id} className={styles.mapPreview}>
                <Link href={routeFor(locale, { kind: "salon", city: selected.cityKey ?? selected.city, salon: selected.slug })} className={styles.mapPreviewLink}>
                  <div className={styles.mapPreviewPhoto}><SalonPhoto key={selected.imageUrl} src={selected.imageUrl} name={selected.name} sizes="88px" /></div>
                  <div className={styles.mapPreviewDetails}>
                    <strong>{selected.name}</strong>
                    <span>{selected.city}{selected.rating != null && selected.reviewCount > 0 ? <> · <StarIcon size={11} fill="currentColor" aria-hidden="true" /> {selected.rating.toFixed(1)}</> : null}</span>
                    <small>
                      <CategoryIcon icon={categoryIconKey(selectedCategory?.slug)} size={14} />
                      <span>{selectedCategory?.name ?? copy.viewSalon}</span>
                      <ArrowUpRightIcon size={13} aria-hidden="true" />
                    </small>
                  </div>
                </Link>
                <button type="button" className={styles.closePreview} aria-label={copy.closePreview} onClick={() => setSelectedId(null)}><XIcon size={15} aria-hidden="true" /></button>
              </div>
            ) : null}
          </div>
        </aside>
      </div>
      <button type="button" onClick={() => { setMapOpen((open) => !open); setMapHidden(false); }} className={styles.mobileMapToggle} aria-pressed={mapOpen}>
        {mapOpen ? <LayoutListIcon size={17} aria-hidden="true" /> : <MapIcon size={17} aria-hidden="true" />}
        {mapOpen ? home.showList : home.showMap}
        <span>{visible.length}</span>
      </button>
    </div>
  );
}
