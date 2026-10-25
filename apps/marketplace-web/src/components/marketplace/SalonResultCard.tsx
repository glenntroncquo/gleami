"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRightIcon, ChevronLeftIcon, ChevronRightIcon, HeartIcon, MapPinIcon, StarIcon } from "lucide-react";
import type { SalonSearchCard } from "@/data/marketplace";
import { homeCopy } from "@/components/consumer-home/messages";
import { localeConfig, routeFor, type Locale } from "@/lib/i18n";
import type { MapPoint } from "@/lib/places";
import { explorerCopy } from "./explorer-copy";
import { distanceKm } from "./salon-explorer-utils";
import { SalonPhoto } from "./SalonPhoto";
import styles from "./SalonExplorer.module.css";

export function SalonResultCard({
  salon, locale, place, active, saved, saving, eager, onSave, onHover,
}: {
  salon: SalonSearchCard;
  locale: Locale;
  place: MapPoint | null;
  active: boolean;
  saved: boolean;
  saving: boolean;
  eager: boolean;
  onSave: () => void;
  onHover: (active: boolean) => void;
}) {
  const copy = explorerCopy(locale);
  const home = homeCopy(locale);
  const [photoIndex, setPhotoIndex] = useState(0);
  const photos = [...new Set([salon.imageUrl, ...salon.images].filter((image): image is string => Boolean(image) && image !== "/og/home.jpg"))];
  const href = routeFor(locale, { kind: "salon", city: salon.cityKey ?? salon.city, salon: salon.slug });
  const distance = place && salon.latitude != null && salon.longitude != null
    ? distanceKm(place, salon.latitude, salon.longitude)
    : null;
  const location = [
    distance != null ? `${new Intl.NumberFormat(localeConfig[locale].htmlLang, { maximumFractionDigits: 1 }).format(distance)} km` : null,
    salon.address || salon.city,
  ].filter(Boolean).join(" · ");

  return (
    <article
      className={styles.card}
      data-active={active}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onFocus={() => onHover(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) onHover(false);
      }}
    >
      <div className={styles.cardMedia}>
        <Link href={href} aria-label={salon.name} className={styles.photoLink}>
          <SalonPhoto key={photos[photoIndex] ?? "fallback"} src={photos[photoIndex] ?? null} name={salon.name} caption={copy.photoFallback} eager={eager} />
        </Link>
        <button
          type="button"
          className={styles.saveButton}
          aria-label={saved ? home.unsave(salon.name) : home.save(salon.name)}
          aria-pressed={saved}
          disabled={saving}
          onClick={onSave}
        >
          <HeartIcon aria-hidden="true" size={18} className={saved ? "fill-current text-peri-dark" : ""} />
        </button>
        {photos.length > 1 ? (
          <>
            <button type="button" aria-label={copy.previousPhoto} className={`${styles.photoArrow} ${styles.photoPrevious}`} onClick={() => setPhotoIndex((index) => (index - 1 + photos.length) % photos.length)}>
              <ChevronLeftIcon size={17} aria-hidden="true" />
            </button>
            <button type="button" aria-label={copy.nextPhoto} className={`${styles.photoArrow} ${styles.photoNext}`} onClick={() => setPhotoIndex((index) => (index + 1) % photos.length)}>
              <ChevronRightIcon size={17} aria-hidden="true" />
            </button>
            <span className={styles.photoDots} aria-label={copy.photo(photoIndex + 1, photos.length)}>
              {photos.map((photo, index) => <span key={photo} data-active={index === photoIndex} />)}
            </span>
          </>
        ) : null}
      </div>
      <div className={styles.cardDetails}>
        <div className={styles.cardHeading}>
          <h2><Link href={href}>{salon.name}</Link></h2>
          {salon.rating != null && salon.reviewCount > 0 ? (
            <span className={styles.rating}>
              <StarIcon size={13} fill="currentColor" aria-hidden="true" />
              {salon.rating.toFixed(1)}
              <span>({salon.reviewCount})</span>
            </span>
          ) : null}
        </div>
        <p className={styles.cardLocation} title={location}><MapPinIcon size={13} aria-hidden="true" />{location}</p>
        {salon.categories.length > 0 ? (
          <p className={styles.cardCategory}>{salon.categories.map((category) => category.name).join(" · ")}</p>
        ) : null}
        <Link href={href} className={styles.cardCta}>
          {copy.viewSalon}
          <ArrowUpRightIcon size={15} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
