// The year change (issue review 2026-11-25, report 1): what each pillar
// and sub-pillar of one year becomes in the next, applied in one Save.
import { describe, expect, it } from "vitest";
import { PeriodSettings, Pillar, Priority, followsOf, objectiveColumns, orgRef, pillarIdIn, pillarsLiveIn } from "../priorities/model";
import { YearChange, cardsOnEnded, carriedCounts, imageOf, planYearChange, readYearChange, targetsFor, yearChangeOutcome, yearChangeProblems, yearRows } from "../priorities/yearChange";

const S: PeriodSettings = { mode: "calendar" };
const pl = (id: string, level: 1 | 2, parentId: string, over: Partial<Pillar> = {}): Pillar => ({ id, name: id, level, parentId, color: "#111111", order: 0, active: true, company: "Co", fromPeriod: "", toPeriod: "", succeedsId: "", ...over });
const pr = (id: string, pillarId: string, over: Partial<Priority> = {}): Priority =>
  ({ id, statement: id, org: orgRef("Co", "Weipa"), pillarId, ownerId: "", ownerName: "", period: "2026", toPeriod: "", plannedEnd: "", status: "active", statusReason: "", parentId: "", primaryInitiativeId: "", order: 0, notes: "", objectives: [], placements: [], ...over }) as Priority;

// 2026: People and safety (safety, workforce) · Operations (ops, finance, fixed)
const base = (): Pillar[] => [
  pl("PS", 1, "", { order: 1 }),
  pl("safety", 2, "PS", { order: 1 }),
  pl("workforce", 2, "PS", { order: 2 }),
  pl("OP", 1, "", { order: 2 }),
  pl("ops", 2, "OP", { order: 1 }),
  pl("finance", 2, "OP", { order: 2 }),
  pl("fixed", 2, "OP", { order: 3 }),
];
const priorities = (): Priority[] => [pr("a", "safety"), pr("b", "workforce"), pr("c", "ops"), pr("d", "finance"), pr("e", "fixed"), pr("f", "fixed", { org: orgRef("Co", "Gove") })];
const change = (choices: YearChange["choices"], added: YearChange["added"] = []): YearChange => ({ company: "Co", from: "2026", to: "2027", choices, added });
let n = 0;
const mint = () => `new${++n}`;
const run = (pillars: Pillar[], c: YearChange, used: string[] = []) => planYearChange(S, pillars, c, new Set(used), mint);
const colIn = (pillars: Pillar[], year: string, p: Priority) => pillarIdIn(S, p, year, pillars);
const cols = (pillars: Pillar[], year: string) => objectiveColumns(pillarsLiveIn(S, pillars, year), null).map((c) => c.name);

describe("the earlier year's structure", () => {
  it("lists each pillar in force with its sub-pillars, in order", () => {
    expect(yearRows(S, base(), "Co", "2026").map((r) => `${r.pillar.id}:${r.subs.map((s) => s.id).join(",")}`)).toEqual(["PS:safety,workforce", "OP:ops,finance,fixed"]);
  });
  it("opens with every row continuing, and saving that changes nothing", () => {
    const c = readYearChange(S, base(), "Co", "2026", "2027");
    expect(Object.values(c.choices).every((x) => x.kind === "continues")).toBe(true);
    const p = run(base(), c);
    expect([p.creates, p.updates, p.ends, p.deletes].map((x) => x.length)).toEqual([0, 0, 0, 0]);
  });
});

