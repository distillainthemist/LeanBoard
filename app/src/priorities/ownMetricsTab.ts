// The priority popup's Objectives tab, its "This priority" section (the
// 2026-11-18 proposal, feature 2): metrics defined ON the priority. The
// initiative metric editor for the people who manage the OWNING org
// (name, objective, unit, plan, limits, cadence, or one from the value
// driver tree), "Values…" on each row opening the values grid; read-only
// rows for everyone else — an org that adopted the priority included.
// Loaded on demand from the popup.

import { el } from "../../../shared/ui/dom";
import { todayIso } from "../../../shared/schema/id";
import { DEFAULT_ROWS_CARD } from "../../../shared/schema/specSeries";
import type { MetricValue } from "../improvement/metricValues";
import { ownMetricLocation } from "../improvement/metricValues";
import { renderMetricsList } from "../improvement/metricsList";
import type { TemplateMetric } from "../improvement/templateModel";
import type { DriverNode, DriverTracking } from "../improvement/vdt/model";
import { pageColumns, pageOriginAround } from "../improvement/vdt/gridModel";
import { listDrivers } from "../store/valueDrivers";
import { OBJECTIVES_JSON_MAX, objectivesJson, OWN_METRIC_CAP, Priority, ragPaletteKey } from "./model";

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
      readOnly,
      onClosed: (changed) => {
        if (changed) void o.valuesChanged();
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
      const open = link("Values…");
      open.title = "The readings behind this metric";
      open.addEventListener("click", () => void openValues(m, true));
      row.append(light, text, open);
      o.host.appendChild(row);
    }
    return;
  }

  const err = el("div", "app-cp-err", "");
  // one write after another, the last state winning
  let writing: Promise<void> = Promise.resolve();
  let saved = JSON.stringify(metrics);
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
    writing = writing.then(o.save).catch((e) => {
      console.warn("priority metrics: save failed", e);
      err.textContent = "The metrics could not be saved. Check the connection and try again.";
    });
  };

  const list = el("div");
  o.host.append(list, err);
  renderMetricsList({
    host: list,
    metrics,
    site: () => site,
    canPromote: false,
    noun: "priority",
    noStar: true,
    noTree: site === "",
    noRelink: true,
    max: OWN_METRIC_CAP,
    onChanged: persist,
    rowTools: (m) => {
      const b = link("Values…");
      b.title = "Enter or read this metric's values";
      b.addEventListener("click", () => {
        // a metric just added is written before its values are
        void writing.then(() => openValues(m, false));
      });
      return [b];
    },
  });
}
