import { describe, expect, it } from "vitest";
import {
  ALL_MAX_DAYS,
  GANTT_PRESETS,
  addDaysIso,
  dayNum,
  ganttTicks,
  ganttWindow,
  isGanttRange,
  isoOfDay,
  pageStep,
  spanOf,
  weekdayOf,
} from "../improvement/ganttWindow";

const day = (iso: string): number => dayNum(iso) as number;

describe("the Gantt's days", () => {
  it("counts calendar days, whatever the clock did", () => {
    // New Zealand's clocks go back on 2026-04-05 and forward on 2026-09-27:
    // a 24-hour step from local midnight names the wrong day across either
    expect(addDaysIso("2026-04-04", 1)).toBe("2026-04-05");
    expect(addDaysIso("2026-04-05", 1)).toBe("2026-04-06");
    expect(addDaysIso("2026-09-26", 2)).toBe("2026-09-28");
    expect(day("2027-04-05") - day("2026-04-05")).toBe(365);
    expect(isoOfDay(day("2026-11-12"))).toBe("2026-11-12");
    expect(weekdayOf(day("2026-11-12"))).toBe(4); // a Thursday
  });

  it("reads only dates", () => {
    expect(dayNum("")).toBeNull();
    expect(dayNum("soon")).toBeNull();
    expect(spanOf(["", "nope"])).toBeNull();
    expect(spanOf(["2026-03-01", "", "2026-01-15", "2026-02-01"])).toEqual({ min: day("2026-01-15"), max: day("2026-03-01") });
  });
});

describe("the Gantt's window", () => {
  const today = day("2026-11-12");

  it("offers 26 and 52 weeks and all, past the old thirteen", () => {
    expect(GANTT_PRESETS.map((p) => p.label)).toEqual(["2w", "4w", "8w", "13w", "26w", "52w", "All"]);
    expect(isGanttRange(52)).toBe(true);
    expect(isGanttRange("all")).toBe(true);
    expect(isGanttRange(5)).toBe(false);
    expect(isGanttRange("52")).toBe(false);
  });

  it("centres a week count on its anchor", () => {
    const w = ganttWindow(4, today, null, today, 1000);
    expect(w.days).toBe(28);
    expect(isoOfDay(w.start)).toBe("2026-10-29");
    expect(isoOfDay(w.start + w.days - 1)).toBe("2026-11-25");
    expect(w.months).toBe(false);
    const year = ganttWindow(52, today, null, today, 1000);
    expect(year.days).toBe(364);
    expect(year.months).toBe(true);
    expect(year.start + 182).toBe(today);
  });

  it("narrows the long windows to the plot rather than scroll, never under two pixels a day", () => {
    expect(ganttWindow(52, today, null, today, 1400).dayW).toBe(3);
    expect(ganttWindow(52, today, null, today, 770).dayW).toBe(2.1);
    expect(ganttWindow(52, today, null, today, 300).dayW).toBe(2);
    expect(ganttWindow(26, today, null, today, 770).dayW).toBe(4.2);
    expect(ganttWindow(26, today, null, today, 0).dayW).toBe(5);
    // the short windows keep their scale and scroll
    expect(ganttWindow(13, today, null, today, 300).dayW).toBe(9);
  });

  it("moves half a window at a time, in whole weeks", () => {
    expect([2, 4, 8, 13, 26, 52].map(pageStep)).toEqual([7, 14, 28, 42, 91, 182]);
    expect(pageStep("all")).toBe(0);
    const next = ganttWindow(26, today + pageStep(26), null, today, 1000);
    expect(next.start - ganttWindow(26, today, null, today, 1000).start).toBe(91);
  });

  it("fits every action, today included, in whole weeks", () => {
    const span = spanOf(["2026-12-01", "2027-06-18"]);
    const w = ganttWindow("all", today, span, today, 1100);
    expect(w.start).toBeLessThanOrEqual(today - 3);
    expect(weekdayOf(w.start)).toBe(1);
    expect(weekdayOf(w.start + w.days - 1)).toBe(0);
    expect(w.start + w.days - 1).toBeGreaterThanOrEqual(day("2027-06-18") + 3);
    expect(w.days * w.dayW).toBeLessThanOrEqual(1100);
    expect(w.days * w.dayW).toBeGreaterThan(1100 - w.days * 0.1 - 1);
    expect(w.clipped).toBe(false);
  });

  it("reaches back for work that started before today", () => {
    const w = ganttWindow("all", today, spanOf(["2026-02-02", "2026-03-01"]), today, 1000);
    expect(w.start).toBeLessThanOrEqual(day("2026-02-02") - 3);
    expect(w.start + w.days - 1).toBeGreaterThanOrEqual(today + 3);
  });

  it("widens a short plan no further than the two-week view, and never under two weeks", () => {
    const w = ganttWindow("all", today, spanOf(["2026-11-12"]), today, 4000);
    expect(w.days).toBe(14);
    expect(w.dayW).toBe(44);
    expect(w.months).toBe(false);
  });

  it("falls back to four weeks when nothing has a date", () => {
    expect(ganttWindow("all", today, null, today, 1000)).toEqual(ganttWindow(4, today, null, today, 1000));
  });

  it("clips a plan longer than three years and keeps today in view", () => {
    const w = ganttWindow("all", today, spanOf(["2020-01-01", "2032-01-01"]), today, 1000);
    expect(w.clipped).toBe(true);
    expect(w.days).toBe(ALL_MAX_DAYS);
    expect(w.dayW).toBe(2);
    expect(w.start).toBeLessThanOrEqual(today - 182);
    expect(w.start).toBeGreaterThan(today - 190);
    const late = ganttWindow("all", today, spanOf(["2020-01-01", "2026-11-01"]), today, 1000);
    expect(late.start + late.days - 1).toBeGreaterThanOrEqual(today);
  });
});

describe("the Gantt's header", () => {
  const today = day("2026-11-12");

  it("ticks every Monday while a week has room for its date", () => {
    const w = ganttWindow(4, today, null, today, 1000);
    expect(ganttTicks(w).map((t) => isoOfDay(t.day))).toEqual(["2026-11-02", "2026-11-09", "2026-11-16", "2026-11-23"]);
  });

  it("names months on the long windows, the year on the first and on each January", () => {
    const w = ganttWindow(52, today, null, today, 1000);
    const ticks = ganttTicks(w);
    expect(isoOfDay(w.start)).toBe("2026-05-14");
    // 14 May leaves no room for "May" before June starts
    expect(isoOfDay(ticks[0].day)).toBe("2026-06-01");
    expect(ticks[0].year).toBe(true);
    const jan = ticks.find((t) => isoOfDay(t.day) === "2027-01-01");
    expect(jan?.year).toBe(true);
    expect(ticks.filter((t) => t.year).length).toBe(2);
    expect(ticks.every((t) => t.offset === t.day - w.start)).toBe(true);
    expect(ticks.length).toBe(12);
  });

  it("opens on the window's own first day when its month has the room", () => {
    const w = ganttWindow(26, day("2026-11-01"), null, today, 1000);
    const ticks = ganttTicks(w);
    expect(isoOfDay(w.start)).toBe("2026-08-02");
    expect(ticks[0].offset).toBe(0);
    expect(ticks[0].year).toBe(true);
    expect(isoOfDay(ticks[1].day)).toBe("2026-09-01");
  });
});
