// Removing a metric takes its readings with it (Ben, 2026-11-24,
// programme C8). Before then the readings stayed in the series table
// with nothing pointing at them, and a metric added again under the same
// name got the same key and found them waiting.
//
// PURE: which metrics keep readings of their own, the words of the
// question, and which ones a save has actually removed. The hosts do
// the counting and the deleting (store/series.ts).

import type { TemplateMetric } from "./templateModel";

/** Does this metric keep readings of its OWN? A metric that IS a value
 *  driver reads the driver's one series, which is never touched; an own
 *  metric, and one that only leads a driver, has its own. */
export function hasOwnReadings(m: Pick<TemplateMetric, "driverId" | "driverLink">): boolean {
  return !m.driverId || m.driverLink === "leads";
}

/** The question asked before a metric with readings is removed.
 *  `readings` below zero: they could not be counted — the question is
 *  asked all the same, never skipped (a failed read must not delete
 *  readings unasked). */
export function removeMetricWords(name: string, readings: number): { title: string; note: string } {
  const what = name.trim() !== "" ? name.trim() : "this metric";
  if (readings < 0) return { title: `Remove ${what} and its readings?`, note: "Its readings could not be counted. This cannot be undone." };
  return {
    title: `Remove ${what} and its ${readings} reading${readings === 1 ? "" : "s"}?`,
    note: "This cannot be undone.",
  };
}

/** The metrics a save removed for good: taken off the list while it was
 *  open and not on it now (one added back under the same name has the
 *  same key and keeps its readings). Each once. */
export function removedForGood<M extends Pick<TemplateMetric, "key" | "driverId" | "driverLink">>(taken: M[], now: Pick<TemplateMetric, "key">[]): M[] {
  const kept = new Set(now.map((m) => m.key));
  const seen = new Set<string>();
  return taken.filter((m) => {
    if (!hasOwnReadings(m) || kept.has(m.key) || seen.has(m.key)) return false;
    seen.add(m.key);
    return true;
  });
}
