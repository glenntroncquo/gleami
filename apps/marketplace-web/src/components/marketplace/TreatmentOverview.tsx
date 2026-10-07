import Link from "next/link";
import {
  ArrowRightIcon,
  ScissorsIcon,
  SparklesIcon,
  SprayCanIcon,
  WandSparklesIcon,
} from "lucide-react";
import { treatmentEditorial } from "@/data/treatments";
import { getCopy } from "@/lib/copy";
import {
  localeConfig,
  routeFor,
  treatmentNames,
  treatmentSlugs,
  type Locale,
  type TreatmentKey,
} from "@/lib/i18n";

type TreatmentOverviewProps = {
  locale: Locale;
};

const icons = [ScissorsIcon, SparklesIcon, SprayCanIcon, WandSparklesIcon];

export function TreatmentOverview({ locale }: TreatmentOverviewProps) {
  const copy = getCopy(locale);
  const language = localeConfig[locale].language;
  const treatments = Object.keys(treatmentSlugs) as TreatmentKey[];

  return (
    <div className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-24">
      <div className="max-w-4xl">
        <p className="text-[14px] font-medium text-rose-600">
          {copy.nav.treatments}
        </p>
        <h1 className="mt-4 text-balance text-[46px] font-semibold leading-[1.03] tracking-tightest md:text-[72px]">
          {copy.treatment.indexTitle}
        </h1>
        <p className="mt-6 max-w-2xl text-[18px] leading-relaxed text-muted">
          {copy.treatment.indexDescription}
        </p>
      </div>

      <div className="mt-14 grid gap-4 sm:grid-cols-2 md:mt-20">
        {treatments.map((treatment, index) => {
          const Icon = icons[index];
          const editorial = treatmentEditorial[treatment][language];
          return (
            <Link
              key={treatment}
              href={routeFor(locale, { kind: "treatment", treatment })}
              className="group rounded-[28px] bg-white p-7 ring-1 ring-line transition hover:-translate-y-1 hover:shadow-soft md:p-9"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-700">
                <Icon aria-hidden="true" className="h-5 w-5" />
              </span>
              <h2 className="mt-8 text-[26px] font-semibold tracking-tight">
                {treatmentNames[treatment][language]}
              </h2>
              <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted">
                {editorial.summary}
              </p>
              <span className="mt-7 inline-flex items-center gap-2 text-[14px] font-medium">
                {copy.actions.explore}
                <ArrowRightIcon
                  aria-hidden="true"
                  className="h-4 w-4 transition group-hover:translate-x-1"
                />
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
