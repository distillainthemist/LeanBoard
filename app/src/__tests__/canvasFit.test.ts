// A tile's canvas scale (controls/CanvasCard/fit.ts): the largest scale
// that fits, never under the floor.
import { describe, expect, it } from "vitest";
import { TILE_SCALE_FLOOR, fitScale } from "../../../controls/CanvasCard/fit";

// a grid whose text unwraps as it is widened: at scale k the grid is
// 1/k as wide, so wrapped text is k times as tall, over a fixed part
const grid = (fixed: number, text: number) => (k: number) => fixed + text * k;

describe("a tile's canvas scale", () => {
  it("leaves a grid that fits alone, and never asks twice", () => {
    let asks = 0;
    expect(fitScale(500, () => (asks++, 400))).toBe(1);
    expect(asks).toBe(1);
    expect(fitScale(0, () => 400)).toBe(1);
  });
  it("finds a larger scale than one measurement gives, because widening unwraps the text", () => {
    const needAt = grid(200, 500); // 700 at full size
    const single = 500 / 700; // 0.714 — under the floor
    const k = fitScale(500, needAt);
    expect(k).toBeGreaterThan(single);
    expect(k).toBeGreaterThanOrEqual(TILE_SCALE_FLOOR);
    expect(needAt(k) * k).toBeLessThanOrEqual(500);
    // and close to the best there is: 200k + 500k² = 500 → k ≈ 0.820
    expect(k).toBeGreaterThan(0.8);
  });
  it("is the single measurement when nothing unwraps", () => {
    const k = fitScale(450, () => 500);
    expect(k).toBeGreaterThanOrEqual(0.89);
    expect(k).toBeLessThanOrEqual(0.9);
  });
  it("stops at the floor and lets the rest clip", () => {
    expect(fitScale(300, () => 1000)).toBe(TILE_SCALE_FLOOR);
    expect(fitScale(300, grid(600, 600))).toBe(TILE_SCALE_FLOOR);
  });
});
