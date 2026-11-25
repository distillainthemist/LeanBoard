// The priority popup's Objectives tab, its "This priority" section (the
// 2026-11-18 proposal, feature 2): metrics defined ON the priority. The
// initiative metric editor for the people who manage the OWNING org
// (name, objective, unit, plan, limits, cadence, or one from the value
// driver tree); read-only rows for everyone else — an org that adopted
// the priority included. Under the rows, each metric's FULL TREND (Ben,
// 2026-11-19: the tab showed no trend, only the tile's sparkline): the
// initiative Metrics card's own chart grid, with its "Update values" in
// each chart's title strip and a click popping a chart out large.
// Loaded on demand from the popup.

import { el } from "../../../shared/ui/dom";
import { todayIso } from "../../../shared/schema/id";
import { DEFAULT_ROWS_CARD } from "../../../shared/schema/specSeries";
import { defaultTheme } from "../../../shared/tokens";
import { mountMetricsCard } from "../improvement/metricsCard";
import type { MetricValue } from "../improvement/metricValues";
import { ownMetricLocation } from "../improvement/metricValues";
import { renderMetricsList } from "../improvement/metricsList";
import { hasOwnReadings, moveReadingsWords } from "../improvement/metricRemoval";
import { promptConfirm } from "../prompts";
import { currentViewer } from "../runtime";
import type { TemplateMetric } from "../improvement/templateModel";
import type { DriverNode, DriverTracking } from "../improvement/vdt/model";
import { pageColumns, pageOriginAround } from "../improvement/vdt/gridModel";
import { listDrivers } from "../store/valueDrivers";
import { OBJECTIVES_JSON_MAX, objectivesJson, OWN_METRIC_CAP, OWN_SERIES_BOARD, ownSeriesCard, Priority, ragPaletteKey } from "./model";

export interface OwnMetricsOpts {
  host: HTMLElement;
  priority: Priority;
  /** Manages the owning org, on an active or proposed priority. */
  canEdit: boolean;
  /** The metrics as values (the light, plan and actual of a read-only row). */
  values: () => MetricValue[];
  palette: Record<string, string>;
  /** Write the definitions (the priority row), then repaint the screen. */
  save: () => Promise<void>;
  /** Readings changed: read them again, repaint the screen. */
  valuesChanged: () => Promise<void>;
}

/** The values grid's note names whose readings they are. */
const OWNER_WORDS = "this priority's readings";

const link = (label: string): HTMLButtonElement => {
  const b = el("button", "app-link", label) as HTMLButtonElement;
  b.type = "button";
  return b;
};

/** The tracking a metric is measured under, when it is not a number. */
function trackingFor(m: TemplateMetric, d: DriverNode | null): DriverTracking | null {
  if (d && d.tracking.kind !== "value") return d.tracking;
  if (!d && m.tracking !== "value") return { kind: m.tracking, options: m.options ?? [] };
  return null;
}

