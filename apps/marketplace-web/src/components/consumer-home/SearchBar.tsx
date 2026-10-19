"use client";

import { useState, type ReactNode } from "react";
import { SearchIcon } from "lucide-react";
import type { HomeCopy } from "./messages";

type SearchBarProps = {
  copy: HomeCopy;
  nearby: boolean;
  onSearch: (query: string) => void;
};

export function SearchBar({ copy, nearby, onSearch }: SearchBarProps) {
  const [treatment, setTreatment] = useState("");
  const [when, setWhen] = useState("any");
  const whenOptions = [
    { value: "any", label: copy.whenAny },
    { value: "today", label: copy.whenToday },
    { value: "tomorrow", label: copy.whenTomorrow },
    { value: "weekend", label: copy.whenWeekend },
  ];

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(treatment);
      }}
      className="grid gap-1 rounded-3xl border border-line bg-white p-2 shadow-soft md:flex md:items-center md:rounded-full"
    >
      <Field label={copy.treatment} htmlFor="treatment" className="md:flex-[1.3]">
        <input
          id="treatment"
          value={treatment}
          onChange={(event) => setTreatment(event.target.value)}
          placeholder={copy.treatmentPlaceholder}
          className="w-full bg-transparent text-[15px] text-navy placeholder:text-ink-faint focus:outline-none"
        />
      </Field>
      <Divider />
      <Field label={copy.where} htmlFor="location" className="md:flex-1">
        <input
          id="location"
          value={nearby ? copy.placeNear : copy.placeBelgium}
          readOnly
          className="w-full bg-transparent text-[15px] text-navy placeholder:text-ink-faint focus:outline-none"
        />
      </Field>
      <Divider />
      <Field label={copy.when} htmlFor="when" className="md:flex-1">
        <select
          id="when"
          value={when}
          onChange={(event) => setWhen(event.target.value)}
          className="w-full cursor-pointer appearance-none bg-transparent text-[15px] text-navy focus:outline-none"
        >
          {whenOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Field>
      <button
        type="submit"
        className="mt-1 inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-navy px-6 text-[15px] font-semibold text-white transition-colors duration-150 hover:bg-navy-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peri focus-visible:ring-offset-2 md:mt-0 md:h-14"
      >
        <SearchIcon className="h-[18px] w-[18px]" aria-hidden="true" />
        {copy.search}
      </button>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  className = "",
  children,
}: {
  label: string;
  htmlFor: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={`block min-w-0 cursor-text rounded-2xl px-4 py-2.5 transition-colors duration-150 focus-within:bg-peri-tint hover:bg-page md:rounded-full md:px-5 ${className}`}
    >
      <span className="block text-xs font-semibold text-navy">{label}</span>
      <span className="mt-0.5 block">{children}</span>
    </label>
  );
}

function Divider() {
  return <span className="hidden h-8 w-px shrink-0 bg-line md:block" aria-hidden="true" />;
}
