// Metrics defined ON a priority (the 2026-11-18 proposal, feature 2):
// how they are stored beside the picked objectives, where their readings
// live, how they read as values, and how they lead the objectives.

import { describe, expect, it } from "vitest";
import { EMPTY_SPEC_SERIES } from "../../../shared/schema/specSeries";
import { DriverLast, metricValueOf, ownMetricLocation, ownMetricValues } from "../improvement/metricValues";
import type { TemplateMetric } from "../improvement/templateModel";
import { priorityStatus, actionCounts } from "../improvement/status";
import { objectivesJson, objectiveValues, OWN_METRIC_CAP, OWN_SERIES_BOARD, ownSeriesCard, parseObjectives, parseOwnMetrics } from "../priorities/model";

const trifr: TemplateMetric = { key: "trifr", name: "TRIFR", unit: "", target: 2, usl: 3, goodDirection: "down", tracking: "value", kind: "own", cadence: "weekly", objective: "Below 2 by June" };
const mood: TemplateMetric = { key: "mood", name: "Crew mood", unit: "", target: null, goodDirection: "up", tracking: "goodbad", kind: "own" };
const picks = [{ initiativeId: "in-1", metricKey: "yield" }];
const last = (value: number, tail: number[] = [value]): DriverLast => ({ last: value, raw: String(value), date: "2026-11-09", spec: EMPTY_SPEC_SERIES, tail });

describe("how a priority's own metrics are stored", () => {
  it("writes them ahead of the picks, in the one objectives column, and reads both back", () => {
    const raw = objectivesJson({ objectives: picks, ownMetrics: [trifr, mood] });
    expect(JSON.parse(raw)).toEqual([{ own: trifr }, { own: mood }, ...picks]);
    expect(parseOwnMetrics(raw)).toEqual([trifr, mood]);
    expect(parseObjectives(raw)).toEqual(picks);
  });
  it("writes nothing when there is neither", () => {
    expect(objectivesJson({ objectives: [] })).toBe("");
    expect(objectivesJson({ objectives: [], ownMetrics: [] })).toBe("");
  });
  it("reads a column written before own metrics existed", () => {
    const old = JSON.stringify(picks);
    expect(parseOwnMetrics(old)).toEqual([]);
    expect(parseObjectives(old)).toEqual(picks);
    expect(parseOwnMetrics("")).toEqual([]);
    expect(parseOwnMetrics("not json")).toEqual([]);
  });
  it("drops a broken entry, a repeat and a star; keeps at most the cap", () => {
    const raw = JSON.stringify([{ own: { key: "", name: "x" } }, { own: { ...trifr, primary: true } }, { own: trifr }, { own: { key: "b" } }]);
    expect(parseOwnMetrics(raw)).toEqual([trifr]);
    const many = JSON.stringify(Array.from({ length: 12 }, (_, i) => ({ own: { ...trifr, key: `m${i}` } })));
    expect(parseOwnMetrics(many)).toHaveLength(OWN_METRIC_CAP);
  });
  it("settles the kind from the driver link", () => {
    const raw = JSON.stringify([{ own: { key: "t", name: "Tonnes", driverId: "d-9", driverLink: "drives" } }]);
    const [m] = parseOwnMetrics(raw);
    expect(m.kind).toBe("driver");
    expect(m.tracking).toBe("value");
    expect(m.target).toBeNull();
  });
});

describe("where the readings live", () => {
  it("the series table, at the priority's own location", () => {
    expect(OWN_SERIES_BOARD).toBe("priority");
    expect(ownSeriesCard("pr-1", "trifr")).toBe("pr-1/trifr");
    const loc = ownMetricLocation("pr-1", trifr, null);
    expect([loc.boardId, loc.cardId, loc.driverId, loc.cadence]).toEqual(["priority", "pr-1/trifr", "", "weekly"]);
    expect(loc.isActual("k123")).toBe(true);
  });
  it("keeps the location inside the column's 80 characters, still one per key", () => {
    const a = ownSeriesCard("pr-12345678", "a".repeat(90) + "_one");
    const b = ownSeriesCard("pr-12345678", "a".repeat(90) + "_two");
    expect(a.length).toBeLessThanOrEqual(80);
    expect(b.length).toBeLessThanOrEqual(80);
    expect(a).not.toBe(b);
  });
  it("a metric from the value driver tree reads the driver's series", () => {
    const linked: TemplateMetric = { ...trifr, key: "t", kind: "driver", driverId: "d-9", driverLink: "drives" };
    const loc = ownMetricLocation("pr-1", linked, { id: "d-9", cadence: "monthly", aggregate: "sum" } as never);
    expect([loc.boardId, loc.cardId, loc.driverId, loc.cadence]).toEqual(["vdt", "d-9", "d-9", "monthly"]);
  });
});

describe("a priority's own metrics as values", () => {
  it("reads the last value against plan and limits", () => {
    const lasts = new Map<string, DriverLast>([["pr-1|trifr", last(5, [1, 2.5, 5])]]);
    const [v] = ownMetricValues("pr-1", [trifr], lasts);
    expect(v.rag).toBe("red");
    expect(v.display).toBe("5");
    expect(v.target).toBe(2);
    expect(v.tail).toEqual([1, 2.5, 5]);
    expect(v.objective).toBe("Below 2 by June");
    // every own metric shows: there is no starring on a priority
    expect(v.starred).toBe(true);
  });
  it("carries no state before a reading, and a label for good / bad", () => {
    const none = ownMetricValues("pr-1", [trifr, mood], new Map());
    expect(none.map((v) => v.rag)).toEqual([null, null]);
    const good = metricValueOf(mood, { last: null, raw: "0", date: "2026-11-09", spec: EMPTY_SPEC_SERIES });
    expect([good.display, good.rag]).toEqual(["Bad", "red"]);
  });
  it("is keyed by priority: another priority's reading is not read", () => {
    const lasts = new Map<string, DriverLast>([["pr-2|trifr", last(5)]]);
    expect(ownMetricValues("pr-1", [trifr], lasts)[0].last).toBeNull();
  });
});

describe("the priority's objectives, with its own metrics", () => {
  const valuesOf = (id: string) => (id === "in-1" ? [{ key: "yield", starred: true }, { key: "scrap", starred: false }] : []);
  const own = [{ key: "trifr", starred: true }];
  it("its own lead, then the primary initiative's starred metrics", () => {
    expect(objectiveValues({ objectives: [] }, "in-1", valuesOf, () => true, own).map((v) => v.key)).toEqual(["trifr", "yield"]);
  });
  it("its own lead, then the picked ones when there is no primary", () => {
    expect(objectiveValues({ objectives: [{ initiativeId: "in-1", metricKey: "scrap" }] }, "", valuesOf, () => true, own).map((v) => v.key)).toEqual(["trifr", "scrap"]);
  });
  it("its own alone, with no initiatives", () => {
    expect(objectiveValues({ objectives: [] }, "", valuesOf, () => true, own).map((v) => v.key)).toEqual(["trifr"]);
    expect(objectiveValues({ objectives: [] }, "", valuesOf, () => true)).toEqual([]);
  });
  it("an own metric off plan makes the priority off track; on plan, on track", () => {
    const none = actionCounts([], "2026-11-18");
    expect(priorityStatus([], { actions: none, metrics: [{ name: "TRIFR", rag: "red" }] }).state).toBe("bad");
    expect(priorityStatus([], { actions: none, metrics: [{ name: "TRIFR", rag: "green" }] }).state).toBe("good");
    expect(priorityStatus([], { actions: none, metrics: [{ name: "TRIFR", rag: null }] }).state).toBe("none");
  });
});
