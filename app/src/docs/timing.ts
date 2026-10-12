// Documents — the register's per-load timing readout (Ben, 2026-10-12:
// "the document tab has become slower at loading a list"). Every
// SharePoint round trip marks itself here with what it was for; the
// register reads the marks made during one load and says, on its status
// line, where the time went: the feed (RenderListDataAsStream), the
// counts, the search index, or a term-store walk. SDK-free on purpose so
// the summary is testable.

export type TimingKind = "feed" | "search" | "count" | "app" | "term" | "term walk" | "other";

export interface TimingMark {
  kind: TimingKind;
  /** Wall time of the call in milliseconds. */
  ms: number;
  /** What it was (a list id, a term set, a request count). */
  note: string;
  /** The call refused (a throttle, a 4xx) — named on the readout. */
  failed: boolean;
  /** performance.now() when the call STARTED — a load reads the marks
   *  started after its own start. */
  at: number;
}

const marks: TimingMark[] = [];
const KEEP = 200;

export const now = (): number =>
  typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();

export function markTiming(kind: TimingKind, at: number, note = "", failed = false): void {
  marks.push({ kind, ms: Math.max(0, now() - at), note, failed, at });
  if (marks.length > KEEP) marks.splice(0, marks.length - KEEP);
}

/** The marks whose call started at or after `since` (a load's own). */
export function timingsSince(since: number): TimingMark[] {
  return marks.filter((m) => m.at >= since);
}

/** What a SharePoint request was for, from its uri. */
export function kindOfUri(uri: string): TimingKind {
  const u = uri.toLowerCase();
  if (u.includes("renderlistdataasstream")) return "feed";
  if (u.includes("/search/")) return "search";
  if (u.includes("$select=itemcount")) return "count";
  if (u.includes("termstore") || u.includes("/terms")) return "term";
  return "other";
}

const secs = (ms: number): string => (ms < 950 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`);

export interface TimingSummary {
  /** The short line for the status row, "" when nothing was timed. */
  line: string;
  /** One call per line for the tooltip. */
  detail: string;
  /** The load's wall time, formatted ("3.4 s"). */
  total: string;
}

/** The readout for one load: the whole load's wall time, then each kind
 *  of call with how many there were and how long they took in total —
 *  parallel calls overlap, so the kinds can add up to more than the
 *  load. A refused call is named so a throttle shows as a throttle. */
export function summarizeTimings(
  loaded: TimingMark[],
  totalMs: number,
  opts: { paintedFromCache?: boolean; termsFromCache?: boolean; sinceOpen?: boolean } = {}
): TimingSummary {
  const order: TimingKind[] = ["feed", "search", "count", "app", "term walk", "term", "other"];
  const label: Record<TimingKind, string> = {
    feed: "feed",
    search: "search",
    count: "count",
    app: "app data",
    "term walk": "term walk",
    term: "term store",
    other: "other",
  };
  // the FIRST load of a visit clocks from the tab opening, so the
  // config read, task sweep and filter-pane walks that run before the
  // list query show up — the register felt slow before the feed began
  const parts: string[] = [
    opts.sinceOpen === true ? `${secs(totalMs)} after opening` : `loaded in ${secs(totalMs)}`,
  ];
  // the term store's own calls ride inside a walk — count the walk once
  const walked = loaded.some((m) => m.kind === "term walk");
  for (const kind of order) {
    if (kind === "term" && walked) continue;
    const of = loaded.filter((m) => m.kind === kind);
    if (of.length === 0) continue;
    const sum = of.reduce((a, m) => a + m.ms, 0);
    const failed = of.filter((m) => m.failed).length;
    parts.push(
      `${label[kind]} ${secs(sum)}${of.length > 1 ? ` ×${of.length}` : ""}${failed > 0 ? ` (${failed} refused)` : ""}`
    );
  }
  if (opts.termsFromCache === true && !walked) parts.push("terms cached");
  if (opts.paintedFromCache === true) parts.push("first paint from cache");
  const detail = loaded
    .map((m) => `${label[m.kind]}${m.note !== "" ? ` ${m.note}` : ""}: ${secs(m.ms)}${m.failed ? " (refused)" : ""}`)
    .join("\n");
  return { line: parts.join(" · "), detail, total: secs(totalMs) };
}
