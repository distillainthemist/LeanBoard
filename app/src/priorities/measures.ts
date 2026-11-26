// One list of measures on a priority (2026-11-27, R5 of the 2026-11-25
// round, report 20). Three sources used to decide a priority's metrics
// by a rule its own tab needed a paragraph to explain — its own metrics;
// a starred primary initiative's starred metrics, which took over; the
// metrics ticked from its initiatives when it had no primary. Ben asked
// for a redesign: ONE list, in one order, of the priority's own metrics
// and REFERENCES to its initiatives' metrics (never copies: one set of
// readings, entered in one place). Pure — the tab is measuresTab.ts.
//
// The limits are Ben's own, from the walk: a priority holds at most
// four measures; an initiative at most eight metrics.

import { MEASURE_CAP, Measure, Priority, PriorityObjective, isOwnMeasure } from "./model";

/** An initiative holds at most eight metrics (Ben, 2026-11-27). One
 *  that already has more keeps them and cannot be added to. */
export const INITIATIVE_METRIC_CAP = 8;

const sameRef = (a: PriorityObjective, b: PriorityObjective): boolean => a.initiativeId === b.initiativeId && a.metricKey === b.metricKey;
export function hasMeasure(list: Measure[], m: Measure): boolean {
  return list.some((x) => (isOwnMeasure(x) && isOwnMeasure(m) ? x.own === m.own : !isOwnMeasure(x) && !isOwnMeasure(m) ? sameRef(x, m) : false));
}

/** Put a list on the priority: `objectives` mirrors its references, so
 *  everything that reads the picks keeps working. */
export function setMeasures(p: Pick<Priority, "measures" | "objectives">, list: Measure[]): void {
  p.measures = list;
  p.objectives = list.filter((m): m is PriorityObjective => !isOwnMeasure(m));
}

/** An initiative's ★ starred metrics — or its first, when none is
 *  starred (the rule its values are read by, metricValues.ts). */
export function starredKeys(metrics: { key: string; primary?: boolean }[]): string[] {
  const starred = metrics.filter((m) => m.primary === true).map((m) => m.key);
  return starred.length > 0 ? starred : metrics.slice(0, 1).map((m) => m.key);
}

/** A priority's list AS IT STANDS under the old rule ("carried in as
 *  they stand on the day"): its own metrics first; then, with a live
 *  primary, that initiative's starred metrics as references; with none,
 *  the picks whose initiative is still under it. Nothing is dropped for
 *  being over the limit. */
export function convertMeasures(
  p: Pick<Priority, "objectives" | "ownMetrics">,
  livePrimary: string,
  primaryStarred: string[],
  linked: (initiativeId: string) => boolean
): Measure[] {
  const out: Measure[] = (p.ownMetrics ?? []).map((m) => ({ own: m.key }));
  const refs: PriorityObjective[] = livePrimary !== "" ? primaryStarred.map((metricKey) => ({ initiativeId: livePrimary, metricKey })) : p.objectives.filter((o) => linked(o.initiativeId));
  for (const r of refs) if (!hasMeasure(out, r)) out.push(r);
  return out;
}

/** After the own-metric editor changed the definitions: an own entry
 *  whose definition has gone leaves the list, and a new definition
 *  joins its end. */
export function syncOwn(list: Measure[], ownKeys: string[]): Measure[] {
  const kept = list.filter((m) => !isOwnMeasure(m) || ownKeys.includes(m.own));
  for (const key of ownKeys) if (!hasMeasure(kept, { own: key })) kept.push({ own: key });
  return kept;
}

/** How many more measures the list takes (0 at or over the limit). */
export function roomFor(list: Measure[]): number {
  return Math.max(0, MEASURE_CAP - list.length);
}

/** Move the entry at `index` one place up (-1) or down (+1). */
export function moveMeasure(list: Measure[], index: number, delta: -1 | 1): Measure[] {
  const to = index + delta;
  if (index < 0 || index >= list.length || to < 0 || to >= list.length) return list;
  const out = [...list];
  [out[index], out[to]] = [out[to], out[index]];
  return out;
}

export interface MeasureRow {
  measure: Measure;
  kind: "own" | "ref";
  /** ok · gone (its initiative deleted the metric) · unlinked (its
   *  initiative is no longer under the priority). */
  state: "ok" | "gone" | "unlinked";
  name: string;
  /** "This priority", or the initiative's title. */
  source: string;
}

export const GONE_WORDS: Record<"gone" | "unlinked", string> = {
  gone: "No longer on its initiative",
  unlinked: "Its initiative is no longer under this priority",
};

/** The list as the tab shows it: every entry, with what it is and
 *  whether what it points at is still there. */
export function measureRows(
  list: Measure[],
  ownName: (key: string) => string | null,
  initiative: (id: string) => { title: string; linked: boolean; metricName: (key: string) => string | null } | null
): MeasureRow[] {
  return list.map((m): MeasureRow => {
    if (isOwnMeasure(m)) return { measure: m, kind: "own", state: "ok", name: ownName(m.own) ?? m.own, source: "This priority" };
    const i = initiative(m.initiativeId);
    if (i === null || !i.linked) return { measure: m, kind: "ref", state: "unlinked", name: i?.metricName(m.metricKey) ?? "A metric", source: i?.title ?? "an initiative" };
    const name = i.metricName(m.metricKey);
    return { measure: m, kind: "ref", state: name === null ? "gone" : "ok", name: name ?? "A metric", source: i.title };
  });
}

const words = (s: string): string[] =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9% ]+/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !["the", "and", "for", "per", "rate", "number", "total"].includes(w));

/** The metrics of the priority's initiatives whose name is LIKE the one
 *  being typed — offered before a new one is created, so a duplicate is
 *  a choice and not an accident. Like = one name contains the other, or
 *  they share a significant word. */
export function similarMetrics<T extends { name: string }>(typed: string, choices: T[]): T[] {
  const t = typed.trim().toLowerCase();
  if (t.length < 3) return [];
  const tw = words(t);
  return choices.filter((c) => {
    const n = c.name.trim().toLowerCase();
    if (n === "") return false;
    if (n.includes(t) || t.includes(n)) return true;
    const cw = words(n);
    return tw.some((w) => cw.includes(w));
  });
}

/** What "Convert measures" says when it has run. */
export function convertWords(converted: number, already: number, over: number): string {
  if (converted === 0) return already > 0 ? `Every priority already has its list of measures (${already}). Nothing was changed.` : "There are no priorities to convert.";
  const head = `${converted} priorit${converted === 1 ? "y" : "ies"} converted: each keeps the measures it showed today, as one list.`;
  const tail = over > 0 ? ` ${over} ${over === 1 ? "has" : "have"} more than ${MEASURE_CAP}: ${over === 1 ? "it shows" : "they show"} the first ${MEASURE_CAP} and cannot be added to until trimmed.` : "";
  return `${head}${tail}`;
}