describe("a merge: two sub-pillars become one", () => {
  const c = () => change({ ops: { kind: "becomes", target: "N" }, finance: { kind: "becomes", target: "N" } }, [{ id: "N", name: "Operations", level: 2, under: "OP", color: "" }]);
  it("the new one follows BOTH, and every priority under either carries into it", () => {
    const p = run(base(), c());
    const merged = p.pillars.find((x) => x.id === "N")!;
    expect(followsOf(merged).sort()).toEqual(["finance", "ops"]);
    expect(merged.fromPeriod).toBe("2027");
    for (const who of ["c", "d"]) expect(colIn(p.pillars, "2027", priorities().find((x) => x.id === who)!)).toBe("N");
    // the earlier year is as it was
    expect(colIn(p.pillars, "2026", priorities()[2])).toBe("ops");
    expect(colIn(p.pillars, "2026", priorities()[3])).toBe("finance");
    expect(cols(p.pillars, "2026")).toEqual(["safety", "workforce", "ops", "finance", "fixed"]);
    expect(cols(p.pillars, "2027")).toEqual(["safety", "workforce", "fixed", "Operations"]);
  });
  it("writes the new row first, and ends the old rows last", () => {
    const p = run(base(), c());
    expect(p.creates.map((x) => x.id)).toEqual(["N"]);
    expect(p.updates).toEqual([]);
    expect(p.ends.map((x) => x.id).sort()).toEqual(["finance", "ops"]);
    expect(p.ends.every((x) => x.toPeriod === "2026")).toBe(true);
  });
  it("nobody is left without a column", () => {
    const p = run(base(), c());
    expect(yearChangeOutcome(S, base(), p, priorities(), c()).unplaced).toEqual([]);
  });
  it("reads back as it was decided, so it can be put right", () => {
    const p = run(base(), c());
    const again = readYearChange(S, p.pillars, "Co", "2026", "2027");
    expect(again.choices.ops).toEqual({ kind: "becomes", target: "N" });
    expect(again.choices.finance).toEqual({ kind: "becomes", target: "N" });
    expect(again.choices.safety).toEqual({ kind: "continues" });
    // saving what was read changes nothing
    const p2 = run(p.pillars, again);
    expect([p2.creates, p2.updates, p2.ends, p2.deletes].map((x) => x.length)).toEqual([0, 0, 0, 0]);
  });
  it("one of the two taken back out: it continues, and the link goes", () => {
    const p = run(base(), c());
    const again = readYearChange(S, p.pillars, "Co", "2026", "2027");
    again.choices.finance = { kind: "continues" };
    const p2 = run(p.pillars, again);
    expect(followsOf(p2.pillars.find((x) => x.id === "N")!)).toEqual(["ops"]);
    expect(p2.pillars.find((x) => x.id === "finance")!.toPeriod).toBe("");
    expect(colIn(p2.pillars, "2027", priorities()[3])).toBe("finance");
  });
});

describe("a sub-pillar that ends with nothing following", () => {
  const c = change({ fixed: { kind: "ends" } });
  it("lists its priorities, at every org, before the save", () => {
    const p = run(base(), c);
    const out = yearChangeOutcome(S, base(), p, priorities(), c);
    expect(out.unplaced.map((x) => `${x.id}@${x.org.site}`)).toEqual(["e@Weipa", "f@Gove"]);
    expect(out.endedIds).toEqual(["fixed"]);
  });
  it("a priority placed by hand for the later year is not counted lost", () => {
    const moved = pr("e", "ops", { placements: [{ pillarId: "fixed", to: "2026" }] });
    const p = run(base(), c);
    expect(yearChangeOutcome(S, base(), p, [moved], c).unplaced).toEqual([]);
  });
  it("names the boards whose card rotates on it", () => {
    expect(cardsOnEnded([{ board: "Weipa daily", ids: ["fixed", "ops"] }, { board: "Gove weekly", ids: ["fixed"] }, { board: "Other", ids: ["safety"] }], ["fixed"], (id) => id)).toEqual([{ name: "fixed", boards: ["Gove weekly", "Weipa daily"] }]);
    expect(cardsOnEnded([{ board: "Other", ids: ["safety"] }], ["fixed"], (id) => id)).toEqual([]);
  });
});

describe("a pillar that becomes another", () => {
  // People and safety becomes a new pillar; its sub-pillars continue
  const c = () => change({ PS: { kind: "becomes", target: "P2" } }, [{ id: "P2", name: "People first", level: 1, color: "#222222" }]);
  it("its sub-pillars continue under the new pillar, as the same sub-pillars", () => {
    const p = run(base(), c());
    expect(cols(p.pillars, "2027")).toEqual(["ops", "finance", "fixed", "safety", "workforce"]);
    const carry = p.pillars.find((x) => x.name === "safety" && x.fromPeriod === "2027")!;
    expect(carry.parentId).toBe("P2");
    expect(followsOf(carry)).toEqual(["safety"]);
    expect(colIn(p.pillars, "2027", priorities()[0])).toBe(carry.id);
    expect(colIn(p.pillars, "2026", priorities()[0])).toBe("safety");
    expect(followsOf(p.pillars.find((x) => x.id === "P2")!)).toEqual(["PS"]);
  });
  it("reads back as the pillar becoming, and its sub-pillars continuing", () => {
    const p = run(base(), c());
    const again = readYearChange(S, p.pillars, "Co", "2026", "2027");
    expect(again.choices.PS).toEqual({ kind: "becomes", target: "P2" });
    expect(again.choices.safety).toEqual({ kind: "continues" });
    expect(again.choices.workforce).toEqual({ kind: "continues" });
    const p2 = run(p.pillars, again);
    expect([p2.creates, p2.updates, p2.ends, p2.deletes].map((x) => x.length)).toEqual([0, 0, 0, 0]);
  });
  it("taken back: the pillar continues, and the carried rows nobody sits under go", () => {
    const p = run(base(), c());
    const again = readYearChange(S, p.pillars, "Co", "2026", "2027");
    again.choices.PS = { kind: "continues" };
    const p2 = run(p.pillars, again);
    expect(p2.deletes.map((x) => x.name).sort()).toEqual(["safety", "workforce"]);
    expect(p2.pillars.find((x) => x.id === "safety")!.toPeriod).toBe("");
    expect(cols(p2.pillars, "2027").sort()).toEqual(["finance", "fixed", "ops", "safety", "workforce"]);
  });
  it("a carried row a priority was placed under is kept", () => {
    const p = run(base(), c());
    const carry = p.pillars.find((x) => x.name === "safety" && x.fromPeriod === "2027")!;
    const again = readYearChange(S, p.pillars, "Co", "2026", "2027");
    again.choices.PS = { kind: "continues" };
    const p2 = run(p.pillars, again, [carry.id]);
    expect(p2.deletes.map((x) => x.name)).toEqual(["workforce"]);
  });
});

