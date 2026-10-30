// The BoardGrid's phone list (mobile review M2): the wall's tiles in
// reading order — row by row, left to right — whatever order they were
// placed in, and the width that flips the wall into a list.

import { describe, expect, it } from "vitest";
import { BoardTile, LIST_MAX_WIDTH, layoutBoard, listOrder } from "../../../controls/BoardGrid/types";

const tile = (cardId: string, pos: number, w = 1, h = 1): BoardTile => ({
  pos, cardId, cardType: "StatusTile", title: cardId, svg: "", w, h, barColor: "", nav: 0,
});

describe("listOrder", () => {
  it("reads the wall row by row, left to right", () => {
    // a 3-wide wall: A at 1, C at 3, B at 2 (placed out of order), D on row 2
    const lay = layoutBoard([tile("A", 1), tile("C", 3), tile("B", 2), tile("D", 4)], 3, false);
    expect(listOrder(lay.placed).map((p) => p.tile.cardId)).toEqual(["A", "B", "C", "D"]);
  });
  it("keeps a stretched tile at its anchor's place", () => {
    // W spans two columns from cell 1; X lands at cell 3; Y on the next row
    const lay = layoutBoard([tile("X", 3), tile("W", 1, 2, 1), tile("Y", 4)], 3, false);
    expect(listOrder(lay.placed).map((p) => p.tile.cardId)).toEqual(["W", "X", "Y"]);
  });
  it("leaves the input untouched", () => {
    const lay = layoutBoard([tile("B", 2), tile("A", 1)], 2, false);
    const before = lay.placed.map((p) => p.tile.cardId);
    listOrder(lay.placed);
    expect(lay.placed.map((p) => p.tile.cardId)).toEqual(before);
  });
  it("flips to a list under the same width the register uses", () => {
    expect(LIST_MAX_WIDTH).toBe(600);
  });
});

// The adaptive live stage (card-responsiveness-review-2026-10-30, R0):
// the slot's shape, the width clamped, and the readability floor that
// lists a wall before its tiles become thumbnails.
import { LIVE_STAGE_MAX_W, LIVE_STAGE_MIN_H, LIVE_STAGE_MIN_W, LIVE_TILE_H, LIVE_TILE_W, liveStageFor, wantsList } from "../../../controls/BoardGrid/types";

describe("liveStageFor", () => {
  it("renders a slot inside the clamp at natural size, in its own shape", () => {
    expect(liveStageFor(640, 360)).toEqual({ w: 640, h: 360, k: 1, left: 0 });
    // a wall slot just under the clamp: a 480 stage in the slot's shape,
    // bound by its height after rounding, all but centred
    const wall = liveStageFor(459, 300);
    expect(wall.w).toBe(480);
    expect(wall.h).toBe(314);
    expect(wall.k).toBeCloseTo(Math.min(459 / 480, 300 / 314), 4);
    expect(wall.left).toBeCloseTo((459 - 480 * wall.k) / 2, 1);
    const laptop = liveStageFor(284, 240);
    expect(laptop.w).toBe(LIVE_STAGE_MIN_W);
    expect(laptop.h).toBe(Math.round((480 * 240) / 284));
    expect(laptop.k).toBeCloseTo(Math.min(284 / 480, 240 / laptop.h), 4); // bound by the rounded height
  });
  it("grows from the widest stage on a huge slot, and falls back to the fixed stage without a size", () => {
    const wall = liveStageFor(1600, 800);
    expect(wall.w).toBe(LIVE_STAGE_MAX_W);
    expect(wall.h).toBe(560);
    expect(wall.k).toBeCloseTo(1600 / 1120, 4);
    expect(liveStageFor(0, 0)).toEqual({ w: LIVE_TILE_W, h: LIVE_TILE_H, k: 1, left: 0 });
  });
  it("keeps a minimum height: a short slot scales the card down to fit and centres it", () => {
    // a five-by-four wall on a 1900 px screen: slots about 370 × 150
    const short = liveStageFor(370, 150);
    expect(short.w).toBe(LIVE_STAGE_MIN_W);
    expect(short.h).toBe(LIVE_STAGE_MIN_H);
    expect(short.k).toBeCloseTo(0.5, 3);
    expect(short.left).toBeCloseTo((370 - 480 * 0.5) / 2, 1);
    // a wide short slot grows sideways but still shows the whole height
    const wide = liveStageFor(960, 250);
    expect(wide.w).toBe(960);
    expect(wide.h).toBe(LIVE_STAGE_MIN_H);
    expect(wide.k).toBeCloseTo(250 / 300, 3);
  });
});

describe("wantsList", () => {
  it("lists under the phone width, and when a column's slot would scale under the floor", () => {
    expect(wantsList(375, 3)).toBe(true);
    expect(wantsList(900, 3)).toBe(false); // 300 px slots → k 0.625
    expect(wantsList(840, 3)).toBe(true); // 280 px slots → k 0.58
    expect(wantsList(1366, 4)).toBe(false);
    expect(wantsList(1100, 4)).toBe(true); // 275 px slots
    expect(wantsList(0, 3)).toBe(false);
  });
});