export function mountOwnMetrics(o: OwnMetricsOpts): void {
  const p = o.priority;
  const site = p.org.site;
  const metrics: TemplateMetric[] = (p.ownMetrics ?? []).map((m) => ({ ...m }));
  let drivers: DriverNode[] | null = null;
  const driversNow = async (): Promise<DriverNode[]> => {
    if (drivers === null) drivers = site !== "" ? await listDrivers(site).catch(() => []) : [];
    return drivers;
  };

  /** The values grid for one metric: the driver's series when it is one
   *  from the tree, else the priority's own location. */
  const openValues = async (m: TemplateMetric, readOnly: boolean) => {
    const all = m.driverId ? await driversNow() : [];
    const d = m.driverId ? (all.find((x) => x.id === m.driverId) ?? null) : null;
    const loc = ownMetricLocation(p.id, m, d);
    const cols = pageColumns(loc.cadence, pageOriginAround(todayIso(), loc.cadence));
    const { openValueGridDialog } = await import("../improvement/vdt/gridDialog");
    await openValueGridDialog({
      title: m.name,
      location: { boardId: loc.boardId, cardId: loc.cardId },
      driver: loc.driverId !== "" && d ? { id: d.id, cadence: d.cadence, aggregate: d.aggregate, unit: d.unit, format: d.format, tracking: d.tracking } : null,
      cadence: loc.cadence,
      unit: d ? d.unit : m.unit,
      level: { target: m.target, lsl: m.lsl ?? null, usl: m.usl ?? null },
      rows: m.rows ?? DEFAULT_ROWS_CARD,
      tracking: trackingFor(m, d) ?? undefined,
      window: { from: cols[0].from, to: cols[cols.length - 1].to },
      ownerWords: OWNER_WORDS,
      readOnly,
      onClosed: (changed) => {
        if (changed) void o.valuesChanged();
      },
    });
  };

  // every metric's full trend, under the rows
  const chartsHost = el("div", "app-cp-ov-chartercard-scroll app-cp-ov-owncharts");
  let unmountCharts: () => void = () => undefined;
  const mountCharts = () => {
    unmountCharts();
    unmountCharts = () => undefined;
    if (!chartsHost.isConnected || metrics.length === 0) return;
    unmountCharts = mountMetricsCard({
      host: chartsHost,
      title: "",
      boardId: OWN_SERIES_BOARD,
      cardId: p.id,
      outputJson: "",
      people: [],
      theme: defaultTheme(),
      readOnly: !o.canEdit,
      settings: {},
      instanceKey: "",
      instanceWhen: "",
      actions: [],
      palette: o.palette,
      sources: [],
      viewer: { whoId: "", who: "" },
      onSave: () => undefined,
      onActions: () => undefined,
      source: {
        metrics: metrics.map((m) => ({ ...m })),
        site,
        locate: (m, d) => ownMetricLocation(p.id, m, d),
        emptyNote: "",
        ownerWords: OWNER_WORDS,
        onValuesChanged: () => void o.valuesChanged(),
      },
    });
  };

  if (!o.canEdit) {
    // read-only: a light, "Name: objective", plan and actual, the values
    const values = o.values();
    for (const m of metrics) {
      const v = values.find((x) => x.key === m.key);
      const row = el("div", "app-cp-ov-objrow app-cp-ov-ownrow");
      const light = el("span", "app-cp-objective-light");
      light.style.background = v?.rag ? (o.palette[ragPaletteKey(v.rag)] ?? "#9a948a") : "#d9d3c8";
      const text = el("span", "app-cp-ov-objtext");
      text.appendChild(el("span", "app-cp-ov-objname", m.objective ? `${m.name}: ${m.objective}` : m.name));
      const plan = v && v.target !== null ? `${v.target}${v.unit}` : "";
      text.appendChild(el("span", "app-cp-ov-objnums", `Plan ${plan !== "" ? plan : "—"} · Actual ${v && v.display !== "" ? v.display : "—"}`));
      if (v && v.stale !== "") text.appendChild(el("span", "app-cp-ov-objstale", `◷ ${v.stale}`));
      const open = link("Values…");
      open.title = "The readings behind this metric";
      open.addEventListener("click", () => void openValues(m, true));
      row.append(light, text, open);
      o.host.appendChild(row);
    }
    o.host.appendChild(chartsHost);
    mountCharts();
    return;
  }

  const err = el("div", "app-cp-err", "");
  // one write after another, the last state winning
  let writing: Promise<void> = Promise.resolve();
  let saved = JSON.stringify(metrics);
  /** A link or promote moved readings: the values are read again after
   *  the definitions are saved. */
  let relinked = false;
  const persist = () => {
    const now = JSON.stringify(metrics);
    if (now === saved) return;
    if (objectivesJson({ objectives: p.objectives, ownMetrics: metrics }).length > OBJECTIVES_JSON_MAX) {
      err.textContent = "These metrics are too long to store on one priority. Shorten a name or an objective, or remove a metric.";
      return;
    }
    err.textContent = "";
    saved = now;
    p.ownMetrics = metrics.map((m) => ({ ...m }));
    // the charts follow the definitions (a metric added, renamed, removed)
    mountCharts();
    // a metric joined to a driver reads the driver's series from now on
    const reread = relinked;
    relinked = false;
    writing = writing.then(o.save).then(() => (reread ? o.valuesChanged() : undefined)).catch((e) => {
      console.warn("priority metrics: save failed", e);
      err.textContent = "The metrics could not be saved. Check the connection and try again.";
    });
  };

  /** Where this priority keeps a metric's OWN readings. */
  const ownAt = (m: TemplateMetric) => ({ boardId: OWN_SERIES_BOARD, cardId: ownSeriesCard(p.id, m.key) });
  /** May this viewer create drivers at the priority's site? The same
   *  check as on an initiative: a super admin, or a filler of the value
   *  drivers editor role at that site. */
  const mayPromote = async (): Promise<boolean> => {
    if (site === "") return false;
    try {
      const who = currentViewer();
      if (!who) return false;
      const [{ viewerPerson }, { improvementSettingsJson }, { parseImprovementSettings, roleFillersAt }, { effectivePerson }] = await Promise.all([
        import("../store/people"),
        import("../store/config"),
        import("../improvement/templateModel"),
        import("../viewAs"),
      ]);
      const stored = await viewerPerson(who.objectId);
      const me = stored ? effectivePerson(stored) : null;
      if (me?.role === "superadmin") return true;
      const imp = parseImprovementSettings(await improvementSettingsJson());
      const role = imp.standardRoles.find((r) => r.key === imp.vdtEditorRole);
      return role !== undefined && roleFillersAt(role, site).some((x) => x.whoId === who.objectId);
    } catch {
      return false;
    }
  };

  const list = el("div");
  o.host.append(list, err, chartsHost);
  void mayPromote().then((canPromote) => {
    if (!list.isConnected) return;
    renderList(canPromote);
  });
  const renderList = (canPromote: boolean) => renderMetricsList({
    host: list,
    metrics,
    site: () => site,
    canPromote,
    noun: "priority",
    noStar: true,
    noTree: site === "",
    // Link… / Promote… into the site's value driver tree (programme D5,
    // 2026-11-25): the readings are carried across. A company-level
    // priority has no site and so no tree to link into.
    noRelink: site === "",
    beforeMerge: async (m, driverName) => {
      const at = ownAt(m);
      const { countReadings } = await import("../store/series");
      const n = await countReadings(at.boardId, at.cardId).catch(() => -1);
      if (n === 0) return true; // nothing to move
      const words = n < 0 ? { title: `Move this metric's readings into ${driverName !== "" ? driverName : "the new driver"}?`, note: "Its readings could not be counted. They join the value driver's series and cannot be separated again." } : moveReadingsWords(n, driverName);
      return promptConfirm({ ...words, confirmLabel: "Move" });
    },
    onLinked: async (m) => {
      drivers = null; // a promoted node is new to the cache
      if (!m.driverId || m.driverLink === "leads") return; // it only leads a driver: its readings stay its own
      const at = ownAt(m);
      try {
        const [{ mergeCardSeriesIntoDriver }, { deleteSeriesAt }] = await Promise.all([import("../store/driverSeries"), import("../store/series")]);
        await mergeCardSeriesIntoDriver(at.boardId, at.cardId, m.driverId);
        // moved, not copied: nothing is left behind to come back later
        await deleteSeriesAt(at.boardId, at.cardId);
        relinked = true;
      } catch (e) {
        console.warn("priority metrics: readings not moved", e);
        err.textContent = `The readings of ${m.name} could not be moved into the driver. They are still stored with this priority.`;
      }
    },
    max: OWN_METRIC_CAP,
    onChanged: persist,
    // this list saves at once, so a removed metric's readings go at once
    // — after the person has been asked, with the count (programme C8)
    readingsOf: async (m) => {
      const loc = ownMetricLocation(p.id, m, null);
      const { countReadings } = await import("../store/series");
      return countReadings(loc.boardId, loc.cardId);
    },
    onRemoved: (m) => {
      if (!hasOwnReadings(m)) return;
      const loc = ownMetricLocation(p.id, m, null);
      writing = writing
        .then(() => import("../store/series"))
        .then((st) => st.deleteSeriesAt(loc.boardId, loc.cardId))
        .then(() => undefined)
        .catch((e) => {
          console.warn("priority metrics: readings not deleted", e);
          err.textContent = `The readings of ${m.name} could not be deleted. They are still stored.`;
        });
    },
  });
  mountCharts();
}
