// A standalone KPI card as good / bad or a status picklist
// (controls/KpiTrendCard/tracking.ts, backlog programme tranche 7, E15,
// 2026-11-27).

import { describe, expect, it } from "vitest";
import { DEFAULT_OPTIONS, GOOD_BAD, optionIndexOf, parseCardTracking, removedStatePoints, statePointsFromCells } from "../../../controls/KpiTrendCard/tracking";

const isReading = (key: string) => key !== "" && !key.startsWith("spec:");

describe("a card's tracking from its settings", () => {
  it("is a number card unless it says otherwise", () => {
    expect(parseCardTracking(undefined, undefined)).toBeNull();
    expect(parseCardTracking("", [])).toBeNull();
    expect(parseCardTracking("value", [{ label: "Running", state: "green" }])).toBeNull();
  });

  it("gives good / bad its fixed pair, whatever options are stored", () => {
    expect(parseCardTracking("goodbad", [{ label: "Running", state: "green" }])).toEqual({ kind: "goodbad", options: GOOD_BAD });
  });

  it("reads a picklist's options, trimmed, one of each name", () => {
    const t = parseCardTracking("picklist", [
      { label: " Running ", state: "green" },
      { label: "Reduced", state: "amber" },
      { label: "running", state: "red" },
      { label: "", state: "red" },
      { label: "Down", state: "purple" },
      "junk",
    ]);
    expect(t?.options).toEqual([
      { label: "Running", state: "green" },
      { label: "Reduced", state: "amber" },
      { label: "Down", state: "green" },
    ]);
  });

  it("starts a picklist with no usable option from the default three", () => {
    expect(parseCardTracking("picklist", undefined)?.options).toEqual(DEFAULT_OPTIONS);
    expect(parseCardTracking("picklist", [{ state: "green" }])?.options).toEqual(DEFAULT_OPTIONS);
  });
});

describe("which option a stored reading is", () => {
  const plant = parseCardTracking("picklist", [
    { label: "Running", state: "green" },
    { label: "Reduced", state: "amber" },
    { label: "Down", state: "red" },
  ])!;
  const audit = parseCardTracking("goodbad", undefined)!;

  it("finds a picklist reading by its label, whatever its case", () => {
    expect(optionIndexOf(plant, "Reduced")).toBe(1);
    expect(optionIndexOf(plant, " down ")).toBe(2);
  });

  it("reads good / bad as words or as 1 and 0", () => {
    expect([optionIndexOf(audit, "Good"), optionIndexOf(audit, "1"), optionIndexOf(audit, "bad"), optionIndexOf(audit, "0")]).toEqual([0, 0, 1, 1]);
  });

  it("is none of them for a number left from before, or an option since removed", () => {
    expect(optionIndexOf(plant, "61")).toBe(-1);
    expect(optionIndexOf(plant, "Idle")).toBe(-1);
    expect(optionIndexOf(plant, "")).toBe(-1);
    expect(optionIndexOf(audit, "2")).toBe(-1);
    // a picklist does NOT read a bare 1 as its second option
    expect(optionIndexOf(plant, "1")).toBe(-1);
  });
});

describe("a state card's readings", () => {
  const t = parseCardTracking("picklist", undefined)!;

  it("are its states in date order, each at its option's place", () => {
    const { points, hidden } = statePointsFromCells(
      [
        { key: "k2", date: "2026-11-16", value: "At risk" },
        { key: "k1", date: "2026-11-09", value: "On track" },
        { key: "k3", date: "2026-11-23", value: "Off track" },
      ],
      t,
      isReading
    );
    expect(points.map((p) => [p.id, p.value, p.label])).toEqual([
      ["k1", 0, "On track"],
      ["k2", 1, "At risk"],
      ["k3", 2, "Off track"],
    ]);
    expect(hidden).toBe(0);
  });

  it("leave out the numbers a card held before it was switched, and count them", () => {
    const { points, hidden } = statePointsFromCells(
      [
        { key: "k1", date: "2026-10-05", value: "61" },
        { key: "k2", date: "2026-10-12", value: "63" },
        { key: "k3", date: "2026-11-09", value: "On track" },
      ],
      t,
      isReading
    );
    expect(points.map((p) => p.id)).toEqual(["k3"]);
    expect(hidden).toBe(2);
  });

  it("are never the plan and limit rows of the grid", () => {
    expect(statePointsFromCells([{ key: "spec:plan", date: "2026-11-09", value: "On track" }], t, isReading).points).toEqual([]);
  });
});

describe("what the card itself may write for a state card", () => {
  it("only removes a reading that was taken off; it never writes a value", () => {
    const prev = [
      { id: "k1", date: "2026-11-09" },
      { id: "k2", date: "2026-11-16" },
    ];
    expect(removedStatePoints(prev, [{ id: "k1" }])).toEqual([{ key: "k2", date: "2026-11-16", shift: "-", value: "" }]);
    expect(removedStatePoints(prev, prev)).toEqual([]);
  });
});
