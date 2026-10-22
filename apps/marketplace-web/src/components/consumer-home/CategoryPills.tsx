"use client";

type CategoryPillsProps = {
  categories: Array<{ id: string | null; name: string }>;
  active: string | null;
  label: string;
  onChange: (id: string | null) => void;
};

export function CategoryPills({ categories, active, label, onChange }: CategoryPillsProps) {
  return (
    <div className="no-scrollbar -mx-5 overflow-x-auto px-5 md:mx-0 md:px-0" role="group" aria-label={label}>
      <div className="flex w-max gap-2">
        {categories.map((category) => {
          const isActive = category.id === active;
          return (
            <button
              key={category.id ?? "all"}
              type="button"
              aria-pressed={isActive}
              onClick={() => onChange(category.id)}
              className={`whitespace-nowrap rounded-full px-5 py-2.5 text-[15px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peri focus-visible:ring-offset-2 focus-visible:ring-offset-page ${
                isActive ? "bg-navy text-white" : "bg-surface text-navy hover:bg-peri-soft"
              }`}
            >
              {category.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
