// How far a TILE's canvas is scaled down to show the whole charter.
// Pure, so the search can be tested without a DOM: the editor supplies
// `needAt`, which lays the grid out at the width a scale implies
// (100 / k percent) and answers its height.

/** A tile's text never goes below three-quarters size: at half size a
 *  14 px charter read as 7 px (Sue, 2026-11-17). Past the floor the
 *  content clips at the tile's edge, as every other tile's does. */
export const TILE_SCALE_FLOOR = 0.75;

/**
 * The LARGEST scale at which the grid fits `avail`. Scaling by k widens
 * the grid to 100/k percent, the text unwraps and the grid gets shorter,
 * so the scale that fits is larger than `avail / needAt(1)` — the one
 * measurement the first version took, which over-shrank and left a band
 * of empty tile under the charter. `needAt` must not grow as k falls.
 */
export function fitScale(avail: number, needAt: (k: number) => number, floor = TILE_SCALE_FLOOR, steps = 5): number {
  if (avail <= 0) return 1;
  const need = needAt(1);
  if (need <= avail) return 1;
  const fits = (k: number) => needAt(k) * k <= avail;
  // the single measurement's answer always fits (the wider grid is no
  // taller), unless the floor is above it
  const single = avail / need;
  if (single < floor) return fits(floor) ? climb(floor, 1, fits, steps) : floor;
  return climb(single, 1, fits, steps);
}

/** Bisect between a scale that fits and one that does not. */
function climb(fitsAt: number, tooBig: number, fits: (k: number) => boolean, steps: number): number {
  let lo = fitsAt;
  let hi = tooBig;
  for (let i = 0; i < steps && hi - lo > 0.01; i++) {
    const mid = (lo + hi) / 2;
    if (fits(mid)) lo = mid;
    else hi = mid;
  }
  return Math.floor(lo * 1000) / 1000;
}
