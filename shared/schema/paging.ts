// Paging a long list for the screen (the Users register, 2026-11-01):
// pure, so the row maths is tested and shared.

export function pageCount(total: number, size: number): number {
  if (size <= 0 || total <= 0) return 0;
  return Math.ceil(total / size);
}

export function pageSlice<T>(items: T[], page: number, size: number): T[] {
  if (size <= 0) return items;
  const p = Math.max(0, Math.min(page, Math.max(0, pageCount(items.length, size) - 1)));
  return items.slice(p * size, p * size + size);
}

/** "1–50 of 312", "301–312 of 312"; "" when there is nothing. */
export function pageLabel(total: number, page: number, size: number): string {
  if (total <= 0 || size <= 0) return "";
  const pages = pageCount(total, size);
  const p = Math.max(0, Math.min(page, pages - 1));
  const from = p * size + 1;
  const to = Math.min(total, from + size - 1);
  return `${from}–${to} of ${total}`;
}
