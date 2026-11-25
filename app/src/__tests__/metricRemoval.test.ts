// Removing a metric takes its readings with it (programme C8, 2026-11-24).

import { describe, expect, it } from "vitest";
import { hasOwnReadings, removedForGood, removeDriverMetricWords, removeMetricWords } from "../improvement/metricRemoval";

const own = (key: string): { key: string; name: string; driverId?: string; driverLink?: "drives" | "leads" } => ({ key, name: key });
const driver = (key: string, driverLink?: "drives" | "leads") => ({ key, name: key, driverId: "d1", ...(driverLink ? { driverLink } : {}) });

describe("which metrics keep readings of their own", () => {
  it("an own metric does; one that IS a value driver does not; one that leads a driver does", () => {
    expect(hasOwnReadings(own("a"))).toBe(true);
    expect(hasOwnReadings(driver("b"))).toBe(false);
    expect(hasOwnReadings(driver("b", "drives"))).toBe(false);
    expect(hasOwnReadings(driver("c", "leads"))).toBe(true);
  });
});

describe("the question", () => {
  it("counts the readings", () => {
    expect(removeMetricWords("Scrap rate", 14)).toEqual({ title: "Remove Scrap rate and its 14 readings?", note: "This cannot be undone." });
    expect(removeMetricWords("Scrap rate", 1).title).toBe("Remove Scrap rate and its 1 reading?");
    expect(removeMetricWords("  ", 3).title).toBe("Remove this metric and its 3 readings?");
  });
  it("is still asked when the readings could not be counted", () => {
    expect(removeMetricWords("Scrap rate", -1)).toEqual({ title: "Remove Scrap rate and its readings?", note: "Its readings could not be counted. This cannot be undone." });
  });
});

describe("the question for a metric that is a value driver", () => {
  it("says its readings are kept", () => {
    expect(removeDriverMetricWords("Scrap rate", "initiative")).toEqual({ title: "Remove Scrap rate from this initiative?", note: "Its readings belong to the value driver and are kept." });
    expect(removeDriverMetricWords("", "priority").title).toBe("Remove this metric from this priority?");
  });
});

describe("what a save removed for good", () => {
  it("is what was taken off and is not on the list now", () => {
    expect(removedForGood([own("a"), own("b")], [own("b"), own("c")]).map((m) => m.key)).toEqual(["a"]);
  });
  it("a metric added back under the same name keeps its readings", () => {
    expect(removedForGood([own("a")], [own("a")])).toEqual([]);
  });
  it("never a value driver's series, and each metric once", () => {
    expect(removedForGood([driver("d"), own("a"), own("a"), driver("l", "leads")], []).map((m) => m.key)).toEqual(["a", "l"]);
  });
  it("nothing taken off, nothing removed", () => {
    expect(removedForGood([], [own("a")])).toEqual([]);
  });
});
