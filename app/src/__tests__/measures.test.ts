// One list of measures on a priority (R5 of the 2026-11-25 round, report 20).
import { describe, expect, it } from "vitest";
import { MEASURE_CAP, Measure, objectiveValues, objectivesJson, parseMeasures, parseObjectives, parseOwnMetrics } from "../priorities/model";
import { GONE_WORDS, convertMeasures, convertWords, hasMeasure, measureRows, moveMeasure, roomFor, setMeasures, similarMetrics, starredKeys, syncOwn } from "../priorities/measures";
import type { TemplateMetric } from "../improvement/templateModel";

const own = (key: string, name = key): TemplateMetric => ({ key, name, unit: "", target: null, goodDirection: "up", tracking: "value", kind: "own" }) as TemplateMetric;
const ref = (initiativeId: string, metricKey: string) => ({ initiativeId, metricKey });
const val = (key: string, starred = false) => ({ key, starred });

describe("stored in the objectives column", () => {
  it("an unconverted priority reads no list", () => {
    expect(parseMeasures(objectivesJson({ objectives: [ref("I1", "m1")], ownMetrics: [own("o1")] }))).toBeNull();
    expect(parseMeasures("")).toBeNull();
    expect(parseMeasures("not json")).toBeNull();
  });
  it("a converted one keeps its order, own and referenced interleaved", () => {
    const list: Measure[] = [ref("I1", "m1"), { own: "o1" }, ref("I2", "m9")];
    const json = objectivesJson({ objectives: [ref("I1", "m1"), ref("I2", "m9")], ownMetrics: [own("o1", "Yield")], measures: list });
    expect(parseMeasures(json)).toEqual(list);
    // everything that read the picks and the own metrics still can
    expect(parseObjectives(json)).toEqual([ref("I1", "m1"), ref("I2", "m9")]);
    expect(parseOwnMetrics(json).map((m) => m.name)).toEqual(["Yield"]);
  });
  it("an empty converted list is still a list", () => {
    const json = objectivesJson({ objectives: [], measures: [] });
    expect(json).toBe('[{"list":1}]');
    expect(parseMeasures(json)).toEqual([]);
  });
  it("an own definition the order does not name is not lost", () => {
    const json = objectivesJson({ objectives: [], ownMetrics: [own("o1"), own("o2")], measures: [{ own: "o2" }] });
    expect(parseMeasures(json)).toEqual([{ own: "o2" }, { own: "o1" }]);
  });
});

describe("what a priority shows", () => {
  const values: Record<string, { key: string; starred: boolean }[]> = { I1: [val("a", true), val("b")], I2: [val("c")] };
  const valuesOf = (id: string) => values[id] ?? [];
  it("unconverted: the old rule — a primary's starred metrics take over", () => {
    const p = { objectives: [ref("I2", "c")] };
    expect(objectiveValues(p, "I1", valuesOf, () => true, [val("o1")]).map((v) => v.key)).toEqual(["o1", "a"]);
    expect(objectiveValues(p, "", valuesOf, () => true, [val("o1")]).map((v) => v.key)).toEqual(["o1", "c"]);
  });
  it("converted: its list, in its order, whatever is starred", () => {
    const p = { objectives: [], measures: [ref("I2", "c"), { own: "o1" }, ref("I1", "b")] as Measure[] };
    expect(objectiveValues(p, "I1", valuesOf, () => true, [val("o1")]).map((v) => v.key)).toEqual(["c", "o1", "b"]);
  });
  it("a reference that has gone is not drawn", () => {
    const p = { objectives: [], measures: [ref("I1", "zz"), ref("I2", "c")] as Measure[] };
    expect(objectiveValues(p, "", valuesOf, () => true).map((v) => v.key)).toEqual(["c"]);
    expect(objectiveValues(p, "", valuesOf, (id) => id !== "I2").map((v) => v.key)).toEqual([]);
  });
});

