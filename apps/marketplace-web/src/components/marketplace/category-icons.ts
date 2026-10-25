// Stable marketplace slugs, not translated labels, determine the icon.
export const categoryIconPaths = {
  herenkapper: [
    "M8 2v4m3-4v4m3-4v4m3-4v4",
    "M7 6h11v4H7z",
    "M8 10v9a2 2 0 0 0 2 2h5a2 2 0 0 0 2-2v-9",
    "M11 14h3",
  ],
  vrouwenkapper: [
    "M6 20c-2-3-2-6-1-10C6 5 8 3 12 3s6 2 7 7c1 4 1 7-1 10",
    "M8 20c-2-4-1-7 1-10 1 3 4 3 7 3v1c0 4-2 7-4 7s-4-2-4-5",
    "M9 10c2-1 3-2 3-4",
  ],
  "haar-en-styling": [
    "M8 6a3 3 0 1 1-6 0a3 3 0 0 1 6 0",
    "M8 18a3 3 0 1 1-6 0a3 3 0 0 1 6 0",
    "m7.3 8.2 12.7 12.8M7.3 15.8 20 3",
  ],
  keratine: [
    "M6 3c-4 5 4 8 0 13M11 3c-4 5 4 8 0 17",
    "m18 4 1 3 3 1-3 1-1 3-1-3-3-1 3-1Z",
  ],
  "wenkbrauwen-en-wimpers": [
    "M3 12c3-5 15-5 18 0-3 5-15 5-18 0Z",
    "M14 12a2 2 0 1 1-4 0a2 2 0 0 1 4 0",
    "M5 9 3.5 6M9 8 8 4.5M15 8l1-3.5M19 9l1.5-3",
  ],
  massagesalon: [
    "M20 17.5a8 3.5 0 1 1-16 0a8 3.5 0 0 1 16 0Z",
    "M18 11.5a6 3 0 1 1-12 0a6 3 0 0 1 12 0Z",
    "M16 6a4 2.5 0 1 1-8 0a4 2.5 0 0 1 8 0Z",
  ],
  ontharing: [
    "M5 4h14v5H5zM7 6.5h10",
    "M9 9v2l1.5 2v7a1.5 1.5 0 0 0 3 0v-7l1.5-2V9",
  ],
  nagels: [
    "M9 2h6v6H9z",
    "M8 8h8l2 4v8a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-8l2-4Z",
    "M9 12h6M9 15h3",
  ],
  gezichtsbehandeling: [
    "M12 2c5 0 8 3 8 8 0 6-4 12-8 12s-8-6-8-12c0-5 3-8 8-8Z",
    "M7 9h3m4 0h3M12 10v4h2M9 17c2 1.5 4 1.5 6 0",
  ],
  "make-up": [
    "M8 13h8v8H8z",
    "M9 13V5l6-3v11M9 8h6M8 17h8",
  ],
  "tatoeages-en-piercings": [
    "m4 20 4-4m0 0-2-2 9-9 4 4-9 9-2-2Z",
    "m14 6-2-2 2-2 2 2m2 6 2 2 2-2-2-2m-3-5 4 4",
  ],
  salon: [
    "m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z",
  ],
  all: [
    "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  ],
} as const;

export type CategoryIconKey = keyof typeof categoryIconPaths;
export type IconCategory = { id: string; name: string; slug: string };

const demoAliases: Record<string, CategoryIconKey> = {
  "hair-salon": "haar-en-styling",
  colour: "haar-en-styling",
  barber: "herenkapper",
  "nail-studio": "nagels",
  keratin: "keratine",
};

export function categoryIconKey(slug: string | null | undefined): CategoryIconKey {
  if (slug && Object.hasOwn(categoryIconPaths, slug)) return slug as CategoryIconKey;
  if (slug && Object.hasOwn(demoAliases, slug)) return demoAliases[slug];
  return "salon";
}

export function primarySalonCategory(
  categories: readonly IconCategory[],
  selectedId: string | null = null,
): IconCategory | null {
  return categories.find((category) => category.id === selectedId) ??
    categories.find((category) => categoryIconKey(category.slug) !== "salon") ??
    categories[0] ?? null;
}

/** The same path data powers React filters and Mapbox's DOM markers. */
export function createCategoryIconElement(key: CategoryIconKey): SVGSVGElement {
  const namespace = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(namespace, "svg");
  for (const [name, value] of Object.entries({
    viewBox: "0 0 24 24",
    width: "20",
    height: "20",
    fill: "none",
    stroke: "currentColor",
    "stroke-width": "1.65",
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    "aria-hidden": "true",
    focusable: "false",
  })) svg.setAttribute(name, value);
  for (const d of categoryIconPaths[key]) {
    const path = document.createElementNS(namespace, "path");
    path.setAttribute("d", d);
    svg.appendChild(path);
  }
  return svg;
}
