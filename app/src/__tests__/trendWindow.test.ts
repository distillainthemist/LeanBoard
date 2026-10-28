// The trend chart's time window (Ben, 2026-10-28): a floor per cadence,
// the current period always in view, history beyond the floor in full.

import { describe, expect, it } from "vitest";
import { TREND_FLOOR, trendTickLabel, trendWindow } from "../../../shared/schema/buckets";

describe("trendWindow", () => {
  it("a monthly card with two readings shows twelve months ending now", () => {
    const w = trendWindow(["2026-10-01", "2026-11-01"], "monthly", "2026-10-28");
    expect(w.buckets).toHaveLength(12);
    expect(w.from).toBe("2025-12-01");
    expect(w.to).toBe("2026-11-01"); // a reading ahead of today extends the end
    expect(w.labelEvery).toBe(1);
  });

  it("the floors: daily 28, weekly 13, monthly 12, annually 5", () => {
    expect(TREND_FLOOR).toEqual({ shiftly: 28, daily: 28, weekly: 13, monthly: 12, annually: 5 });
    expect(trendWindow([], "daily", "2026-10-28").buckets).toHaveLength(28);
    expect(trendWindow([], "weekly", "2026-10-28").buckets).toHaveLength(13);
    expect(trendWindow([], "annually", "2026-10-28").buckets.map((b) => b.slice(0, 4))).toEqual(["2022", "2023", "2024", "2025", "2026"]);
  });

  it("history beyond the floor shows in full, with thinned labels", () => {
    const w = trendWindow(["2024-01-15"], "monthly", "2026-10-28");
    expect(w.from).toBe("2024-01-01");
    expect(w.buckets).toHaveLength(34);
    expect(w.labelEvery).toBe(3);
    // an absurd year cannot walk the chart forever
    expect(trendWindow(["1900-01-01"], "monthly", "2026-10-28").buckets.length).toBeLessThanOrEqual(400);
  });

  it("mid-bucket dates snap to their bucket start; a weekly window starts on a Monday", () => {
    const w = trendWindow(["2026-10-14"], "weekly", "2026-10-28");
    expect(w.to).toBe("2026-10-26");
    expect(w.from).toBe("2026-08-03");
    expect(w.labelEvery).toBe(2);
  });

  it("tick labels read by cadence", () => {
    expect(trendTickLabel("2026-10-01", "monthly")).toBe("Oct");
    expect(trendTickLabel("2027-01-01", "monthly")).toBe("Jan 27");
    expect(trendTickLabel("2026-10-26", "weekly")).toBe("26 Oct");
    expect(trendTickLabel("2026-10-26", "daily")).toBe("26 Oct");
    expect(trendTickLabel("2026-01-01", "annually")).toBe("2026");
  });
});
