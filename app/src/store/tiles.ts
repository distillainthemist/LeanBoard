// The tilesJSON join, as pure logic (docs/board-app-build.md §4 in TS):
// manifest slots ⋈ this instance's Card Data rows, with the svg fallback
// chain per policy — instance row → (shared) live row → catalog default →
// BoardGrid's own typed placeholder (empty string here).

import type { BoardTile } from "../../../controls/BoardGrid/types";
import { titleStripColor } from "../../../shared/palette";
import { ManifestSlot, slotPolicy } from "./mappers";

export interface CardRowLite {
  cardId: string;
  /** "" = the live (instance-less) row of a shared card. */
  instanceId: string;
  tileSvg: string;
}

export function joinTiles(
  slots: ManifestSlot[],
  instanceId: string,
  cardRows: CardRowLite[],
  catalogSvgByType: Record<string, string>,
  /** Title-strip palette (key → colour) — bar colours resolve through it. */
  titlePalette: Record<string, string> = {}
): BoardTile[] {
  const instanceRow = (cardId: string) =>
    cardRows.find((r) => r.cardId === cardId && r.instanceId === instanceId);
  const liveRow = (cardId: string) =>
    cardRows.find((r) => r.cardId === cardId && r.instanceId === "");

  return slots.map((slot) => {
    const own = instanceRow(slot.cardId)?.tileSvg ?? "";
    const live =
      slotPolicy(slot) === "shared" ? (liveRow(slot.cardId)?.tileSvg ?? "") : "";
    const fallback = catalogSvgByType[slot.cardType] ?? "";
    // neither this meeting's row nor a shared card's live row held a tile,
    // so nothing was ever saved here and the fallback art is generic
    // action / metrics / gantt cards keep their data in other tables — the
    // document says nothing about them (2026-09-23)
    const dataElsewhere = ["ActionBoard", "MetricsCard", "GanttCard", "EscalationViewer", "PrioritiesCard"].includes(slot.cardType);
    const noData = !dataElsewhere && own === "" && live === "";
    return {
      pos: slot.pos,
      w: slot.w,
      h: slot.h,
      nav: slot.nav,
      noData,
      cardId: slot.cardId,
      cardType: slot.cardType,
      title: slot.title,
      barColor: titleStripColor(slot.settings, titlePalette),
      svg: own !== "" ? own : live !== "" ? live : fallback,
    };
  });
}

/** The switch a board's Live button reads. An initiative board has no
 *  stored snapshots of its living state — only its gates are stamped — so
 *  the per-browser switch never applies there: off, every tile drew its
 *  card type name and the button offered no way back (issue 2,
 *  2026-11-16). Its gate snapshots are closed instances and still render
 *  stored, by `liveTilesEnabled` below. */
export function liveWanted(isInitiativeBoard: boolean, storedFlag: string | null): boolean {
  return isInitiativeBoard || storedFlag !== "0";
}

/** The header targets a canvas card's fields are bound to
 *  (`settings.config.canvasJSON` → fields[].bound), "" entries dropped. */
export function boundTargets(settings: Record<string, unknown>): string[] {
  const cfg = (settings.config ?? {}) as Record<string, unknown>;
  let raw: unknown = cfg.canvasJSON;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  const fields = raw && typeof raw === "object" ? (raw as { fields?: unknown }).fields : undefined;
  if (!Array.isArray(fields)) return [];
  return fields
    .map((f) => (f && typeof f === "object" ? (f as { bound?: unknown }).bound : ""))
    .filter((b): b is string => typeof b === "string" && b !== "");
}

/** Does a bound card SHOW something? "Nothing recorded yet" was decided
 *  by whether the card had ever saved a tile of its own, so a charter
 *  filled entirely from the initiative's header wore the line over its
 *  content (issue 3, 2026-11-16). Any bound field with a value is
 *  content. */
export function boundContent(settings: Record<string, unknown>, get: (bound: string) => string): boolean {
  return boundTargets(settings).some((b) => {
    try {
      return get(b).trim() !== "";
    } catch {
      return false;
    }
  });
}

/**
 * Whether a board should render LIVE tiles rather than its stored snapshots.
 *
 * Live rendering shows the data as it is NOW. That is right for the meeting
 * in progress and wrong for one that has finished: closeInstance() stamps
 * each card's snapshot onto the instance row precisely so that reopening a
 * past meeting shows what it showed at the time. Rendering a closed meeting
 * live would silently replace that record with today's numbers — and worse,
 * a future styling change would retroactively alter what past meetings
 * appear to have said.
 *
 * So: open meeting → live (subject to the flag); closed → the archive.
 * A board with no instance selected has nothing to render live either.
 */
export function liveTilesEnabled(
  flagOn: boolean,
  instanceStatus: "open" | "closed" | undefined
): boolean {
  return flagOn && instanceStatus === "open";
}

/**
 * Whether an embed card should load with the board rather than waiting to be
 * opened. Preloading is the default — it is the point of live tiles — but a
 * wall of sign-in-protected Power BI reports all loading at once is worse
 * than one loading on demand, so a card can opt out (`deferLoad`).
 */
export function embedPreloadEnabled(settings: Record<string, unknown>): boolean {
  const config = settings.config;
  if (!config || typeof config !== "object") return true;
  return (config as Record<string, unknown>).deferLoad !== true;
}
