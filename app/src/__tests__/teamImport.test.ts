// The team import planner (shared/schema/teamImport.ts, 2026-10-31).
import { describe, expect, it } from "vitest";
import { DirectoryPerson, labelKey, planImport, summarize, WalkResult } from "../../../shared/schema/teamImport";

const p = (id: string, name: string, managerId: string, depth: number, over: Partial<DirectoryPerson> = {}): DirectoryPerson => ({
  id, name, mail: `${id}@x.com`, jobTitle: "", department: "", officeLocation: "", accountEnabled: true, userType: "Member", managerId, depth, ...over,
});
const site = { site: "Bell Bay", departments: [{ department: "Casting", areas: ["Line 1", "Line 2"] }, { department: "Reduction", areas: [] }, { department: "Services", areas: [] }] };
const owners = { site: { whoId: "gm" }, departments: { Casting: { whoId: "cast" }, Reduction: { whoId: "red" } }, areas: { "Casting/Line 2": { whoId: "l2" } } };
const walk: WalkResult = {
  rootIds: ["gm"],
  truncated: false,
  people: [
    p("gm", "Grace", "", 0),
    p("cast", "Carl", "gm", 1),
    p("red", "Rita", "gm", 1),
    p("l2", "Lena", "cast", 2),
    p("w1", "Wes", "l2", 3),
    p("w2", "Wanda", "cast", 2),
    p("svc", "Sam", "gm", 1, { department: "Services" }),
    p("fin", "Fay", "gm", 1, { department: "Finance", officeLocation: "Boyne" }),
    p("bot", "Scanner", "cast", 2, { mail: "" }),
    p("gone", "Gus", "cast", 2, { accountEnabled: false }),
    p("vis", "Vik", "cast", 2, { userType: "Guest" }),
    p("dot", "Dot", "red", 2),
  ],
};
const sites = ["Bell Bay", "Boyne"];

describe("labelKey", () => {
  it("is blind to case, ampersands, dashes and spaces", () => {
    expect(labelKey("Casting ＆  Rolling")).toBe("casting & rolling");
    expect(labelKey("Line‑1")).toBe("line-1");
  });
});

describe("planImport", () => {
  const rows = planImport(walk, [], site, owners, sites);
  const row = (id: string) => rows.find((r) => r.whoId === id)!;
  it("places people from the owners' subtrees, the nearer owner first, areas from area owners", () => {
    expect(row("w2").proposedDepartment).toBe("Casting");
    expect(row("w2").placedBy).toBe("owner");
    expect(row("w1").proposedDepartment).toBe("Casting");
    expect(row("w1").proposedArea).toBe("Line 2");
    expect(row("l2").proposedArea).toBe("Line 2"); // the area owner is in their own area
    expect(row("cast").proposedDepartment).toBe("Casting"); // the owner is in their own department
    expect(row("dot").proposedDepartment).toBe("Reduction");
    expect(row("gm").proposedDepartment).toBe("");
    expect(row("gm").placedBy).toBe("none");
  });
  it("falls back to the Entra label, blind to case", () => {
    expect(row("svc").proposedDepartment).toBe("Services");
    expect(row("svc").placedBy).toBe("label");
    expect(row("fin").proposedDepartment).toBe("");
  });
  it("flags and unticks the accounts that are not people of this site", () => {
    expect(row("bot").flags).toContain("noMail");
    expect(row("bot").include).toBe(false);
    expect(row("gone").flags).toContain("disabled");
    expect(row("vis").flags).toContain("guest");
    expect(row("fin").flags).toContain("outsideSite");
    expect(row("fin").include).toBe(false);
    expect(row("w1").include).toBe(true);
    expect(row("w1").via).toEqual(["Grace", "Carl", "Lena"]);
  });
  it("marks a deep row without excluding it", () => {
    const deep: WalkResult = { rootIds: ["a"], truncated: false, people: [p("a", "A", "", 0), p("b", "B", "a", 7)] };
    const r = planImport(deep, [], site, owners, sites).find((x) => x.whoId === "b")!;
    expect(r.flags).toEqual(["deep"]);
    expect(r.include).toBe(true);
  });
  it("notes a person under two department owners, the nearer one placing them", () => {
    // Rita (Reduction's owner) reports to Carl (Casting's owner): Dot under Rita is Reduction, flagged
    const nested: WalkResult = { rootIds: ["gm"], truncated: false, people: [p("gm", "Grace", "", 0), p("cast", "Carl", "gm", 1), p("red", "Rita", "cast", 2), p("dot", "Dot", "red", 3)] };
    const r = planImport(nested, [], site, owners, sites).find((x) => x.whoId === "dot")!;
    expect(r.proposedDepartment).toBe("Reduction");
    expect(r.flags).toContain("twoOwners");
    expect(r.include).toBe(true);
  });
  it("re-runs safely: already here is skipped, another site is unticked, revoked is never resurrected", () => {
    const roster = [
      { whoId: "w2", site: "Bell Bay", active: true },
      { whoId: "w1", site: "bell bay", active: true },
      { whoId: "dot", site: "Boyne", active: true },
      { whoId: "svc", site: "Bell Bay", active: false },
    ];
    const again = planImport(walk, roster, site, owners, sites);
    const r = (id: string) => again.find((x) => x.whoId === id)!;
    expect(r("w2").flags).toContain("onRoster");
    expect(r("w2").include).toBe(false);
    expect(r("w1").flags).toContain("onRoster"); // site compared blind to case
    expect(r("dot").flags).toContain("otherSite");
    expect(r("dot").include).toBe(false);
    expect(r("dot").rosterSite).toBe("Boyne");
    expect(r("svc").flags).toContain("revoked");
    expect(r("svc").include).toBe(false);
    const s = summarize(again);
    expect(s.alreadyHere).toBe(2);
    expect(s.otherSite).toBe(1);
    expect(s.toMove).toBe(0);
    // ticking the other-site row makes it a move
    r("dot").include = true;
    expect(summarize(again).toMove).toBe(1);
    expect(s.total).toBe(12);
  });
  it("orders by depth then name and survives a manager cycle", () => {
    expect(rows.slice(0, 1).map((r) => r.name)).toEqual(["Grace"]);
    const loop: WalkResult = { rootIds: ["a"], truncated: false, people: [p("a", "A", "b", 0), p("b", "B", "a", 1)] };
    expect(planImport(loop, [], site, owners, sites).length).toBe(2);
  });
});

describe("summarize", () => {
  it("counts to add, skipped and the rest", () => {
    const s = summarize(planImport(walk, [], site, owners, sites));
    expect(s.total).toBe(12);
    expect(s.skipped).toBe(4); // bot, gone, vis, fin
    expect(s.toAdd).toBe(8);
  });
});
