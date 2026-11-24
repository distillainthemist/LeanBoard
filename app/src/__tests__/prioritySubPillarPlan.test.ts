// A priority's sub-pillar, asked year by year (2026-11-18): the start
// year always; a later year only when the choice cannot carry into it.
import { describe, expect, it } from "vitest";
import { followCandidates, lastSetUpYear, picksOf, Pillar, pillarIdIn, placementsFromRows, PeriodSettings, subPillarPlan } from "../priorities/model";

const S: PeriodSettings = { mode: "calendar" };
const pl = (id: string, level: 1 | 2, parentId: string, fromPeriod = "", toPeriod = "", succeedsId = ""): Pillar => ({ id, name: id, level, parentId, color: "", order: 0, active: true, company: "Co", fromPeriod, toPeriod, succeedsId });
const pillars: Pillar[] = [
  pl("L1", 1, ""),
  pl("stays", 2, "L1"), // in force throughout
  pl("ends", 2, "L1", "", "2026"), // ends, nothing follows
  pl("old", 2, "L1", "", "2026"), // ends, ONE follows
  pl("new", 2, "L1", "2027", "", "old"),
  pl("brand", 2, "L1", "2027"), // new in 2027, follows nothing
  pl("late", 2, "L1", "2029"), // the set changes again in 2029
];
const plan = (start: string, until: string, picks: Record<string, string>) => subPillarPlan(S, pillars, start, until, picks);
const years = (r: ReturnType<typeof plan>) => r.rows.map((x) => `${x.year}:${x.pillarId || "?"}${x.forced ? "!" : ""}`);

describe("the latest year the pillars change in", () => {
  it("is the last start, or the year after the last end", () => {
    expect(lastSetUpYear(S, pillars)).toBe("2029");
    expect(lastSetUpYear(S, pillars.slice(0, 3))).toBe("2027"); // "ends" ends in 2026
    expect(lastSetUpYear(S, pillars.slice(0, 2))).toBe("");
  });
});

describe("the sub-pillar rows of the priority form", () => {
  it("asks for the start year first, and nothing else until that is answered", () => {
    const r = plan("2026", "2029", {});
    expect(years(r)).toEqual(["2026:?"]);
    expect(r.complete).toBe(false);
    expect(r.rows[0].options.map((x) => x.id)).toEqual(["ends", "old", "stays"]);
  });
  it("asks nothing more for a sub-pillar in force throughout", () => {
    const r = plan("2026", "2029", { "2026": "stays" });
    expect(years(r)).toEqual(["2026:stays"]);
    expect(r.complete).toBe(true);
  });
  it("carries silently into the one sub-pillar that follows", () => {
    const r = plan("2026", "2029", { "2026": "old" });
    expect(years(r)).toEqual(["2026:old"]);
    expect(r.complete).toBe(true);
  });
  it("asks again in the year the sub-pillar ends with nothing following it", () => {
    const r = plan("2026", "2029", { "2026": "ends" });
    expect(years(r)).toEqual(["2026:ends", "2027:?!"]);
    expect(r.complete).toBe(false);
    expect(r.rows[1].options.map((x) => x.id)).toEqual(["brand", "new", "stays"]);
    expect(plan("2026", "2029", { "2026": "ends", "2027": "brand" }).complete).toBe(true);
  });
  it("looks no further than asked: a priority that ends in 2026 is never asked about 2027", () => {
    expect(years(plan("2026", "2026", { "2026": "ends" }))).toEqual(["2026:ends"]);
  });
  it("keeps a move the person chose to make, unforced", () => {
    const r = plan("2026", "2029", { "2026": "stays", "2028": "brand" });
    expect(years(r)).toEqual(["2026:stays", "2028:brand"]);
    expect(r.complete).toBe(true);
  });
  it("drops a pick that is not in force that year", () => {
    expect(years(plan("2026", "2029", { "2026": "brand" }))).toEqual(["2026:?"]);
    expect(years(plan("2026", "2029", { "2026": "ends", "2027": "ends" }))).toEqual(["2026:ends", "2027:?!"]);
  });
  it("starts where the priority starts", () => {
    expect(plan("2027", "2029", {}).rows[0].options.map((x) => x.id)).toEqual(["brand", "new", "stays"]);
  });
});

describe("the rows as the record keeps them", () => {
  it("is one home when nothing breaks", () => {
    expect(placementsFromRows(S, [{ year: "2026", pillarId: "old" }])).toEqual({ pillarId: "old", placements: [] });
  });
  it("records the earlier home up to the year before each change", () => {
    expect(placementsFromRows(S, [{ year: "2026", pillarId: "ends" }, { year: "2027", pillarId: "brand" }, { year: "2029", pillarId: "late" }])).toEqual({
      pillarId: "late",
      placements: [{ pillarId: "ends", to: "2026" }, { pillarId: "brand", to: "2028" }],
    });
  });
  it("drops a row that changes nothing, and reads back as it was chosen", () => {
    const saved = placementsFromRows(S, [{ year: "2026", pillarId: "ends" }, { year: "2027", pillarId: "brand" }]);
    const p = { ...saved, period: "2026" };
    expect(pillarIdIn(S, p, "2026", pillars)).toBe("ends");
    expect(pillarIdIn(S, p, "2027", pillars)).toBe("brand");
    expect(pillarIdIn(S, p, "2030", pillars)).toBe("brand");
    expect(placementsFromRows(S, [{ year: "2026", pillarId: "stays" }, { year: "2027", pillarId: "stays" }]).placements).toEqual([]);
  });
  it("opens a saved priority with the picks it was saved from", () => {
    const saved = placementsFromRows(S, [{ year: "2026", pillarId: "ends" }, { year: "2027", pillarId: "brand" }]);
    expect(picksOf(S, { ...saved, period: "2026" }, pillars)).toEqual({ "2026": "ends", "2027": "brand" });
    expect(picksOf(S, { pillarId: "old", placements: [], period: "2026" }, pillars)).toEqual({ "2026": "old" });
    // one saved under "old" that now starts in 2027 opens on the follower
    expect(picksOf(S, { pillarId: "old", placements: [], period: "2027" }, pillars)).toEqual({ "2027": "new" });
    expect(picksOf(S, { pillarId: "", placements: [], period: "2026" }, pillars)).toEqual({});
  });
});

describe("what a new sub-pillar may follow", () => {
  const byId = (id: string) => pillars.find((x) => x.id === id)!;
  it("is a sub-pillar that ended the year before it starts and that nothing follows yet", () => {
    // "brand" starts in 2027: "ends" ended in 2026 and is free; "old" is already followed by "new"
    expect(followCandidates(S, pillars, byId("brand")).map((x) => x.id)).toEqual(["ends"]);
  });
  it("always includes the one it follows now", () => {
    expect(followCandidates(S, pillars, byId("new")).map((x) => x.id)).toEqual(["ends", "old"]);
  });
  it("is nothing for a sub-pillar with no start year, a pillar, or one starting where none ended", () => {
    expect(followCandidates(S, pillars, byId("stays"))).toEqual([]);
    expect(followCandidates(S, pillars, byId("L1"))).toEqual([]);
    expect(followCandidates(S, pillars, byId("late"))).toEqual([]);
  });
  it("then carries the priorities over: one follows one", () => {
    const linked = pillars.map((x) => (x.id === "brand" ? { ...x, succeedsId: "ends" } : x));
    const r = subPillarPlan(S, linked, "2026", "2029", { "2026": "ends" });
    expect(r.rows.map((x) => x.year)).toEqual(["2026"]);
    expect(r.complete).toBe(true);
  });
});

