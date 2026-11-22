// Improvement — reading metric values off the initiative boards' KPI
// cards (P6c). The seeded KPI slots carry `settings.metric.key`; the live
// row's KpiTrend doc holds the charted points + target/limits. One boards
// read + one rows read cover every initiative; the result is a map the
// RAG rollups and the tab's metric column both use.

import { directionOf } from "./templateModel";
import type { TemplateMetric } from "./templateModel";
import { OWN_SERIES_BOARD, ownSeriesCard } from "../priorities/model";
import { parseKpiTrend } from "../../../controls/KpiTrendCard/types";
import { parseManifest } from "../store/mappers";
import type { BoardSummary } from "../store/mappers";
import type { CardRow } from "../store/cards";
import { Initiative, MetricReading, metricRag, worstMetricRag } from "./initiativeModel";
import { EMPTY_SPEC_SERIES, SPEC_SERIES_PREFIX, specFor, SpecSeries, specSeriesFromCells } from "../../../shared/schema/specSeries";
import { todayIso } from "../../../shared/schema/id";
import { READ_FROM_START, readFrom } from "./readWindow";
import { metricLocation, trackingDisplay } from "./metricLocation";
import type { MetricLocation } from "./metricLocation";
import type { DriverNode } from "./vdt/model";

/** A metric's last reading + its spec history (grid entry: per-period
 *  targets carry forward, so the RAG reads the spec in force on the
 *  reading's date). Keyed by `<initiativeId>|<metricKey>` (and, for
 *  driver-linked metrics, by the driver id as well). */
export interface DriverLast {
  last: number | null;
  /** The raw stored value (good/bad and picklist metrics). */
  raw: string;
  date: string;
  spec: SpecSeries;
  /** A good / bad or picklist DRIVER's reading as label + state. */
  display?: { label: string; rag: "green" | "amber" | "red" | null };
  /** The last few numeric readings, oldest first — the sparkline
   *  (2026-11-17). The read already carried every point. */
  tail?: number[];
}

/** How many readings a sparkline shows. */
export const SPARK_POINTS = 12;

export interface MetricValue {
  key: string;
  name: string;
  unit: string;
  last: number | null;
  /** What to show for the last reading (good/bad and picklist metrics
   *  have a label, not a number); "" = nothing recorded. */
  display: string;
  target: number | null;
  rag: "green" | "amber" | "red" | null;
  /** ★ starred (several may be) + the metric's objective sentence. */
  starred: boolean;
  objective: string;
  /** The sparkline's inputs (2026-11-17): the last readings, oldest
   *  first, and the spec in force. Empty tail = nothing to draw (a
   *  good / bad or picklist metric, or no reading yet). */
  tail: number[];
  usl: number | null;
  lsl: number | null;
  direction: "up" | "down" | "range";
}

/** An initiative's metrics as the status rule reads them — EVERY metric,
 *  by name and state (a metric with no reading carries null). */
export function statusMetricsOf(state: InitiativeMetricState | undefined): { name: string; rag: "green" | "amber" | "red" | null }[] {
  return (state?.values ?? []).map((v) => ({ name: v.name, rag: v.rag }));
}

export interface InitiativeMetricState {
  values: MetricValue[];
  rag: "green" | "amber" | "red" | null;
}

/** One metric as a value: its last reading against the spec in force.
 *  `ml`: where its readings live (the driver's series or its own
 *  location); `doc`: the seeded single KPI card's in-card document, on
 *  the older boards that have one. Shared by an initiative's metrics and
 *  a priority's own. */
export function metricValueOf(
  def: TemplateMetric,
  ml: DriverLast | null,
  doc: { points: { value: number }[]; target?: number | null; usl?: number | null; lsl?: number | null; unit?: string } | null = null
): MetricValue {
  const key = def.key;
  if (ml?.display) {
    return { key, name: def.name, unit: "", last: null, display: ml.display.label, target: null, rag: ml.display.rag, starred: def.primary === true, objective: def.objective ?? "", tail: [], usl: null, lsl: null, direction: directionOf(def) };
  }
  if (def.tracking !== "value") {
    const disp = trackingDisplay(def, ml?.raw ?? "");
    return { key, name: def.name, unit: "", last: null, display: disp.label, target: null, rag: disp.rag, starred: def.primary === true, objective: def.objective ?? "", tail: [], usl: null, lsl: null, direction: directionOf(def) };
  }
  const points = doc?.points ?? [];
  const last = ml ? ml.last : points.length > 0 ? points[points.length - 1].value : null;
  // the in-card target wins (owners tune it there); the definition's
  // target is the fallback — and a per-period spec point in force on
  // the reading's date beats both
  const level = {
    target: doc?.target ?? def.target ?? null,
    usl: doc?.usl ?? def.usl ?? null,
    lsl: doc?.lsl ?? def.lsl ?? null,
  };
  const spec = ml && ml.date !== "" ? specFor(ml.spec, ml.date, level) : specFor(EMPTY_SPEC_SERIES, "", level);
  const reading: MetricReading = {
    last,
    ...spec,
    goodDirection: directionOf(def),
  };
  return {
    key,
    name: def.name,
    unit: def.unit ?? doc?.unit ?? "",
    last,
    display: last === null ? "" : `${last}${def.unit}`,
    target: reading.target,
    rag: metricRag(reading),
    starred: def.primary === true,
    objective: def.objective ?? "",
    tail: ml ? (ml.tail ?? []) : points.slice(-SPARK_POINTS).map((pt) => pt.value),
    usl: reading.usl,
    lsl: reading.lsl,
    direction: reading.goodDirection,
  };
}

