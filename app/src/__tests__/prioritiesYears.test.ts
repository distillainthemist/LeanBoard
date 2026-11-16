// Pillars per year and proposed priorities (issues 4 and 13, 2026-11-16).

import { describe, expect, it } from "vitest";
import {
  canApproveAt,
  canManageOrg,
  countedDescendants,
  DECLINED_PREFIX,
  effectiveEnd,
  groupByColumn,
  isDeclined,
  isPriorityStatus,
  isPulledProposal,
  liveThen,
  moveFrom,
  orgKey,
  orgRef,
  parentClosed,
  Pillar,
  pillarIdIn,
  pillarUse,
  pillarVersions,
  placedIn,
  Priority,
  spreadOf,
  DEFAULT_PRIORITY_SETTINGS,
} from "../priorities/model";

const settings = { ...DEFAULT_PRIORITY_SETTINGS.period, mode: "custom" as const, labels: ["FY24", "FY25", "FY26", "FY27", "FY28"] };
const site = orgRef("Pechey", "Bendigo");

const pillar = (id: string, over: Partial<Pillar> = {}): Pillar => ({ id, name: id, level: 2, parentId: "top", color: "", order: 1, active: true, company: "Pechey", fromPeriod: "", toPeriod: "", ...over });
const pr = (id: string, over: Partial<Priority> = {}): Priority => ({
  id,
  statement: id,
  org: site,
  pillarId: "a",
  ownerId: "",
  ownerName: "",
  period: "FY25",
  toPeriod: "",
  plannedEnd: "",
  status: "active",
  statusReason: "",
  parentId: "",
  primaryInitiativeId: "",
  order: 0,
  notes: "",
  objectives: [],
  placements: [],
  ...over,
});

describe("a priority's sub-pillar, year by year", () => {
  const pillars = [pillar("a"), pillar("b")];

  it("is its current home when it has never moved", () => {
    expect(pillarIdIn(settings, pr("p"), "FY26", pillars)).toBe("a");
  });

  it("keeps the earlier years under the home they had", () => {
    const p = pr("p", { pillarId: "b", placements: [{ pillarId: "a", to: "FY26" }] });
    expect(placedIn(settings, p, "FY25")).toBe("a");
    expect(placedIn(settings, p, "FY26")).toBe("a");
    expect(placedIn(settings, p, "FY27")).toBe("b");
    expect(pillarIdIn(settings, p, "FY28", pillars)).toBe("b");
  });

  it("moves from a year: that year and later change, the years before stand", () => {
    const moved = moveFrom(settings, pr("p"), "FY27", "b");
    expect(moved).toEqual({ pillarId: "b", placements: [{ pillarId: "a", to: "FY26" }] });
    const p = pr("p", moved);
    expect(placedIn(settings, p, "FY26")).toBe("a");
    expect(placedIn(settings, p, "FY27")).toBe("b");
  });

  it("moves twice: each era keeps its own home", () => {
    const first = pr("p", moveFrom(settings, pr("p"), "FY26", "b"));
    const second = pr("p", moveFrom(settings, first, "FY28", "c"));
    expect(second.placements).toEqual([
      { pillarId: "a", to: "FY25" },
      { pillarId: "b", to: "FY27" },
    ]);
    expect(["FY25", "FY26", "FY27", "FY28"].map((y) => placedIn(settings, second, y))).toEqual(["a", "b", "b", "c"]);
  });

  it("a move from an EARLIER year replaces what was recorded after it", () => {
    const later = pr("p", { pillarId: "c", placements: [{ pillarId: "a", to: "FY25" }, { pillarId: "b", to: "FY27" }] });
    const redo = moveFrom(settings, later, "FY26", "d");
    expect(redo).toEqual({ pillarId: "d", placements: [{ pillarId: "a", to: "FY25" }] });
  });

  it("is a plain change of home with no earlier year to keep", () => {
    expect(moveFrom(settings, pr("p"), "FY24", "b")).toEqual({ pillarId: "b", placements: [] });
  });

  it("groups the matrix by the home of the year in view", () => {
    const p = pr("p", { pillarId: "b", placements: [{ pillarId: "a", to: "FY26" }] });
    const at = (year: string) => groupByColumn(pillars, [p], (x) => pillarIdIn(settings, x, year, pillars));
    expect(at("FY26").byColumn.get("a")).toEqual([p]);
    expect(at("FY27").byColumn.get("b")).toEqual([p]);
    expect(at("FY27").unplaced).toEqual([]);
  });
});

