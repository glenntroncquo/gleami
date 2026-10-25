"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { ArrowLeftIcon, ArrowUpRightIcon } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { localeConfig, localeFromPathname, routeFor } from "@/lib/i18n";
import { RecoveryPanel } from "./RecoveryPanel";
import { recoveryMessages } from "./recovery-copy";
import styles from "./RecoveryPanel.module.css";

export function NotFoundView({ global = false }: { global?: boolean }) {
  const pathname = usePathname();
  const locale = localeFromPathname(pathname ?? "/");
  const copy = recoveryMessages[localeConfig[locale].language];

  useEffect(() => {
    if (global) document.documentElement.lang = localeConfig[locale].htmlLang;
  }, [global, locale]);

  return (
    <div className={styles.notFoundPage}>
      <header className={styles.header}>
        <Link href={routeFor(locale, { kind: "home" })} aria-label="Gleami"><Logo className="h-8 w-auto" /></Link>
        <Link href={routeFor(locale, { kind: "home" })} className={styles.headerHome}><ArrowLeftIcon size={14} aria-hidden="true" />{copy.home}</Link>
      </header>
      <main id="main">
        <RecoveryPanel locale={locale} variant="not-found" />
      </main>
      <footer className={styles.footer}>
        <p>{copy.footer}</p>
        <Link href={routeFor(locale, { kind: "salons" })}>{copy.footerLink}<ArrowUpRightIcon size={13} aria-hidden="true" /></Link>
      </footer>
    </div>
  );
}