export function buildMetricState(
  initiatives: Initiative[],
  boards: Pick<BoardSummary, "boardId" | "manifestRaw">[],
  rows: (CardRow & { boardId: string })[],
  /** Last recorded value per DRIVER — a driver-linked metric's points live
   *  on the driver's series, not the card's doc (metric rework). */
  driverLast: Map<string, DriverLast> = new Map()
): Map<string, InitiativeMetricState> {
  const byBoard = new Map(boards.map((b) => [b.boardId, b]));
  const rowByCard = new Map(rows.map((r) => [`${r.boardId}|${r.cardId}`, r]));
  const out = new Map<string, InitiativeMetricState>();
  for (const i of initiatives) {
    if (i.boardId === "") continue;
    const board = byBoard.get(i.boardId);
    if (!board) continue;
    const values: MetricValue[] = [];
    const slots = parseManifest(board.manifestRaw).slots;
    for (const def of i.metrics) {
      const key = def.key;
      // the seeded single card (older boards) still carries the in-card doc
      const slot = slots.find((sl) => sl.cardType === "KpiTrendCard" && String(((sl.settings.metric ?? {}) as Record<string, unknown>).key ?? "") === key) ?? null;
      const row = slot ? rowByCard.get(`${i.boardId}|${slot.cardId}`) : undefined;
      const doc = row ? parseKpiTrend(row.outputJson).envelope.data : null;
      const ml = driverLast.get(`${i.id}|${key}`) ?? (def.driverId && def.driverLink !== "leads" ? driverLast.get(def.driverId) : undefined) ?? null;
      values.push(metricValueOf(def, ml, doc));
    }
    // ★ starred first (definition order within) — the register, tiles and
    // roll-up read values[0]; the Objectives row reads every starred one
    if (!values.some((v) => v.starred) && values.length > 0) values[0].starred = true;
    values.sort((a, b) => (a.starred === b.starred ? 0 : a.starred ? -1 : 1));
    out.set(i.id, { values, rag: worstMetricRag(values.map((v) => v.rag)) });
  }
  return out;
}

/** One metric's last reading and spec history, from its location: a
 *  good / bad or picklist driver's latest label, a driver's series, or
 *  the metric's own cells. */
/** A metric's last reading and sparkline tail from its own cells (a
 *  typed metric: every non-spec key is a reading). Pure. */
export function lastFromCells(cells: { key: string; date: string; shift: string; value: string }[], isActual: (key: string) => boolean, spec: SpecSeries): DriverLast {
  const pts = cells.filter((c) => isActual(c.key) && c.value !== "").sort((a, b) => (a.date + a.shift < b.date + b.shift ? -1 : 1));
  const lastPt = pts.length > 0 ? pts[pts.length - 1] : null;
  const n = lastPt ? Number(lastPt.value) : NaN;
  const tail = pts.slice(-SPARK_POINTS).map((c) => Number(c.value)).filter((x) => Number.isFinite(x));
  return { last: Number.isFinite(n) ? n : null, raw: lastPt ? lastPt.value : "", date: lastPt ? lastPt.date : "", spec, tail };
}

const FAR = "2999-12-31";

/** One metric's last reading and spec history, from its location: a
 *  good / bad or picklist driver's latest label, a driver's series, or
 *  the metric's own cells. Readings are read in a WINDOW by cadence
 *  (readWindow.ts, 2026-11-22); a metric with nothing inside it is
 *  asked for its one latest reading, so it never reads as "no data". */