describe("carried in as they stand on the day", () => {
  it("own first, then a live primary's starred metrics as references", () => {
    expect(convertMeasures({ objectives: [ref("I2", "c")], ownMetrics: [own("o1")] }, "I1", ["a", "b"], () => true)).toEqual([{ own: "o1" }, ref("I1", "a"), ref("I1", "b")]);
  });
  it("no primary: the picks whose initiative is still under it", () => {
    expect(convertMeasures({ objectives: [ref("I2", "c"), ref("I9", "x")] }, "", [], (id) => id !== "I9")).toEqual([ref("I2", "c")]);
  });
  it("nothing is dropped for being over four", () => {
    const eight = Array.from({ length: 8 }, (_, i) => own(`o${i}`));
    expect(convertMeasures({ objectives: [], ownMetrics: eight }, "I1", ["a"], () => true)).toHaveLength(9);
  });
  it("starred means starred, or the first when none is", () => {
    expect(starredKeys([{ key: "a" }, { key: "b", primary: true }, { key: "c", primary: true }])).toEqual(["b", "c"]);
    expect(starredKeys([{ key: "a" }, { key: "b" }])).toEqual(["a"]);
    expect(starredKeys([])).toEqual([]);
  });
  it("says what it did", () => {
    expect(convertWords(12, 0, 2)).toBe("12 priorities converted: each keeps the measures it showed today, as one list. 2 have more than 4: they show the first 4 and cannot be added to until trimmed.");
    expect(convertWords(1, 3, 0)).toBe("1 priority converted: each keeps the measures it showed today, as one list.");
    expect(convertWords(0, 5, 0)).toMatch(/Nothing was changed/);
  });
});

describe("changing the list", () => {
  it("at most four", () => {
    expect(MEASURE_CAP).toBe(4);
    expect(roomFor([])).toBe(4);
    expect(roomFor([{ own: "a" }, { own: "b" }, { own: "c" }])).toBe(1);
    expect(roomFor(Array.from({ length: 6 }, (_, i) => ({ own: `o${i}` })))).toBe(0);
  });
  it("moves one place, and not off either end", () => {
    const list: Measure[] = [{ own: "a" }, ref("I1", "m"), { own: "c" }];
    expect(moveMeasure(list, 2, -1)).toEqual([{ own: "a" }, { own: "c" }, ref("I1", "m")]);
    expect(moveMeasure(list, 0, -1)).toBe(list);
    expect(moveMeasure(list, 2, 1)).toBe(list);
  });
  it("knows what is already listed", () => {
    const list: Measure[] = [{ own: "a" }, ref("I1", "m")];
    expect(hasMeasure(list, ref("I1", "m"))).toBe(true);
    expect(hasMeasure(list, ref("I1", "n"))).toBe(false);
    expect(hasMeasure(list, { own: "a" })).toBe(true);
  });
  it("the picks mirror the references", () => {
    const p = { measures: undefined as Measure[] | undefined, objectives: [] as { initiativeId: string; metricKey: string }[] };
    setMeasures(p, [{ own: "a" }, ref("I1", "m")]);
    expect(p.objectives).toEqual([ref("I1", "m")]);
  });
  it("follows the own-metric editor: a removed definition leaves, a new one joins the end", () => {
    expect(syncOwn([{ own: "a" }, ref("I1", "m"), { own: "b" }], ["b", "c"])).toEqual([ref("I1", "m"), { own: "b" }, { own: "c" }]);
  });
});

describe("the tab's rows", () => {
  const init = (id: string) =>
    id === "I1" ? { title: "Reduce changeover", linked: true, metricName: (k: string) => (k === "m" ? "Changeover minutes" : null) } : id === "I2" ? { title: "Old trial", linked: false, metricName: () => "Yield" } : null;
  it("names each measure and where it comes from", () => {
    const rows = measureRows([{ own: "o1" }, ref("I1", "m")], (k) => (k === "o1" ? "Site yield" : null), init);
    expect(rows.map((r) => [r.kind, r.state, r.name, r.source])).toEqual([
      ["own", "ok", "Site yield", "This priority"],
      ["ref", "ok", "Changeover minutes", "Reduce changeover"],
    ]);
  });
  it("says why a reference has gone, where today it vanished silently", () => {
    const rows = measureRows([ref("I1", "deleted"), ref("I2", "y"), ref("I9", "z")], () => null, init);
    expect(rows.map((r) => r.state)).toEqual(["gone", "unlinked", "unlinked"]);
    expect(GONE_WORDS.gone).toBe("No longer on its initiative");
    expect(GONE_WORDS.unlinked).toBe("Its initiative is no longer under this priority");
  });
});

describe("a duplicate is a choice", () => {
  const choices = [{ name: "Changeover minutes" }, { name: "OEE %" }, { name: "Safety observations" }];
  it("offers metrics with a like name", () => {
    expect(similarMetrics("changeover", choices).map((c) => c.name)).toEqual(["Changeover minutes"]);
    expect(similarMetrics("Average changeover time", choices).map((c) => c.name)).toEqual(["Changeover minutes"]);
    expect(similarMetrics("oee", choices).map((c) => c.name)).toEqual(["OEE %"]);
  });
  it("and nothing for a short or unlike name", () => {
    expect(similarMetrics("ch", choices)).toEqual([]);
    expect(similarMetrics("Yield", choices)).toEqual([]);
  });
});
