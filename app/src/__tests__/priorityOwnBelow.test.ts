// A priority's own actions and metrics count toward the priority it was
// cascaded from (Ben, 2026-11-24, programme C1). They still show only
// where they were raised.

import { describe, expect, it } from "vitest";
import { newAction, LtkAction } from "../../../shared/schema/actions";
import { priorityKey } from "../../../shared/schema/actionLinks";
import { countsWords, priorityStatus, StatusMetric } from "../improvement/status";
import { orgKey, orgRef, Priority, PriorityAssignment } from "../priorities/model";
import { ownBelow } from "../priorities/ownBelow";

const today = "2026-11-24";
const CO = orgRef("PacOps");
const WEIPA = orgRef("PacOps", "Weipa");
const BSL = orgRef("PacOps", "BSL");
const WEIPA_MINE = orgRef("PacOps", "Weipa", "Mine");

const pr = (id: string, org = CO, over: Partial<Priority> = {}): Priority => ({
  id,
  statement: id,
  org,
  pillarId: "a",
  ownerId: "",
  ownerName: "",
  period: "2026",
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
const act = (id: string, priorityId: string, org: ReturnType<typeof orgRef>, over: Partial<LtkAction> = {}): LtkAction => ({
  ...newAction({ source: "priority", sourceId: "x" }),
  id,
  instanceId: priorityKey(priorityId, orgKey(org)),
  issue: id,
  due: "2026-12-31",
  ...over,
});
const late = { due: "2026-11-01" };
const adopt = (priorityId: string, org: ReturnType<typeof orgRef>, over: Partial<PriorityAssignment> = {}) =>
  ({ priorityId, org, status: "accepted", childPriorityId: "", ...over }) as Pick<PriorityAssignment, "priorityId" | "org" | "status" | "childPriorityId">;
const noMetrics = (): StatusMetric[] => [];

describe("what counts from below a priority", () => {
  const top = pr("top");
  const child = pr("child", WEIPA, { parentId: "top" });

  it("a child row's late action counts, named by its place", () => {
    const below = ownBelow({ p: top, view: CO, all: [top, child], assignments: [], actions: [act("a1", "child", WEIPA, late), act("a2", "child", WEIPA)], metricsOf: noMetrics, today });
    expect(below).toHaveLength(1);
    expect(below[0].place).toBe("Weipa");
    expect(below[0].actions.late).toBe(1);
    expect(below[0].actions.total).toBe(2);
    const st = priorityStatus(["good"], undefined, below);
    expect(st.state).toBe("bad");
    expect(countsWords(st)).toContain("1 late priority action at Weipa");
  });

  it("a child's own metric off plan counts too", () => {
    const below = ownBelow({
      p: top,
      view: CO,
      all: [top, child],
      assignments: [],
      actions: [],
      metricsOf: (x) => (x.id === "child" ? [{ name: "TRIFR", rag: "red" }, { name: "Tonnes", rag: "amber" }, { name: "Cost", rag: "green" }] : []),
      today,
    });
    const st = priorityStatus(["good"], undefined, below);
    expect(st.state).toBe("bad");
    expect(st.own.map((r) => r.text)).toEqual(["TRIFR outside its limits at Weipa", "Tonnes short of plan at Weipa"]);
  });

  it("the same row adopted below: actions raised there count at the org above", () => {
    const actions = [act("a1", "top", WEIPA, late)];
    const assignments = [adopt("top", WEIPA)];
    const atCompany = ownBelow({ p: top, view: CO, all: [top], assignments, actions, metricsOf: noMetrics, today });
    expect(atCompany.map((b) => [b.place, b.actions.late])).toEqual([["Weipa", 1]]);
    // seen AT Weipa it is the priority's own action there, not one from below
    expect(ownBelow({ p: top, view: WEIPA, all: [top], assignments, actions, metricsOf: noMetrics, today })).toEqual([]);
  });

  it("nothing rolls down or sideways", () => {
    const actions = [act("a1", "top", CO, late), act("a2", "top", BSL, late)];
    const assignments = [adopt("top", WEIPA), adopt("top", BSL)];
    // viewed at Weipa: the company's own action and BSL's are not Weipa's
    expect(ownBelow({ p: top, view: WEIPA, all: [top], assignments, actions, metricsOf: noMetrics, today })).toEqual([]);
  });

  it("goes down more than one level, each place named once", () => {
    const grand = pr("grand", WEIPA_MINE, { parentId: "child" });
    const below = ownBelow({
      p: top,
      view: CO,
      all: [top, child, grand],
      assignments: [],
      actions: [act("a1", "child", WEIPA, late), act("a2", "grand", WEIPA_MINE, late), act("a3", "grand", WEIPA_MINE, late)],
      metricsOf: noMetrics,
      today,
    });
    expect(below.map((b) => [b.place, b.actions.late])).toEqual([
      ["Weipa", 1],
      ["Mine", 2],
    ]);
  });

  it("a proposed child, a declined adoption and a customised one do not count", () => {
    const proposed = pr("prop", WEIPA, { parentId: "top", status: "proposed" });
    const actions = [act("a1", "prop", WEIPA, late), act("a2", "top", BSL, late), act("a3", "top", WEIPA, late)];
    const assignments = [adopt("top", BSL, { status: "declined" as PriorityAssignment["status"] }), adopt("top", WEIPA, { childPriorityId: "other" })];
    expect(ownBelow({ p: top, view: CO, all: [top, proposed], assignments, actions, metricsOf: noMetrics, today })).toEqual([]);
  });

  it("on-time work below is on track, and makes a bare priority count", () => {
    const below = ownBelow({ p: top, view: CO, all: [top, child], assignments: [], actions: [act("a1", "child", WEIPA)], metricsOf: noMetrics, today });
    expect(priorityStatus([], undefined, below).state).toBe("good");
    expect(priorityStatus([], undefined, []).state).toBe("none");
  });

  it("its own reasons come first, then each place's", () => {
    const mine = { actions: { total: 1, done: 0, future: 0, late: 1, support: 0 }, metrics: [] };
    const below = [{ place: "Weipa", actions: { total: 2, done: 0, future: 0, late: 2, support: 0 }, metrics: [] }];
    expect(priorityStatus(["good"], mine, below).own.map((r) => r.text)).toEqual(["1 late priority action", "2 late priority actions at Weipa"]);
  });
});
