export const CATEGORY_ICON_ZOOM = 8.5;

export function markerPresentation(zoom: number, stack: number) {
  const compact = zoom < CATEGORY_ICON_ZOOM;
  return {
    compact,
    // Zoomed-out dots stay on each salon's real coordinate.
    offset: [0, compact ? 0 : -stack * 42] as [number, number],
  };
}