describe("Ben's case: a new pillar whose new sub-pillars are fed from an older pillar's", () => {
  const c = () =>
    change(
      { safety: { kind: "becomes", target: "S2" }, workforce: { kind: "becomes", target: "W2" }, PS: { kind: "ends" } },
      [
        { id: "NP", name: "People", level: 1, color: "#333333" },
        { id: "S2", name: "Safety", level: 2, under: "NP", color: "" },
        { id: "W2", name: "People", level: 2, under: "NP", color: "" },
      ]
    );
  it("the priorities move to the new sub-pillars, under the new pillar", () => {
    const p = run(base(), c());
    expect(yearChangeProblems(S, base(), c())).toEqual([]);
    expect(colIn(p.pillars, "2027", priorities()[0])).toBe("S2");
    expect(colIn(p.pillars, "2027", priorities()[1])).toBe("W2");
    expect(p.pillars.find((x) => x.id === "S2")!.parentId).toBe("NP");
    expect(p.pillars.find((x) => x.id === "S2")!.color).toBe("#333333");
    expect(p.creates.map((x) => x.id)).toEqual(["NP", "S2", "W2"]); // the pillar before its sub-pillars
    expect(yearChangeOutcome(S, base(), p, priorities(), c()).unplaced).toEqual([]);
  });
});

describe("a sub-pillar moved under another pillar", () => {
  it("continues there, and reads back as moved", () => {
    const c = change({ safety: { kind: "continues", under: "OP" } });
    const p = run(base(), c);
    const carry = p.pillars.find((x) => x.name === "safety" && x.fromPeriod === "2027")!;
    expect(carry.parentId).toBe("OP");
    expect(readYearChange(S, p.pillars, "Co", "2026", "2027").choices.safety).toEqual({ kind: "continues", under: "OP" });
  });
});

describe("what stops a save", () => {
  it("a pillar that ends with a sub-pillar still continuing", () => {
    const c = change({ PS: { kind: "ends" } });
    expect(yearChangeProblems(S, base(), c)).toEqual([
      "“safety” continues, but its pillar “PS” ends: choose a pillar for it, or end it.",
      "“workforce” continues, but its pillar “PS” ends: choose a pillar for it, or end it.",
    ]);
  });
  it("a becomes with nothing chosen, and an unfinished new row", () => {
    const c = change({ ops: { kind: "becomes" } }, [{ id: "x", name: " ", level: 2, color: "" }]);
    expect(yearChangeProblems(S, base(), c)).toEqual(["Name the new sub-pillar.", "Choose a pillar for “(unnamed)”.", "Choose what “ops” becomes."]);
  });
});

describe("what a row may become, and what it carries", () => {
  it("offers the rows of its level in the later year, new ones included, never itself", () => {
    const c = change({ fixed: { kind: "ends" } }, [{ id: "N", name: "Operations", level: 2, under: "OP", color: "" }]);
    const ops = base().find((x) => x.id === "ops")!;
    expect(targetsFor(S, base(), c, ops).map((t) => `${t.id}${t.isNew ? "*" : ""}`)).toEqual(["safety", "workforce", "finance", "N*"]);
    expect(targetsFor(S, base(), c, base()[0]).map((t) => t.id)).toEqual(["OP"]);
  });
  it("counts the priorities a row carries, a pillar's as its sub-pillars' together", () => {
    const counts = carriedCounts(S, base(), priorities(), { company: "Co", from: "2026", to: "2027" });
    expect(counts.get("fixed")).toBe(2);
    expect(counts.get("OP")).toBe(4);
    expect(counts.get("PS")).toBe(2);
  });
  it("a priority that ended before the later year is not counted", () => {
    const counts = carriedCounts(S, base(), [pr("z", "ops", { status: "completed", toPeriod: "2026" })], { company: "Co", from: "2026", to: "2027" });
    expect(counts.get("ops")).toBeUndefined();
  });
  it("knows what a pillar is in the later year", () => {
    const c = change({ PS: { kind: "becomes", target: "X" }, OP: { kind: "ends" } });
    expect(imageOf(c, "PS")).toBe("X");
    expect(imageOf(c, "OP")).toBeNull();
    expect(imageOf(c, "other")).toBe("other");
  });
});
