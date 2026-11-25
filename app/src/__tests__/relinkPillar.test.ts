// A re-parented priority takes its new parent's sub-pillar, and so does
// everything made from it (programme D9, 2026-11-25).

import { describe, expect, it } from "vitest";
import { DEFAULT_PRIORITY_SETTINGS, orgRef, Priority } from "../priorities/model";
import { relinkPillarPlan, relinkPillarWords } from "../priorities/relinkPillar";

const S = DEFAULT_PRIORITY_SETTINGS.period;
const pr = (id: string, over: Partial<Priority> = {}): Priority => ({
  id,
  statement: id,
  org: orgRef("PacOps", "Weipa"),
  pillarId: "a",
  ownerId: "",
  ownerName: "",
  period: "2025",
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

describe("the sub-pillar a re-parented priority takes", () => {
  const parent = pr("parent", { org: orgRef("PacOps"), pillarId: "b" });
  const child = pr("child");
  const kid = pr("kid", { parentId: "child" });
  const grandkid = pr("grandkid", { parentId: "kid", pillarId: "b" });
  const other = pr("other");
  const all = [parent, child, kid, grandkid, other];

  it("moves the linked priority and everything made from it, from the year in view", () => {
    const plan = relinkPillarPlan(S, child, parent, all, "2026");
    expect(plan.pillarId).toBe("b");
    expect(plan.child).toEqual({ priority: child, pillarId: "b", placements: [{ pillarId: "a", to: "2025" }] });
    // the kid moves; the grandkid is there already; an unrelated priority is not touched
    expect(plan.below.map((m) => m.priority.id)).toEqual(["kid"]);
    expect(plan.below[0].placements).toEqual([{ pillarId: "a", to: "2025" }]);
  });

  it("is nothing when the parent has no sub-pillar, or the family is there already", () => {
    expect(relinkPillarPlan(S, child, pr("bare", { pillarId: "" }), all, "2026")).toEqual({ pillarId: "", child: null, below: [] });
    const same = relinkPillarPlan(S, pr("c2", { pillarId: "b" }), parent, [parent], "2026");
    expect([same.child, same.below]).toEqual([null, []]);
  });

  it("reads the parent's sub-pillar in the year in view", () => {
    // the parent sat under "a" through 2025 and under "b" from 2026
    const moved = pr("parent2", { pillarId: "b", placements: [{ pillarId: "a", to: "2025" }] });
    expect(relinkPillarPlan(S, child, moved, [moved, child], "2025").child).toBeNull(); // both under "a" in 2025
    expect(relinkPillarPlan(S, child, moved, [moved, child], "2026").pillarId).toBe("b");
  });

  it("says what will move", () => {
    expect(relinkPillarWords(relinkPillarPlan(S, child, parent, all, "2026"), "Asset Reliability")).toBe("It moves to Asset Reliability. 1 priority made from it moves with it.");
    expect(relinkPillarWords(relinkPillarPlan(S, other, parent, all, "2026"), "Asset Reliability")).toBe("It moves to Asset Reliability.");
    const onlyBelow = relinkPillarPlan(S, pr("c3", { pillarId: "b" }), parent, [parent, pr("k3", { parentId: "c3" }), pr("k4", { parentId: "c3" })], "2026");
    expect(relinkPillarWords(onlyBelow, "Asset Reliability")).toBe("2 priorities made from it move to Asset Reliability.");
    expect(relinkPillarWords({ pillarId: "", child: null, below: [] }, "x")).toBe("");
  });
});