async function readLast(loc: MetricLocation, d: DriverNode | null): Promise<DriverLast> {
  const { listDriverPoints, listDriverRaw, listSpecSeries } = await import("../store/driverSeries");
  const { listSeries, latestSeriesCell } = await import("../store/series");
  const from = readFrom(todayIso(), loc.cadence);
  const bounded = from !== READ_FROM_START;
  if (loc.driverId !== "" && d && d.tracking.kind !== "value") {
    // a good / bad or picklist driver: the latest label + its state
    const { stateOf } = await import("./vdt/model");
    const raw = await listDriverRaw(loc.driverId, from, FAR);
    let lastPt: { date: string; shift: string; value: string } | null = [...raw].sort((a, b) => (a.date + a.shift < b.date + b.shift ? -1 : 1)).pop() ?? null;
    if (lastPt === null && bounded) lastPt = await latestSeriesCell("vdt", loc.driverId, "actual").catch(() => null);
    const st = stateOf(d.tracking, lastPt ? lastPt.value : "");
    return { last: null, raw: lastPt ? lastPt.value : "", date: lastPt ? lastPt.date.slice(0, 10) : "", spec: EMPTY_SPEC_SERIES, display: st };
  }
  if (loc.driverId !== "") {
    const [inWindow, spec] = await Promise.all([listDriverPoints(loc.driverId, from, FAR), listSpecSeries("vdt", loc.driverId, FAR).catch(() => EMPTY_SPEC_SERIES)]);
    let pts = inWindow;
    if (pts.length === 0 && bounded) {
      const old = await latestSeriesCell("vdt", loc.driverId, "actual").catch(() => null);
      const n = old ? Number(old.value) : NaN;
      if (old && Number.isFinite(n)) pts = [{ date: old.date, shift: old.shift || "-", value: n }];
    }
    const lastPt = pts.length > 0 ? pts[pts.length - 1] : null;
    return { last: lastPt ? lastPt.value : null, raw: lastPt ? String(lastPt.value) : "", date: lastPt ? lastPt.date : "", spec, tail: pts.slice(-SPARK_POINTS).map((pt) => pt.value) };
  }
  const [cells, spec] = await Promise.all([listSeries(loc.boardId, loc.cardId, from, FAR), listSpecSeries(loc.boardId, loc.cardId, FAR).catch(() => EMPTY_SPEC_SERIES)]);
  let mine = cells;
  if (bounded && !mine.some((c) => loc.isActual(c.key) && c.value !== "")) {
    const old = await latestSeriesCell(loc.boardId, loc.cardId).catch(() => null);
    if (old) mine = [old];
  }
  return lastFromCells(mine, loc.isActual, spec);
}

/** Where a priority's own metric keeps its readings: the driver's series
 *  when it is one from the tree, else the series table at the priority's
 *  own location. */
export function ownMetricLocation(priorityId: string, m: TemplateMetric, driver: DriverNode | null): MetricLocation {
  const loc = metricLocation(m, OWN_SERIES_BOARD, priorityId, [], driver);
  return loc.driverId !== "" ? loc : { ...loc, cardId: ownSeriesCard(priorityId, m.key) };
}

/** The last reading of every metric defined ON these priorities, keyed
 *  `<priorityId>|<metricKey>`. `site`: whose value driver tree a linked
 *  metric reads ("" = none: a company-level priority's are typed). */
export async function loadOwnMetricLasts(items: { id: string; site: string; metrics: TemplateMetric[] }[]): Promise<Map<string, DriverLast>> {
  const out = new Map<string, DriverLast>();
  const withMetrics = items.filter((x) => x.metrics.length > 0);
  if (withMetrics.length === 0) return out;
  const { listDrivers } = await import("../store/valueDrivers");
  const driverCache = new Map<string, Promise<DriverNode[]>>();
  const driversFor = (site: string) => {
    if (!driverCache.has(site)) driverCache.set(site, listDrivers(site).catch(() => []));
    return driverCache.get(site)!;
  };
  // which metrics are TYPED (their readings sit at the priority's own
  // location) and which read a value driver's series
  const typed: { id: string; m: TemplateMetric; loc: MetricLocation }[] = [];
  const linked: { id: string; m: TemplateMetric; loc: MetricLocation; d: DriverNode | null }[] = [];
  await Promise.all(
    withMetrics.map(async (p) => {
      const drivers = p.site !== "" && p.metrics.some((m) => m.driverId) ? await driversFor(p.site) : [];
      for (const m of p.metrics) {
        const d = m.driverId ? (drivers.find((x) => x.id === m.driverId) ?? null) : null;
        const loc = ownMetricLocation(p.id, m, d);
        if (loc.driverId !== "") linked.push({ id: p.id, m, loc, d });
        else typed.push({ id: p.id, m, loc });
      }
    })
  );
  const jobs: Promise<void>[] = linked.map(async (x) => {
    const v = await readLast(x.loc, x.d).catch(() => null);
    if (v !== null) out.set(`${x.id}|${x.m.key}`, v);
  });
  if (typed.length > 0) {
    // ONE read for every typed metric's readings and one for their plan
    // history (2026-11-22: it was two reads a metric), sorted out here
    jobs.push(
      (async () => {
        const { listBoardSeries, listBoardSpec, latestSeriesCell } = await import("../store/series");
        const today = todayIso();
        const froms = typed.map((x) => readFrom(today, x.loc.cadence));
        const earliest = froms.reduce((a, b) => (b < a ? b : a));
        const [cells, specCells] = await Promise.all([listBoardSeries(OWN_SERIES_BOARD, earliest, FAR), listBoardSpec(OWN_SERIES_BOARD, SPEC_SERIES_PREFIX, FAR).catch(() => [])]);
        const sorted = sortOwnCells(typed.map((x, k) => ({ card: x.loc.cardId, from: froms[k] })), cells, specCells);
        await Promise.all(
          typed.map(async (x, k) => {
            let mine: { key: string; date: string; shift: string; value: string }[] = sorted[k].cells;
            if (froms[k] !== READ_FROM_START && !mine.some((c) => x.loc.isActual(c.key) && c.value !== "")) {
              const old = await latestSeriesCell(x.loc.boardId, x.loc.cardId).catch(() => null);
              if (old) mine = [old];
            }
            out.set(`${x.id}|${x.m.key}`, lastFromCells(mine, x.loc.isActual, specSeriesFromCells(sorted[k].spec)));
          })
        );
      })().catch(() => undefined)
    );
  }
  await Promise.all(jobs);
  return out;
}

