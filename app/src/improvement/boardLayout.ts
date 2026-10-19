// An initiative board's layout from its template (pure — vitest covers it).
// THE TEMPLATE'S LAYOUT IS KEPT (Ben, 2026-09-17): cards stay in their own
// cells with their own walk order; blanks stay blank.

import type { BoardManifest } from "../store/mappers";

/** The initiative's Metrics card slot (1×1). */
export function metricsCardSlot(): { pos: number; w: number; h: number; nav: number; cardId: string; cardType: string; title: string; settingsJSON: Record<string, unknown> } {
  const rand = Math.random().toString(36).slice(2, 6);
  return {
    pos: 2,
    w: 1,
    h: 1,
    nav: 2,
    cardId: `metrics-${rand}`,
    cardType: "MetricsCard",
    title: "Metrics",
    settingsJSON: { template: { stage: "", mandatory: true }, config: {} },
  };
}

/** The board slots an initiative starts from (also the reset target, Ben
 *  2026-09-14): EVERY card on the template board (issue 29, Ben
 *  2026-10-19 — "mandatory" means the card cannot be removed, not that
 *  it is the only one copied; a template author who placed a card meant
 *  it to be there), keeping the template's card ids (so a reset keeps
 *  the data of cards that survive), the action plan on kanban with
 *  Verify + reschedule reasons, and ONE Metrics card (`metricsCardId`
 *  keeps an existing one's id, so its sub-location data survives a
 *  reset). The composer's archived cards do not come. */
export function slotsFromTemplate(
  manifest: BoardManifest,
  metricsCardId = ""
): { pos: number; w: number; h: number; nav: number; cardId: string; cardType: string; title: string; settingsJSON: Record<string, unknown> }[] {
  // every card the author placed (issue 29); a second Metrics card never
  // comes — the initiative has exactly one
  let seenMetrics = false;
  const keep = manifest.slots.filter((s) => {
    if (s.cardType !== "MetricsCard") return true;
    if (seenMetrics) return false;
    seenMetrics = true;
    return true;
  });
  // THE TEMPLATE'S LAYOUT IS KEPT (Ben, 2026-09-17): every card stays in
  // its own cell with its own walk order — blank cells stay blank, nothing
  // is renumbered or pulled back to fill
  const slots = keep.map((s) => ({
    pos: s.pos,
    w: s.w,
    h: s.h,
    nav: s.nav,
    cardId: s.cardId,
    cardType: s.cardType,
    title: s.title,
    // the initiative's action plan gets the Verify column + reschedule
    // reasons (design 2.4) whatever the template author set
    settingsJSON:
      s.cardType === "ActionBoard"
        ? {
            ...s.settings,
            config: { ...((s.settings.config ?? {}) as Record<string, unknown>), view: "kanban", verifyColumn: true, rescheduleReasons: true },
          }
        : s.settings,
  }));
  // ONE Metrics card for the initiative (2026-09-08): where the template
  // author placed one, else in the FIRST FREE CELL — never displacing a card
  const authored = slots.find((s) => s.cardType === "MetricsCard");
  if (authored) {
    if (metricsCardId !== "") authored.cardId = metricsCardId;
  } else {
    const mc = metricsCardSlot();
    if (metricsCardId !== "") mc.cardId = metricsCardId;
    mc.pos = firstFreePos(slots, Number(manifest.grid) || 2);
    mc.nav = Math.max(0, ...slots.map((s) => s.nav || 0)) + 1;
    slots.push(mc);
  }
  return slots;
}

/** The lowest 1-based row-major cell not covered by any slot (spans
 *  included) on a `cols`-wide grid. */
export function firstFreePos(slots: { pos: number; w: number; h: number }[], cols: number): number {
  const c = Math.max(1, Math.round(cols));
  const taken = new Set<number>();
  for (const s of slots) {
    if (!(s.pos >= 1)) continue;
    const col = (s.pos - 1) % c;
    const row = Math.floor((s.pos - 1) / c);
    for (let r = row; r < row + Math.max(1, s.h); r++) for (let k = col; k < Math.min(c, col + Math.max(1, s.w)); k++) taken.add(r * c + k + 1);
  }
  let p = 1;
  while (taken.has(p)) p++;
  return p;
}
