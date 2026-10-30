// The size SIGNAL a card host gives its card (card-responsiveness-review-
// 2026-10-30, R0 step 2). A card cannot read its own rendered size inside
// a transform-scaled tile (layout boxes ignore transforms), and
// `container-type` is not an option — layout containment would trap the
// cards' position: fixed dialogs inside their root. So the HOST (the
// BoardGrid stage, the focused card host, the list slot) stamps the
// width it lays the card out at: `data-ltk-tier` for CSS and
// `--ltk-host-w` for anything that wants the number. One rule, pure.

export type HostTier = "phone" | "compact" | "regular" | "wide";

/** Tier bounds in CSS px of the host's layout width. */
export const TIER_COMPACT_MIN = 480;
export const TIER_REGULAR_MIN = 900;
export const TIER_WIDE_MIN = 1400;

export function tierFor(width: number): HostTier {
  if (!Number.isFinite(width) || width < TIER_COMPACT_MIN) return "phone";
  if (width < TIER_REGULAR_MIN) return "compact";
  if (width < TIER_WIDE_MIN) return "regular";
  return "wide";
}

/** Stamp the tier and width on a host; returns the tier. */
export function applyHostTier(host: HTMLElement, width: number): HostTier {
  const tier = tierFor(width);
  if (host.dataset.ltkTier !== tier) host.dataset.ltkTier = tier;
  host.style.setProperty("--ltk-host-w", `${Math.round(width)}px`);
  return tier;
}

/** Watch a host's own width and keep its tier current; returns the
 *  disconnect. The host must not be transform-scaled (its clientWidth
 *  must be the width the card lays out at). */
export function observeHostTier(host: HTMLElement): () => void {
  const read = () => applyHostTier(host, host.clientWidth);
  read();
  if (typeof ResizeObserver === "undefined") return () => undefined;
  const ro = new ResizeObserver(read);
  ro.observe(host);
  return () => ro.disconnect();
}
