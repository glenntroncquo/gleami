"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { defaultLocale, isLocale, localeConfig } from "@/lib/i18n";

export default function NotFound() {
  const pathname = usePathname();
  const segment = pathname.split("/").filter(Boolean)[0] ?? "";
  const locale = isLocale(segment) ? segment : defaultLocale;
  const language = localeConfig[locale].language;
  const content =
    language === "fr"
      ? {
          title: "Cette page n’existe pas.",
          body: "Retournez sur Gleami pour découvrir des salons et des prestations.",
          action: "Retour à Gleami",
        }
      : language === "de"
        ? {
            title: "Diese Seite gibt es nicht.",
            body: "Zurück zu Gleami, um Salons und Behandlungen zu entdecken.",
            action: "Zu Gleami",
          }
        : {
            title: "Deze pagina bestaat niet.",
            body: "Ga terug naar Gleami om salons en behandelingen te ontdekken.",
            action: "Naar Gleami",
          };

  return (
    <main className="flex min-h-screen items-center justify-center px-5">
      <div className="max-w-lg text-center">
        <p className="text-[14px] font-medium text-rose-600">404</p>
        <h1 className="mt-4 text-[42px] font-semibold tracking-tight">
          {content.title}
        </h1>
        <p className="mt-4 text-muted">{content.body}</p>
        <Link
          href={`/${locale}/`}
          className="mt-8 inline-flex h-11 items-center rounded-full bg-ink px-5 text-[14px] font-medium text-white"
        >
          {content.action}
        </Link>
      </div>
    </main>
  );
}
