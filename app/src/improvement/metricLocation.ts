// Where an initiative metric's readings live (Metrics card, 2026-09-08).
// PURE. A DRIVES-linked metric reads the driver's one series; an own
// metric reads the single KPI card that was seeded for it when one exists
// on the board (older boards), else a sub-location under the Metrics card
// (`<metricsCardId>/<metricKey>`). Leads-linked metrics are own metrics
// for readings (the link is an influence, not a series).

import { TemplateMetric } from "./templateModel";
import { Cadence, Aggregate } from "./vdt/model";
import { SPEC_SERIES_PREFIX } from "../../../shared/schema/specSeries";

export interface MetricLocation {
  boardId: string;
  cardId: string;
  /** Which non-spec keys are readings. */
  isActual: (key: string) => boolean;
  /** Readings write under this key ("actual") or under fresh ids (""). */
  actualKey: string;
  cadence: Cadence;
  aggregate: Aggregate;
  driverId: string;
}

export function metricLocation(
  m: TemplateMetric,
  boardId: string,
  metricsCardId: string,
  slots: { cardType: string; cardId: string; settings: Record<string, unknown> }[],
  driver: { id: string; cadence: Cadence; aggregate: Aggregate } | null
): MetricLocation {
  if (driver && m.driverId === driver.id && m.driverLink !== "leads") {
    return { boardId: "vdt", cardId: driver.id, isActual: (k) => k === "actual", actualKey: "actual", cadence: driver.cadence, aggregate: driver.aggregate, driverId: driver.id };
  }
  const seeded = slots.find((sl) => sl.cardType === "KpiTrendCard" && String(((sl.settings.metric ?? {}) as Record<string, unknown>).key ?? "") === m.key);
  return {
    boardId,
    cardId: seeded ? seeded.cardId : `${metricsCardId}/${m.key}`,
    isActual: (k) => k !== "" && !k.startsWith(SPEC_SERIES_PREFIX),
    actualKey: "",
    cadence: m.cadence ?? "weekly",
    aggregate: "last",
    driverId: "",
  };
}

/** The driver whose SERIES a metric reads, or null: only a metric that
 *  IS the driver ("drives"). One that merely LEADS a driver is measured
 *  as itself — its own readings, unit and tracking — and the driver is
 *  an influence only. Every reader of a metric's readings asks this
 *  (2026-11-25: the Metrics card took any linked driver, read the
 *  driver's key at the metric's own location and drew nothing). */
export function seriesDriver<D extends { id: string }>(m: Pick<TemplateMetric, "driverId" | "driverLink">, drivers: D[]): D | null {
  if (!m.driverId || m.driverLink === "leads") return null;
  return drivers.find((d) => d.id === m.driverId) ?? null;
}

/** The driver a metric only LEADS (an influence), or null. */
export function ledDriver<D extends { id: string }>(m: Pick<TemplateMetric, "driverId" | "driverLink">, drivers: D[]): D | null {
  if (!m.driverId || m.driverLink !== "leads") return null;
  return drivers.find((d) => d.id === m.driverId) ?? null;
}

/** The register's display for a non-value metric's last reading. */
export function trackingDisplay(m: Pick<TemplateMetric, "tracking" | "options">, raw: string): { label: string; rag: "green" | "amber" | "red" | null } {
  if (m.tracking === "goodbad") {
    if (raw === "1") return { label: "Good", rag: "green" };
    if (raw === "0") return { label: "Bad", rag: "red" };
    return { label: "", rag: null };
  }
  if (m.tracking === "picklist") {
    const op = (m.options ?? []).find((o) => o.label === raw);
    return op ? { label: op.label, rag: op.state } : { label: raw, rag: null };
  }
  return { label: raw, rag: null };
}
