"use client";

import type { Category } from "./types";

type CategoryPillsProps = {
  categories: Array<"All" | Category>;
  active: "All" | Category;
  onChange: (category: "All" | Category) => void;
};

export function CategoryPills({ categories, active, onChange }: CategoryPillsProps) {
  return (
    <div className="-mx-5 overflow-x-auto px-5 md:mx-0 md:px-0" role="group" aria-label="Filter by category">
      <div className="flex w-max gap-2">
        {categories.map((category) => {
          const isActive = category === active;
          return (
            <button
              key={category}
              type="button"
              aria-pressed={isActive}
              onClick={() => onChange(category)}
              className={`whitespace-nowrap rounded-full px-5 py-2.5 text-[15px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peri focus-visible:ring-offset-2 focus-visible:ring-offset-page ${
                isActive ? "bg-navy text-white" : "bg-surface text-navy hover:bg-peri-soft"
              }`}
            >
              {category === "All" ? "All treatments" : category}
            </button>
          );
        })}
      </div>
    </div>
  );
}
