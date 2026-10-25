export const CATEGORY_ICON_ZOOM = 12;

export function markerPresentation(zoom: number, stack: number) {
  const compact = zoom < CATEGORY_ICON_ZOOM;
  return {
    compact,
    // At city/country scale every dot sits on its real coordinate.
    offset: [0, compact ? 0 : -stack * 42] as [number, number],
  };
}