describe("a pillar renamed from a year", () => {
  // "Safety" ran to FY26; from FY27 it is "People and Safety First"
  const old = pillar("s1", { name: "Safety", toPeriod: "FY26" });
  const next = pillar("s2", { name: "People and Safety First", fromPeriod: "FY27", succeedsId: "s1" });
  const pillars = [old, next, pillar("x")];

  it("links its versions either way round", () => {
    expect(pillarVersions("s1", pillars).map((p) => p.id).sort()).toEqual(["s1", "s2"]);
    expect(pillarVersions("s2", pillars).map((p) => p.id).sort()).toEqual(["s1", "s2"]);
    expect(pillarVersions("x", pillars).map((p) => p.id)).toEqual(["x"]);
  });

  it("carries a priority into whichever version is in force, with no write to the priority", () => {
    const p = pr("p", { pillarId: "s1" });
    expect(pillarIdIn(settings, p, "FY26", pillars)).toBe("s1");
    expect(pillarIdIn(settings, p, "FY27", pillars)).toBe("s2");
    const q = pr("q", { pillarId: "s2", period: "FY25" });
    expect(pillarIdIn(settings, q, "FY25", pillars)).toBe("s1");
  });

  it("leaves a priority under an ended pillar with no successor to be shown as unplaced", () => {
    const ended = [pillar("e", { toPeriod: "FY25" })];
    expect(pillarIdIn(settings, pr("p", { pillarId: "e" }), "FY27", ended)).toBe("e");
  });

  it("counts every priority that ever sat under a row", () => {
    const list = [pr("p1", { pillarId: "s1" }), pr("p2", { pillarId: "x", placements: [{ pillarId: "s1", to: "FY25" }] }), pr("p3", { pillarId: "x" })];
    expect(pillarUse("s1", list)).toBe(2);
    expect(pillarUse("x", list)).toBe(2);
    expect(pillarUse("zz", list)).toBe(0);
  });
});

describe("a past year is a record", () => {
  it("shows what was live then, whatever has happened since", () => {
    const done = pr("p", { status: "completed", period: "FY25", toPeriod: "FY26" });
    expect(liveThen(settings, done, "FY25")).toBe(true);
    expect(liveThen(settings, done, "FY26")).toBe(true);
    expect(liveThen(settings, done, "FY27")).toBe(false);
  });

  it("never shows a proposal or a declined one", () => {
    expect(liveThen(settings, pr("p", { status: "proposed" }), "FY25")).toBe(false);
    expect(liveThen(settings, pr("p", { status: "archived", statusReason: `${DECLINED_PREFIX}not this year`, toPeriod: "FY25" }), "FY25")).toBe(false);
  });
});

describe("proposed priorities", () => {
  const owners = { [orgKey(site)]: [{ whoId: "owner", who: "Owner" }] };
  const viewer = (over: Record<string, unknown>) => ({ whoId: "x", who: "X", role: "user", site: "Bendigo", ...over }) as never;

  it("is a status the store accepts", () => {
    expect(isPriorityStatus("proposed")).toBe(true);
  });

  it("lets the owner and admins approve, and a direct report only propose", () => {
    expect(canApproveAt(viewer({ whoId: "owner" }), site, owners)).toBe(true);
    expect(canApproveAt(viewer({ role: "superadmin" }), site, owners)).toBe(true);
    expect(canApproveAt(viewer({ role: "siteadmin" }), site, owners)).toBe(true);
    expect(canApproveAt(viewer({ role: "siteadmin", site: "Geelong" }), site, owners)).toBe(false);
    const report = viewer({ whoId: "report", managerId: "owner" });
    expect(canManageOrg(report, site, owners)).toBe(true);
    expect(canApproveAt(report, site, owners)).toBe(false);
    expect(canApproveAt(viewer({ whoId: "stranger" }), site, owners)).toBe(false);
  });

  it("has not ended: a proposal with no end is open", () => {
    expect(effectiveEnd({ status: "proposed", period: "FY26", toPeriod: "" })).toBe("");
    expect(effectiveEnd({ status: "archived", period: "FY26", toPeriod: "" })).toBe("FY26");
  });

  it("does not count toward its parent, nor does anything under it", () => {
    const top = pr("top");
    const live = pr("live", { parentId: "top" });
    const prop = pr("prop", { parentId: "top", status: "proposed" });
    const under = pr("under", { parentId: "prop" });
    expect(countedDescendants(top, [top, live, prop, under]).map((p) => p.id)).toEqual(["live"]);
  });

  it("is not a closed parent", () => {
    const parent = pr("parent", { status: "proposed" });
    const child = pr("child", { parentId: "parent" });
    expect(parentClosed(child, [parent, child])).toBeNull();
    parent.status = "completed";
    expect(parentClosed(child, [parent, child])?.id).toBe("parent");
  });

  it("tells a pull waiting for approval from a cascade sent from above", () => {
    expect(isPulledProposal({ status: "proposed", decidedById: "report" })).toBe(true);
    expect(isPulledProposal({ status: "proposed", decidedById: "" })).toBe(false);
    expect(isPulledProposal({ status: "accepted", decidedById: "owner" })).toBe(false);
  });

  it("counts what an accepted priority has spread to, for the question before it goes back", () => {
    const p = pr("top");
    const all = [p, pr("copy1", { parentId: "top" }), pr("copy2", { parentId: "top" }), pr("other", { parentId: "elsewhere" })];
    const a = (status: string, childPriorityId = "", priorityId = "top") => ({ priorityId, status: status as never, childPriorityId });
    expect(spreadOf(p, all, [a("accepted"), a("accepted"), a("accepted", "copy1"), a("proposed"), a("onhold"), a("rejected"), a("accepted", "", "other")])).toEqual({ adopted: 2, customised: 2, waiting: 2 });
    expect(spreadOf(p, [p], [])).toEqual({ adopted: 0, customised: 0, waiting: 0 });
  });

  it("keeps a declined proposal on record, marked", () => {
    expect(isDeclined({ status: "archived", statusReason: `${DECLINED_PREFIX}covered elsewhere` })).toBe(true);
    expect(isDeclined({ status: "archived", statusReason: "Superseded" })).toBe(false);
    expect(isDeclined({ status: "proposed", statusReason: "" })).toBe(false);
  });
});
