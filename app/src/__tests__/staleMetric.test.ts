// A stale metric: more than five working days after the end of a period
// with no reading in it or since (programme D1, 2026-11-25).

import { describe, expect, it } from "vitest";
import { isStale, overduePeriod, staleWords, workingDaysAfter } from "../improvement/staleMetric";

describe("working days", () => {
  it("counts Monday to Friday after a day, up to and including the end", () => {
    // Sun 16 Nov 2026 → Fri 20 Nov: Mon..Fri = 5
    expect(workingDaysAfter("2026-11-15", "2026-11-20")).toBe(5);
    // → Mon 23 Nov: 6
    expect(workingDaysAfter("2026-11-15", "2026-11-23")).toBe(6);
    // a weekend adds nothing
    expect(workingDaysAfter("2026-11-20", "2026-11-22")).toBe(0);
    expect(workingDaysAfter("2026-11-20", "2026-11-20")).toBe(0);
    expect(workingDaysAfter("2026-11-20", "2026-11-10")).toBe(0);
    // four whole weeks
    expect(workingDaysAfter("2026-11-01", "2026-11-29")).toBe(20);
  });
  it("holds across a daylight-saving change", () => {
    // Auckland's clocks move on 27 Sep 2026 and 5 Apr 2026
    expect(workingDaysAfter("2026-09-25", "2026-10-02")).toBe(5);
    expect(workingDaysAfter("2026-04-03", "2026-04-10")).toBe(5);
  });
});

describe("the period whose reading is overdue", () => {
  it("monthly: last month's, from the sixth working day of this month", () => {
    // Oct 2026 ends Sat 31 Oct. Working days after: Mon 2 .. Fri 6 Nov = 5; Mon 9 Nov = 6.
    expect(overduePeriod("monthly", "2026-11-06")).toEqual({ from: "2026-09-01", to: "2026-09-30" });
    expect(overduePeriod("monthly", "2026-11-09")).toEqual({ from: "2026-10-01", to: "2026-10-31" });
  });
  it("weekly: the week that ended more than five working days ago", () => {
    // week Mon 9 – Sun 15 Nov; on Fri 20 Nov it is 5 working days past, on Mon 23 it is 6
    expect(overduePeriod("weekly", "2026-11-20")).toEqual({ from: "2026-11-02", to: "2026-11-08" });
    expect(overduePeriod("weekly", "2026-11-23")).toEqual({ from: "2026-11-09", to: "2026-11-15" });
  });
  it("daily: the day more than five working days back", () => {
    // Mon 23 Nov: Fri 13 Nov is 6 working days back (16,17,18,19,20,23)
    expect(overduePeriod("daily", "2026-11-23")).toEqual({ from: "2026-11-15", to: "2026-11-15" });
  });
  it("annually: last year's, from the sixth working day of January", () => {
    // 31 Dec 2026 is a Thursday: Fri 1, Mon 4 .. Thu 7 Jan are five working days
    expect(overduePeriod("annually", "2027-01-07")).toEqual({ from: "2025-01-01", to: "2025-12-31" });
    expect(overduePeriod("annually", "2027-01-08")).toEqual({ from: "2026-01-01", to: "2026-12-31" });
  });
});

describe("is it stale", () => {
  it("a monthly metric has five working days into the month for last month's reading", () => {
    // newest reading is September's
    expect(isStale("2026-09-30", "monthly", "2026-11-06")).toBe(false); // October's is not overdue yet
    expect(isStale("2026-09-30", "monthly", "2026-11-09")).toBe(true);
    // October's reading is in: not stale
    expect(isStale("2026-10-15", "monthly", "2026-11-09")).toBe(false);
    // and one entered in November already covers it too
    expect(isStale("2026-11-02", "monthly", "2026-11-09")).toBe(false);
  });
  it("a weekly metric has until the following Friday", () => {
    // newest reading in the week of 2–8 Nov; the week of 9–15 Nov is due by Fri 20
    expect(isStale("2026-11-05", "weekly", "2026-11-20")).toBe(false);
    expect(isStale("2026-11-05", "weekly", "2026-11-23")).toBe(true);
    expect(isStale("2026-11-12", "weekly", "2026-11-23")).toBe(false);
  });
  it("a metric never read is not stale", () => {
    expect(isStale("", "weekly", "2026-11-23")).toBe(false);
  });
});

describe("the mark", () => {
  it("says how long since the newest reading", () => {
    expect(staleWords("2026-09-21", "weekly", "2026-11-23")).toBe("No reading for 9 weeks");
    expect(staleWords("2026-11-12", "daily", "2026-11-23")).toBe("No reading for 11 days");
    expect(staleWords("2026-06-30", "monthly", "2026-11-23")).toBe("No reading for 4 months");
    expect(staleWords("2024-06-30", "annually", "2026-11-23")).toBe("No reading for 2 years");
  });
  it("is empty while the metric is current", () => {
    expect(staleWords("2026-11-18", "weekly", "2026-11-23")).toBe("");
    expect(staleWords("", "weekly", "2026-11-23")).toBe("");
  });
});
