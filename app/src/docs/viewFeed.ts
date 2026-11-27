// What a view asks of ONE library's feed — the rules the register and
// the board's doc cards must share (backlog programme tranche 6, F6,
// 2026-11-27). The cards were rebuilt onto the register's feed on
// 2026-08-08 and then fell behind it: the register learned people
// filters, "has a value", a custom Modified range, several terms on one
// column and the exact-term pass, and the cards — carrying their own
// copy of the query — learned none of them, so a card showed MORE than
// the view pasted into it. These are that copy, taken out: both callers
// build their query here. Pure.

import type { RenderQueryOpts } from "./rows";
import type { DocView } from "./views";

/** One column's term filter: the names the feed is asked by, and the
 *  term ids the exact pass keeps (`matchesTermFilters`). */
export interface TermAsk {
  cols: string[];
  labels: string[];
  ids: string[];
}

/** The Modified window: a custom range leads, else "the last N days". */
export function modifiedBounds(m: { modifiedDays: number; modifiedFrom: string; modifiedTo: string }, nowMs: number): { afterIso?: string; beforeIso?: string } {
  const afterIso =
    m.modifiedFrom !== ""
      ? new Date(`${m.modifiedFrom}T00:00:00`).toISOString()
      : m.modifiedDays > 0
        ? new Date(nowMs - m.modifiedDays * 86400000).toISOString()
        : undefined;
  const beforeIso = m.modifiedTo !== "" ? new Date(`${m.modifiedTo}T23:59:59`).toISOString() : undefined;
  return { afterIso, beforeIso };
}

/** Term filters for a library: each filter's columns cut to the ones it
 *  carries. null = this library cannot match (a filtered column it
 *  lacks — SharePoint would refuse a query naming it, and the honest
 *  answer is no rows; issue 13 of the 2026-10-18 round). */
export function termFiltersCarried(asked: { cols: string[]; labels: string[] }[], carried: ReadonlySet<string>): { cols: string[]; labels: string[] }[] | null {
  const out: { cols: string[]; labels: string[] }[] = [];
  for (const f of asked) {
    const cols = f.cols.filter((c) => carried.has(c));
    if (cols.length === 0) return null;
    out.push({ cols, labels: f.labels });
  }
  return out;
}

export interface ViewAsk {
  query: string;
  dates: DocView["dates"];
  people: DocView["people"];
  present: string[];
  modifiedDays: number;
  modifiedFrom: string;
  modifiedTo: string;
}

/** The view's part of one library's query. `terms` are the term filters
 *  in force (the view's own and, for approved-only, the status one).
 *  null = the library cannot match. Date, people and "has a value"
 *  filters on a column the library lacks are left out for it, as the
 *  register has always done. */
export function viewQueryFor(view: ViewAsk, terms: { cols: string[]; labels: string[] }[], carried: ReadonlySet<string>, nowMs: number): Pick<RenderQueryOpts, "modifiedAfterIso" | "modifiedBeforeIso" | "nameWords" | "termFilters" | "dateRanges" | "personFilters" | "presentCols"> | null {
  const termFilters = termFiltersCarried(terms, carried);
  if (termFilters === null) return null;
  const { afterIso, beforeIso } = modifiedBounds(view, nowMs);
  return {
    modifiedAfterIso: afterIso,
    modifiedBeforeIso: beforeIso,
    nameWords: view.query.trim() === "" ? undefined : view.query.trim().split(/\s+/),
    termFilters,
    dateRanges: view.dates.filter((d) => carried.has(d.col)),
    personFilters: view.people.filter((p) => carried.has(p.col)),
    presentCols: view.present.filter((c) => carried.has(c)),
  };
}

/** The columns a library must RETURN for the exact-term pass: the
 *  filtered columns it carries (a row brings its term ids only for the
 *  columns it was asked for). */
export function termFilterFields(terms: { cols: string[] }[], carried: ReadonlySet<string>): string[] {
  return [...new Set(terms.flatMap((t) => t.cols).filter((c) => carried.has(c)))];
}

/** A view's term filters gathered by column: several terms picked on one
 *  column are ONE filter (any of them), and filters on different columns
 *  all hold — the register's rule since B1. Pure. */
export function filtersByColumn<T extends { col: string }>(filters: T[]): { col: string; picks: T[] }[] {
  const out: { col: string; picks: T[] }[] = [];
  for (const f of filters) {
    const hit = out.find((x) => x.col === f.col);
    if (hit) hit.picks.push(f);
    else out.push({ col: f.col, picks: [f] });
  }
  return out;
}

/** What a board card does with each part of a view. Every key of
 *  `DocView` is listed (a test holds that), so a part the register
 *  learns next has to be decided here, not forgotten:
 *   - "applied": the card filters or draws by it;
 *   - "said": the card cannot apply it and says so on the card;
 *   - "no meaning": it shapes the register's screen, not what matches. */
export const CARD_VIEW_PARTS: Record<keyof DocView, "applied" | "said" | "no meaning"> = {
  name: "no meaning",
  listId: "applied",
  query: "applied",
  contents: "said",
  nonCurrent: "applied",
  orgTermId: "applied",
  orgPath: "no meaning",
  filters: "applied",
  columns: "applied",
  groupBy: "no meaning",
  modifiedDays: "applied",
  modifiedFrom: "applied",
  modifiedTo: "applied",
  dates: "applied",
  people: "applied",
  present: "applied",
};

/** The lines a card shows for what its view asks and it cannot do. */
export function cardViewLimits(view: Pick<DocView, "contents" | "query">): string[] {
  const out: string[] = [];
  // searching inside documents is a search-index round per repaint —
  // too heavy for a card that paints on every board open
  if (view.contents && view.query.trim() !== "") out.push("This view searches inside documents. A card matches the words in names only.");
  return out;
}

/** The view's filters in words, for the line shown while designing. */
export function viewFilterWords(view: Pick<DocView, "query" | "modifiedDays" | "modifiedFrom" | "modifiedTo" | "dates" | "people" | "present">, labelOf: (col: string) => string): string[] {
  const out: string[] = [];
  if (view.query !== "") out.push(`“${view.query}”`);
  if (view.modifiedFrom !== "" || view.modifiedTo !== "") out.push(`modified ${view.modifiedFrom !== "" ? view.modifiedFrom : "…"} to ${view.modifiedTo !== "" ? view.modifiedTo : "…"}`);
  else if (view.modifiedDays > 0) out.push(`modified ${view.modifiedDays}d`);
  for (const d of view.dates) out.push(`${labelOf(d.col)} ${d.from !== "" ? d.from : "…"} to ${d.to !== "" ? d.to : "…"}`);
  for (const p of view.people) out.push(`${labelOf(p.col)}: ${p.text}`);
  for (const c of view.present) out.push(`has ${labelOf(c).toLowerCase()}`);
  return out;
}
