/**
 * Centralized service color configuration
 * This makes it easy to adjust colors across the entire application
 */

export type ServiceColor =
  | "blue"
  | "orange"
  | "violet"
  | "rose"
  | "emerald"
  | "cyan"
  | "lime"
  | "pink"
  | "indigo"
  | "amber"
  | "teal"
  | "purple";

export type EventColor =
  | "blue"
  | "orange"
  | "violet"
  | "rose"
  | "emerald"
  | "cyan"
  | "lime"
  | "pink"
  | "indigo"
  | "amber"
  | "teal"
  | "purple";

export const SERVICE_COLORS: readonly ServiceColor[] = [
  "blue",
  "orange",
  "violet",
  "rose",
  "emerald",
  "cyan",
  "lime",
  "pink",
  "indigo",
  "amber",
  "teal",
  "purple",
] as const;

export const COLOR_MAP: Record<ServiceColor, string> = {
  blue: "#3B82F6",
  orange: "#F97316",
  violet: "#8B5CF6",
  rose: "#F43F5E",
  emerald: "#10B981",
  cyan: "#06B6D4",
  lime: "#84CC16",
  pink: "#EC4899",
  indigo: "#6366F1",
  amber: "#F59E0B",
  teal: "#14B8A6",
  purple: "#A855F7",
};

export const COLOR_CLASSES: Record<ServiceColor, string> = {
  blue: "bg-blue-500",
  orange: "bg-orange-500",
  violet: "bg-violet-500",
  rose: "bg-rose-500",
  emerald: "bg-emerald-500",
  cyan: "bg-cyan-500",
  lime: "bg-lime-500",
  pink: "bg-pink-500",
  indigo: "bg-indigo-500",
  amber: "bg-amber-500",
  teal: "bg-teal-500",
  purple: "bg-purple-500",
};

export const COLOR_NAMES: Record<ServiceColor, string> = {
  blue: "Blauw",
  orange: "Oranje",
  violet: "Paars",
  rose: "Roze",
  emerald: "Groen",
  cyan: "Cyaan",
  lime: "Limoen",
  pink: "Roze",
  indigo: "Indigo",
  amber: "Amber",
  teal: "Teal",
  purple: "Paars",
};

export const getServiceColorCSS = (color: ServiceColor): string => {
  return COLOR_MAP[color];
};

export const getServiceColorClass = (color: ServiceColor): string => {
  return COLOR_CLASSES[color];
};

export const getServiceColorName = (color: ServiceColor): string => {
  return COLOR_NAMES[color];
};

export const mapServiceColorToEventColor = (
  serviceColor: string | null,
  serviceName?: string
): EventColor => {
  if (!serviceColor) {
    if (serviceName) {
      const name = serviceName.toLowerCase();
      if (
        name.includes("hair") ||
        name.includes("cut") ||
        name.includes("color") ||
        name.includes("style")
      )
        return "emerald";
      if (
        name.includes("nail") ||
        name.includes("manicure") ||
        name.includes("pedicure")
      )
        return "orange";
      if (
        name.includes("facial") ||
        name.includes("beauty") ||
        name.includes("makeup")
      )
        return "violet";
      if (
        name.includes("massage") ||
        name.includes("spa") ||
        name.includes("relax")
      )
        return "rose";
    }
    return "blue";
  }

  const color = serviceColor.toLowerCase();

  if (color.includes("blue")) return "blue";
  if (color.includes("orange") || color.includes("yellow")) return "orange";
  if (color.includes("violet") || color.includes("purple")) return "violet";
  if (color.includes("rose") || color.includes("red") || color.includes("pink"))
    return "pink";
  if (color.includes("green") || color.includes("emerald")) return "emerald";
  if (color.includes("cyan")) return "cyan";
  if (color.includes("lime")) return "lime";
  if (color.includes("indigo")) return "indigo";
  if (color.includes("amber")) return "amber";
  if (color.includes("teal")) return "teal";

  const hash = color.split("").reduce((a, b) => a + b.charCodeAt(0), 0);
  return SERVICE_COLORS[hash % SERVICE_COLORS.length];
};

export const getEventColorCSS = (color: EventColor): string => {
  return COLOR_MAP[color];
};

export const isValidServiceColor = (
  color: string
): color is ServiceColor => {
  return SERVICE_COLORS.includes(color as ServiceColor);
};

export const getRandomServiceColor = (): ServiceColor => {
  const randomIndex = Math.floor(Math.random() * SERVICE_COLORS.length);
  return SERVICE_COLORS[randomIndex];
};

export const getServiceColorByIndex = (index: number): ServiceColor => {
  return SERVICE_COLORS[index % SERVICE_COLORS.length];
};
