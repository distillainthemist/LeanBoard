// A driver's readings come back from the table in no promised order; the
// last one is read as the latest (a metric's value, its state, the
// sparkline's tail). They are put in date order first.

import { describe, expect, it } from "vitest";
import { sortPoints } from "../store/seriesMap";

describe("a driver's readings, oldest first", () => {
  it("orders by date whatever order they were written in", () => {
    const pts = [
      { date: "2026-09-14", shift: "-", value: 51 },
      { date: "2026-07-06", shift: "-", value: 25 },
      { date: "2026-09-07", shift: "-", value: 56 },
    ];
    expect(sortPoints(pts).map((p) => p.value)).toEqual([25, 56, 51]);
    // a week filled in late is not the latest reading
    expect(sortPoints([...pts, { date: "2026-08-03", shift: "-", value: 45 }]).pop()?.value).toBe(51);
  });
  it("orders the shifts of one day, and leaves the input as it was", () => {
    const pts = [
      { date: "2026-09-14", shift: "N", value: 2 },
      { date: "2026-09-14", shift: "D", value: 1 },
    ];
    expect(sortPoints(pts).map((p) => p.shift)).toEqual(["D", "N"]);
    expect(pts[0].shift).toBe("N");
  });
});
