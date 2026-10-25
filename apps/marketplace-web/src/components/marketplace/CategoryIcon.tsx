import { categoryIconPaths, type CategoryIconKey } from "./category-icons";

export function CategoryIcon({
  icon,
  size = 18,
  className,
}: {
  icon: CategoryIconKey;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.65}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {categoryIconPaths[icon].map((d) => <path key={d} d={d} />)}
    </svg>
  );
}
