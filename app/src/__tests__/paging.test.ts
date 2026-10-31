// shared/schema/paging.ts — the Users register's pages (2026-11-01).
import { describe, expect, it } from "vitest";
import { pageCount, pageLabel, pageSlice } from "../../../shared/schema/paging";

describe("paging", () => {
  const items = Array.from({ length: 312 }, (_, i) => i + 1);
  it("counts pages and slices them, clamping a page past the end", () => {
    expect(pageCount(312, 50)).toBe(7);
    expect(pageCount(0, 50)).toBe(0);
    expect(pageCount(50, 50)).toBe(1);
    expect(pageSlice(items, 0, 50)).toEqual(items.slice(0, 50));
    expect(pageSlice(items, 6, 50)).toEqual(items.slice(300));
    expect(pageSlice(items, 99, 50)).toEqual(items.slice(300));
    expect(pageSlice(items, -3, 50)).toEqual(items.slice(0, 50));
    expect(pageSlice(items, 2, 0)).toBe(items);
  });
  it("labels the range", () => {
    expect(pageLabel(312, 0, 50)).toBe("1–50 of 312");
    expect(pageLabel(312, 6, 50)).toBe("301–312 of 312");
    expect(pageLabel(312, 40, 50)).toBe("301–312 of 312");
    expect(pageLabel(0, 0, 50)).toBe("");
  });
});
