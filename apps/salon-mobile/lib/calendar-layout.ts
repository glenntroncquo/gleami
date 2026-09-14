/** Preview capacity is derived from the measured cell and scaled text metrics. */
export function calendarPreviewLayout(rowHeight: number, fontScale: number, count: number) {
  const scale = Math.max(1, fontScale);
  const headerHeight = Math.max(26, Math.ceil(18 * scale));
  const lineHeight = Math.ceil(14 * scale);
  const pillHeight = lineHeight + 4;
  const available = Math.max(0, rowHeight - 8 - headerHeight - 3);
  const slots = Math.max(0, Math.floor((available + 4) / (pillHeight + 4)));
  const visibleCount = count <= slots ? count : Math.max(0, slots - 1);
  return { headerHeight, lineHeight, pillHeight, visibleCount, hiddenCount: count - visibleCount, showMore: slots > 0 && count > visibleCount };
}
