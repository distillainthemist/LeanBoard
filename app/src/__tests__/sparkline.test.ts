// The sparkline's geometry (2026-11-17): where good lies, and how the
// readings and the band sit in the box.
import { describe, expect, it } from "vitest";
import { goodInterval, sparkGeometry } from "../improvement/sparkline";

const spec = (over: Record<string, unknown> = {}) => ({ target: null, usl: null, lsl: null, direction: "up" as const, ...over });

describe("where good lies", () => {
  it("higher is better: at or above the target, up to the upper limit", () => {
    expect(goodInterval(spec({ target: 80 }))).toEqual({ lo: 80, hi: Infinity });
    expect(goodInterval(spec({ target: 80, usl: 100, lsl: 50 }))).toEqual({ lo: 80, hi: 100 });
    expect(goodInterval(spec({ lsl: 50 }))).toEqual({ lo: 50, hi: Infinity });
  });
  it("lower is better: at or below the target, down to the lower limit", () => {
    expect(goodInterval(spec({ direction: "down", target: 5 }))).toEqual({ lo: -Infinity, hi: 5 });
    expect(goodInterval(spec({ direction: "down", usl: 9 }))).toEqual({ lo: -Infinity, hi: 9 });
  });
  it("a range: inside the limits", () => {
    expect(goodInterval(spec({ direction: "range", lsl: 2, usl: 8, target: 5 }))).toEqual({ lo: 2, hi: 8 });
  });
  it("judges nothing without a target or a limit, or with a spec that contradicts itself", () => {
    expect(goodInterval(spec())).toBeNull();
    expect(goodInterval(spec({ target: 120, usl: 100 }))).toBeNull();
  });
});

describe("the geometry", () => {
  it("spreads the readings across the box, higher values nearer the top", () => {
    const g = sparkGeometry([1, 2, 3], spec(), 100, 40);
    expect(g.points.map((p) => p.x)).toEqual([0, 50, 100]);
    expect(g.points[0].y).toBeGreaterThan(g.points[2].y);
    expect(g.bands).toEqual([]);
  });
  it("puts a green band above the target and a red one below (higher is better)", () => {
    const g = sparkGeometry([60, 70, 90], spec({ target: 80 }), 100, 40);
    expect(g.bands.map((b) => b.good)).toEqual([true, false]);
    expect(g.bands[0].y).toBe(0);
    expect(g.bands[0].h + g.bands[1].h).toBeCloseTo(40);
    // the last reading (90) sits in the green band, the first (60) in the red
    expect(g.points[2].y).toBeLessThan(g.bands[0].h);
    expect(g.points[0].y).toBeGreaterThan(g.bands[0].h);
  });
  it("red, green, red for a range", () => {
    const g = sparkGeometry([1, 5, 9], spec({ direction: "range", lsl: 3, usl: 7 }), 100, 40);
    expect(g.bands.map((b) => b.good)).toEqual([false, true, false]);
  });
  it("keeps the band edge in the picture when every reading is on one side", () => {
    const g = sparkGeometry([10, 12], spec({ target: 80 }), 100, 40);
    expect(g.bands.map((b) => b.good)).toEqual([true, false]);
    expect(g.bands[0].h).toBeGreaterThan(0);
  });
  it("draws one reading as one point, and nothing for none", () => {
    expect(sparkGeometry([5], spec(), 100, 40).points).toEqual([{ x: 50, y: 20 }]);
    expect(sparkGeometry([], spec(), 100, 40)).toEqual({ points: [], bands: [] });
    expect(sparkGeometry([NaN], spec(), 100, 40).points).toEqual([]);
  });
});
