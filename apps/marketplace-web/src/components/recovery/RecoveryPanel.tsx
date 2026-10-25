"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRightIcon, MapIcon, ShuffleIcon, SparklesIcon } from "lucide-react";
import { CategoryIcon } from "@/components/marketplace/CategoryIcon";
import { localeConfig, routeFor, treatmentNames, type Locale } from "@/lib/i18n";
import { recoveryMessages, recoveryTreatments, surpriseTreatment } from "./recovery-copy";
import styles from "./RecoveryPanel.module.css";

type RecoveryPanelProps = {
  locale: Locale;
  variant?: "empty" | "not-found";
  compact?: boolean;
  onReset?: () => void;
};

export function RecoveryPanel({ locale, variant = "empty", compact = false, onReset }: RecoveryPanelProps) {
  const router = useRouter();
  const language = localeConfig[locale].language;
  const copy = recoveryMessages[language];
  const notFound = variant === "not-found";
  const message = notFound ? copy.notFound : copy.empty;
  const Heading = notFound ? "h1" : compact ? "h2" : "h3";
  const salonsHref = routeFor(locale, { kind: "salons" });
  const [surprising, setSurprising] = useState(false);

  function surprise() {
    if (surprising) return;
    setSurprising(true);
    router.push(routeFor(locale, { kind: "treatment", treatment: surpriseTreatment(Math.random()) }));
  }

  return (
    <div className={styles.panel} data-variant={variant} data-compact={compact}>
      <div className={styles.content}>
        <p className={styles.eyebrow}><SparklesIcon size={13} aria-hidden="true" />{message.eyebrow}</p>
        <Heading className={styles.title}>
          {message.title}
          <span>{message.accent}</span>
        </Heading>
        <p className={styles.description}>{message.body}</p>
        <div className={styles.actions}>
          {onReset ? (
            <button type="button" className={styles.primary} onClick={onReset}>{copy.reset}<ArrowRightIcon size={17} aria-hidden="true" /></button>
          ) : (
            <Link className={styles.primary} href={salonsHref}>{copy.discover}<ArrowRightIcon size={17} aria-hidden="true" /></Link>
          )}
          <Link className={styles.secondary} href={notFound ? routeFor(locale, { kind: "home" }) : salonsHref}>
            {notFound ? null : <MapIcon size={15} aria-hidden="true" />}
            {notFound ? copy.home : copy.map}
          </Link>
        </div>
        <div className={styles.suggestions}>
          <p>{copy.suggestions}</p>
          <div className={styles.treatments}>
            {recoveryTreatments.map(({ treatment, icon }) => (
              <Link key={treatment} href={routeFor(locale, { kind: "treatment", treatment })} className={styles.treatment}>
                <CategoryIcon icon={icon} size={17} />
                {treatmentNames[treatment][language]}
              </Link>
            ))}
            <button type="button" className={styles.surprise} onClick={surprise} disabled={surprising} aria-label={`${copy.surprise}: ${copy.surpriseHint}`}>
              <ShuffleIcon size={15} aria-hidden="true" />
              {copy.surprise}
            </button>
          </div>
        </div>
      </div>
      <figure className={styles.art}>
        {notFound ? <span className={styles.errorCode} aria-hidden="true">404</span> : null}
        <div className={styles.imageWrap}>
          <Image
            src="/illustrations/gleami-beauty-break.webp"
            alt=""
            width={1000}
            height={1000}
            sizes={compact ? "(max-width: 639px) 200px, 260px" : "(max-width: 639px) 260px, (max-width: 1023px) 340px, 490px"}
            loading={notFound ? "eager" : "lazy"}
            className={styles.image}
          />
        </div>
        <figcaption className={styles.caption}><span />{copy.caption}</figcaption>
      </figure>
    </div>
  );
}
