// An action tile's "+N more" (controls/ActionBoard/tileFit.ts).
import { describe, expect, it } from "vitest";
import { tileShown } from "../../../controls/ActionBoard/tileFit";

describe("what an action tile's column shows", () => {
  it("shows everything that fits, with no line", () => {
    expect(tileShown([], 400, 26)).toBe(0);
    expect(tileShown([100, 200, 300], 400, 26)).toBe(3);
    // the last card may reach the limit itself: the line is not needed
    expect(tileShown([100, 200, 400], 400, 26)).toBe(3);
  });
  it("cuts where the line still fits", () => {
    // 5 cards of 100: the tile ends at 420 → four fit, but the line needs 26
    expect(tileShown([100, 200, 300, 400, 500], 420, 26)).toBe(3);
    expect(tileShown([100, 200, 300, 400, 500], 430, 26)).toBe(4);
  });
  it("never shows fewer than one card", () => {
    expect(tileShown([900, 1000], 400, 26)).toBe(1);
  });
});
