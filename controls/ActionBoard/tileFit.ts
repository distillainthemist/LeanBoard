// What an action TILE shows when a column holds more than fits. A tile is
// an inert picture — it cannot scroll (card-responsiveness-review
// 2026-10-30, R0) — so a long column used to run off the bottom with no
// sign that more existed (Sue, 2026-11-17). Now each column shows the
// cards that fit and says "+N more". Pure: the editor measures.

/**
 * How many of a column's cards show. `bottoms` are the cards' bottom
 * edges top to bottom, `limit` is the lowest a card may reach, `foot`
 * the room the "+N more" line needs. Everything shows when everything
 * fits; otherwise the cards that leave room for the line — never fewer
 * than one, so a column never reads as empty.
 */
export function tileShown(bottoms: number[], limit: number, foot: number): number {
  if (bottoms.length === 0 || bottoms[bottoms.length - 1] <= limit) return bottoms.length;
  let n = 0;
  while (n < bottoms.length && bottoms[n] <= limit - foot) n++;
  return Math.max(1, n);
}