/** A whole board's cells, sorted out by metric: each gets the cells at
 *  ITS card, readings from its own window on, and its own plan history.
 *  Two priorities may carry a metric of the same name — the card is
 *  `<priorityId>/<key>`, so they never mix. Pure. */
export function sortOwnCells<C extends { cardId: string; date: string }>(wants: { card: string; from: string }[], cells: C[], specCells: C[]): { cells: C[]; spec: C[] }[] {
  const byCard = new Map<string, C[]>();
  for (const c of cells) (byCard.get(c.cardId) ?? byCard.set(c.cardId, []).get(c.cardId)!).push(c);
  const specByCard = new Map<string, C[]>();
  for (const c of specCells) (specByCard.get(c.cardId) ?? specByCard.set(c.cardId, []).get(c.cardId)!).push(c);
  return wants.map((w) => ({ cells: (byCard.get(w.card) ?? []).filter((c) => c.date >= w.from), spec: specByCard.get(w.card) ?? [] }));
}

/** A priority's own metrics as values, in definition order. Every one
 *  shows — there is no starring on a priority. */
export function ownMetricValues(priorityId: string, metrics: TemplateMetric[], lasts: Map<string, DriverLast>): MetricValue[] {
  return metrics.map((m) => ({ ...metricValueOf(m, lasts.get(`${priorityId}|${m.key}`) ?? null), starred: true }));
}

/** The last recorded reading per metric, read from wherever it lives
 *  (metricLocation): the driver's series, the seeded single card, or the
 *  Metrics card's sub-location. Reads coalesce per board. */
export async function loadMetricLasts(
  initiatives: Initiative[],
  boards: Pick<BoardSummary, "boardId" | "manifestRaw">[] = []
): Promise<Map<string, DriverLast>> {
  const out = new Map<string, DriverLast>();
  const { listDrivers } = await import("../store/valueDrivers");
  const byBoard = new Map(boards.map((b) => [b.boardId, b]));
  const driverCache = new Map<string, Promise<DriverNode[]>>();
  const driversFor = (site: string) => {
    if (!driverCache.has(site)) driverCache.set(site, listDrivers(site).catch(() => []));
    return driverCache.get(site)!;
  };
  await Promise.all(
    initiatives.map(async (i) => {
      if (i.boardId === "") return;
      const board = byBoard.get(i.boardId);
      const slots = board ? parseManifest(board.manifestRaw).slots : [];
      const metricsCardId = slots.find((sl) => sl.cardType === "MetricsCard")?.cardId ?? "";
      const drivers = i.metrics.some((m) => m.driverId) ? await driversFor(i.org.site) : [];
      await Promise.all(
        i.metrics.map(async (m) => {
          const d = m.driverId ? (drivers.find((x) => x.id === m.driverId) ?? null) : null;
          const loc = metricLocation(m, i.boardId, metricsCardId, slots, d);
          const v = await readLast(loc, d).catch(() => null);
          if (v === null) return;
          out.set(`${i.id}|${m.key}`, v);
          if (loc.driverId !== "") out.set(loc.driverId, v);
        })
      );
    })
  );
  return out;
}

/** @deprecated use loadMetricLasts — kept for the callers' shape. */
export const loadDriverLasts = loadMetricLasts;
