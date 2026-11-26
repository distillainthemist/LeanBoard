// How much of a metric's history is read, and what its trend chart shows.

import { describe, expect, it } from "vitest";
import { chartWindow, READ_FROM_START, readFrom } from "../improvement/readWindow";

describe("how far back a metric's readings are read", () => {
  const today = "2026-11-22";
  it("six months for a shift or daily metric", () => {
    expect(readFrom(today, "daily")).toBe("2026-05-22");
    expect(readFrom(today, "shiftly")).toBe("2026-05-22");
  });
  it("two years for a weekly metric, five for a monthly one", () => {
    expect(readFrom(today, "weekly")).toBe("2024-11-22");
    expect(readFrom(today, "monthly")).toBe("2021-11-22");
  });
  it("everything for an annual metric", () => {
    expect(readFrom(today, "annually")).toBe(READ_FROM_START);
  });
  it("walks by calendar fields across a month end and a daylight-saving change", () => {
    expect(readFrom("2026-08-31", "daily")).toBe("2026-03-03"); // 31 February rolls forward
    expect(readFrom("2026-10-04", "daily")).toBe("2026-04-04");
  });
});

describe("what the Metrics card's chart reads", () => {
  const today = "2026-11-22";
  const page = { from: "2026-09-07", to: "2026-12-06" };
  // Yield on dev: eleven weekly readings, 6 July to 14 September
  const yieldDates = ["2026-07-06", "2026-07-13", "2026-07-20", "2026-07-27", "2026-08-03", "2026-08-10", "2026-08-17", "2026-08-24", "2026-08-31", "2026-09-07", "2026-09-14"];
  it("no readings: the page around today", () => {
    expect(chartWindow(today, "weekly", [], page)).toEqual({ from: page.from, to: page.to, asOf: "" });
  });
  it("fewer than twelve readings: one empty period before the first, and still ends at today", () => {
    expect(chartWindow(today, "weekly", yieldDates, page)).toEqual({ from: "2026-06-29", to: page.to, asOf: "" });
  });
  it("a yearly metric with one reading in 2026 starts at 2025, not at the page's 2022 (report 24)", () => {
    expect(chartWindow(today, "annually", ["2026-03-10"], { from: "2022-01-01", to: "2026-12-31" })).toEqual({ from: "2025-01-01", to: "2026-12-31", asOf: "" });
  });
  it("a plan value typed ahead of the first actual is not cut off", () => {
    const p5 = { from: "2022-01-01", to: "2026-12-31" };
    expect(chartWindow(today, "annually", ["2026-03-10"], p5, ["2024-01-01", "2025-01-01", "2026-03-10", "2027-01-01"]).from).toBe("2023-01-01");
    // plans entered only after the first actual change nothing
    expect(chartWindow(today, "annually", ["2026-03-10"], p5, ["2027-01-01"]).from).toBe("2025-01-01");
  });
  it("twelve readings exactly: the twelfth-last, unchanged", () => {
    const twelve = [...yieldDates, "2026-09-21"];
    expect(chartWindow(today, "weekly", twelve, page)).toEqual({ from: "2026-07-06", to: page.to, asOf: "" });
  });
  it("takes the twelfth-last reading, not the first, when there are more", () => {
    const many = Array.from({ length: 30 }, (_, i) => `2026-${String(Math.floor(i / 4) + 3).padStart(2, "0")}-${String((i % 4) * 7 + 2).padStart(2, "0")}`);
    const w = chartWindow(today, "weekly", many, page);
    const twelfth = [...many].sort()[many.length - 12];
    expect(w.asOf).toBe("");
    expect(w.from <= twelfth).toBe(true);
    expect(w.from > [...many].sort()[many.length - 14]).toBe(true);
  });
  it("a few readings inside the page: the axis starts one period before them, not at the page's start", () => {
    expect(chartWindow(today, "weekly", ["2026-11-02", "2026-11-09", "2026-11-16"], page)).toEqual({ from: "2026-10-26", to: page.to, asOf: "" });
  });
  it("a last reading more than thirteen periods old: the chart opens on the readings and says when", () => {
    const old = ["2026-01-05", "2026-01-12", "2026-01-19"];
    expect(chartWindow(today, "weekly", old, page)).toEqual({ from: "2025-12-29", to: "2026-01-25", asOf: "2026-01-19" });
  });
  it("thirteen periods old is still drawn through to today", () => {
    // 2026-08-17's week + 13 weeks = 2026-11-16, today's week: not stale
    expect(chartWindow(today, "weekly", ["2026-08-17"], page).asOf).toBe("");
    expect(chartWindow(today, "weekly", ["2026-08-10"], page).asOf).toBe("2026-08-10");
  });
  it("reads dates in any order and ignores what is not a date", () => {
    expect(chartWindow(today, "weekly", ["2026-09-14", "", "2026-07-06", "n/a"], page).from).toBe("2026-06-29");
  });
});
