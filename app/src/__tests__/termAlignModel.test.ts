import { describe, expect, it } from "vitest";
import { OrgSyncPlan } from "../docs/model";
import { OrphanDecision, createsAfterPairings, decisionCounts, pairableCreates, pathsToRetire, verdictFor } from "../docs/termAlignModel";

const plan = (over: Partial<OrgSyncPlan> = {}): OrgSyncPlan => ({ creates: [], matches: [], renames: [], orphans: [], orphanTerms: [], retiredTerms: [], matched: 3, error: "", ...over });

describe("cutover decisions", () => {
  it("offers only sibling creates as pairings", () => {
    const p = plan({ creates: [["Bell Bay", "Casthouse"], ["Bell Bay", "Anodes"], ["Boyne", "Casthouse"], ["Bell Bay", "Casthouse", "Line 1"]] });
    expect(pairableCreates(p, ["Bell Bay", "Casting"]).map((c) => c.join("/"))).toEqual(["Bell Bay/Casthouse", "Bell Bay/Anodes"]);
    expect(pairableCreates(p, ["Kurri", "Casting"])).toEqual([]);
  });
  it("drops a claimed create and counts the decisions", () => {
    const p = plan({ creates: [["Bell Bay", "Casthouse"], ["Bell Bay", "Anodes"]] });
    const d = new Map<string, OrphanDecision>([["b", { kind: "pair", path: ["Bell Bay", "Casthouse"] }], ["c", { kind: "retire" }], ["e", { kind: "leave" }]]);
    expect(createsAfterPairings(p, d)).toEqual([["Bell Bay", "Anodes"]]);
    expect(decisionCounts(d)).toEqual({ pair: 1, retire: 1 });
  });
});

describe("verdict", () => {
  it("is aligned only when nothing is left and nothing failed; retired terms do not count", () => {
    expect(verdictFor(plan({ retiredTerms: [{ id: "x", labels: ["Old"] }] }), 0)).toEqual({ aligned: true, lines: ["✓ Aligned — 3 terms bound, 1 retired."] });
    const v = verdictFor(plan({ creates: [["A"]], orphanTerms: [{ id: "z", labels: ["Stray"] }] }), 1);
    expect(v.aligned).toBe(false);
    expect(v.lines.length).toBe(3);
    expect(v.lines[0]).toMatch(/1 step failed/);
    expect(v.lines[2]).toMatch(/Stray/);
    expect(verdictFor(plan(), 0, true).aligned).toBe(false);
    expect(verdictFor(plan({ error: "x" }), 0).lines[0]).toMatch(/Cannot compare/);
  });
});

describe("pathsToRetire (write-through)", () => {
  it("retires a removed path's bound term and what was bound under it, never a path that is back", () => {
    const bindings = { "bell bay": "a", "bell bay¦casting": "b", "bell bay¦casting¦line 1": "c", "bell bay¦anodes": "d" };
    const live = [["Bell Bay"], ["Bell Bay", "Anodes"]];
    expect(pathsToRetire([["Bell Bay", "Casting"]], live, bindings)).toEqual([{ termId: "b", label: "Casting" }, { termId: "c", label: "line 1" }]);
    // removed then re-added before the save: nothing retires
    expect(pathsToRetire([["Bell Bay", "Anodes"]], live, bindings)).toEqual([]);
    // never bound: nothing to retire (the report lists it as unknown)
    expect(pathsToRetire([["Bell Bay", "Stray"]], live, bindings)).toEqual([]);
  });
});
