// One read for every priority metric (2026-11-22): a board's cells are
// sorted out by metric in memory, and the newest reading is found among
// cells that also hold plan rows.

import { describe, expect, it } from "vitest";
import { EMPTY_SPEC_SERIES } from "../../../shared/schema/specSeries";
import { lastFromCells, sortOwnCells } from "../improvement/metricValues";
import { latestReading } from "../store/seriesMap";

const cell = (cardId: string, key: string, date: string, value: string, shift = "-") => ({ cardId, key, date, shift, value });

describe("a board's cells, sorted out by metric", () => {
  const cells = [
    cell("pr-1/trifr", "k1", "2026-11-02", "1"),
    cell("pr-1/trifr", "k2", "2026-11-09", "5"),
    cell("pr-2/trifr", "k3", "2026-11-09", "9"), // the same metric name on another priority
    cell("pr-1/cost", "k4", "2026-03-01", "70"),
    cell("pr-1/cost", "k5", "2026-11-01", "80"),
  ];
  const spec = [cell("pr-1/trifr", "spec:plan", "2026-01-05", "2"), cell("pr-2/trifr", "spec:plan", "2026-01-05", "4")];
  it("each metric gets the cells at its own card, and its own plan history", () => {
    const [a, b] = sortOwnCells([{ card: "pr-1/trifr", from: "2024-11-22" }, { card: "pr-2/trifr", from: "2024-11-22" }], cells, spec);
    expect(a.cells.map((c) => c.value)).toEqual(["1", "5"]);
    expect(b.cells.map((c) => c.value)).toEqual(["9"]);
    expect(a.spec.map((c) => c.value)).toEqual(["2"]);
    expect(b.spec.map((c) => c.value)).toEqual(["4"]);
  });
  it("a metric's own window bounds its readings, not the board's", () => {
    // the board was read from the weekly window; a daily metric keeps six months
    const [cost] = sortOwnCells([{ card: "pr-1/cost", from: "2026-05-22" }], cells, spec);
    expect(cost.cells.map((c) => c.value)).toEqual(["80"]);
  });
  it("a metric with nothing on the board gets nothing", () => {
    expect(sortOwnCells([{ card: "pr-9/x", from: "1900-01-01" }], cells, spec)).toEqual([{ cells: [], spec: [] }]);
  });
});

describe("a metric's last reading from its own cells", () => {
  const isActual = (k: string) => k !== "" && !k.startsWith("spec:");
  it("takes the latest by date, whatever order the cells came in", () => {
    const v = lastFromCells([cell("c", "k2", "2026-11-09", "5"), cell("c", "k1", "2026-11-02", "1"), cell("c", "spec:plan", "2026-11-16", "2")], isActual, EMPTY_SPEC_SERIES);
    expect([v.last, v.date, v.tail]).toEqual([5, "2026-11-09", [1, 5]]);
  });
  it("is empty with no reading, and ignores a cleared cell", () => {
    const v = lastFromCells([cell("c", "k1", "2026-11-02", ""), cell("c", "spec:plan", "2026-11-02", "2")], isActual, EMPTY_SPEC_SERIES);
    expect([v.last, v.date, v.tail]).toEqual([null, "", []]);
  });
});

describe("the newest reading among cells", () => {
  it("skips plan rows dated later, and empty cells", () => {
    const cells = [cell("c", "spec:plan", "2026-12-28", "2"), cell("c", "k1", "2026-09-14", "51"), cell("c", "k0", "2026-09-07", "56"), cell("c", "k9", "2026-10-01", "")];
    expect(latestReading(cells)?.value).toBe("51");
  });
  it("reads one key only when a key is given (a driver's actual)", () => {
    const cells = [cell("d", "actual", "2026-09-14", "51"), cell("d", "note", "2026-11-01", "x")];
    expect(latestReading(cells, "actual")?.value).toBe("51");
    expect(latestReading([], "actual")).toBeNull();
  });
});
