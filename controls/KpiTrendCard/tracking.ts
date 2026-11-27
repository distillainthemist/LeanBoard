// A standalone KPI card's TRACKING (backlog programme tranche 7, E15,
// 2026-11-27): value against target (the default), good / bad, or a
// status picklist. A card linked to a value driver takes its tracking
// from the driver; this is for the card that stands alone. Pure, and
// free of the improvement chunk — the board path mounts the card.

export type OptionState = "green" | "amber" | "red";

export interface TrackingOptionDef {
  label: string;
  state: OptionState;
}

/** Same shape as a value driver's tracking, so the values grid takes
 *  either. */
export interface CardTracking {
  kind: "goodbad" | "picklist";
  options: TrackingOptionDef[];
}

export const GOOD_BAD: TrackingOptionDef[] = [
  { label: "Good", state: "green" },
  { label: "Bad", state: "red" },
];

/** What a new picklist starts with. */
export const DEFAULT_OPTIONS: TrackingOptionDef[] = [
  { label: "On track", state: "green" },
  { label: "At risk", state: "amber" },
  { label: "Off track", state: "red" },
];

const STATES: OptionState[] = ["green", "amber", "red"];

/** The card's own tracking from its settings; null = a number card.
 *  A picklist with no usable option falls back to the default three, and
 *  two options of one name are one. */
export function parseCardTracking(kindRaw: unknown, optionsRaw: unknown): CardTracking | null {
  if (kindRaw === "goodbad") return { kind: "goodbad", options: GOOD_BAD.map((o) => ({ ...o })) };
  if (kindRaw !== "picklist") return null;
  const seen = new Set<string>();
  const options: TrackingOptionDef[] = [];
  for (const r of Array.isArray(optionsRaw) ? optionsRaw : []) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    const label = typeof o.label === "string" ? o.label.trim() : "";
    if (label === "" || seen.has(label.toLowerCase())) continue;
    seen.add(label.toLowerCase());
    options.push({ label, state: STATES.includes(o.state as OptionState) ? (o.state as OptionState) : "green" });
  }
  return { kind: "picklist", options: options.length > 0 ? options : DEFAULT_OPTIONS.map((o) => ({ ...o })) };
}

/** Which option a stored reading is: by its label, and for good / bad
 *  also "1" and "0" (the initiative form's way). -1 = none of them — a
 *  number left from when the card took numbers, or an option since
 *  removed. */
export function optionIndexOf(t: CardTracking, raw: string): number {
  const v = raw.trim().toLowerCase();
  if (v === "") return -1;
  if (t.kind === "goodbad") {
    if (v === "1" || v === "good") return 0;
    if (v === "0" || v === "bad") return 1;
    return -1;
  }
  return t.options.findIndex((o) => o.label.toLowerCase() === v);
}

export interface StatePoint {
  id: string;
  date: string;
  /** The option's place in the list — what the state trend plots. */
  value: number;
  label: string;
}

/** The card's readings as state points, date order. A reading that is
 *  none of the options is LEFT OUT, not drawn as the first option: a
 *  card switched from numbers keeps its numbers stored and shows only
 *  its states (`hidden` counts what was left out). */
export function statePointsFromCells(cells: { key: string; date: string; value: string }[], t: CardTracking, isActual: (key: string) => boolean): { points: StatePoint[]; hidden: number } {
  const points: StatePoint[] = [];
  let hidden = 0;
  for (const c of cells) {
    if (!isActual(c.key) || c.value === "") continue;
    const idx = optionIndexOf(t, c.value);
    if (idx < 0) {
      hidden++;
      continue;
    }
    points.push({ id: c.key, date: c.date, value: idx, label: t.options[idx].label });
  }
  points.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return { points, hidden };
}

/** The write set after the CARD changed its state points: only removals.
 *  States are entered in the values grid; the card itself never writes
 *  one, and must never write a point's plotted number (an option's place
 *  in the list) over the reading's label. */
export function removedStatePoints(prev: { id: string; date: string }[], next: { id: string }[]): { key: string; date: string; shift: string; value: string }[] {
  const kept = new Set(next.map((p) => p.id));
  return prev.filter((p) => p.id !== "" && !kept.has(p.id)).map((p) => ({ key: p.id, date: p.date, shift: "-", value: "" }));
}
