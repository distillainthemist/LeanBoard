// A priority's primary initiative and its objectives, as they count now
// (issues 1, 6 and 8, 2026-11-16).

import { describe, expect, it } from "vitest";
import { livePrimaryId, objectiveValues, parseObjectives, parsePlacements, stalePrimary } from "../priorities/model";
import { orgInTree } from "../priorities/dialogs";
import { ownersLabel, ownersTitle } from "../improvement/initiativeModel";

const p = { id: "pr-1", primaryInitiativeId: "in-1" };
const init = (id: string, status: string, linked: string[], title = id) => ({ id, title, status, priorities: linked.map((priorityId) => ({ priorityId })) });

describe("the primary initiative that counts", () => {
  it("counts an active, linked primary", () => {
    expect(livePrimaryId(p, [init("in-1", "active", ["pr-1"])])).toBe("in-1");
  });

  it("keeps a completed primary headlining", () => {
    expect(livePrimaryId(p, [init("in-1", "completed", ["pr-1"])])).toBe("in-1");
    expect(stalePrimary(p, [init("in-1", "completed", ["pr-1"])])).toBeNull();
  });

  it("drops an archived primary and says why", () => {
    const list = [init("in-1", "archived", ["pr-1"], "Contractor rituals")];
    expect(livePrimaryId(p, list)).toBe("");
    expect(stalePrimary(p, list)).toEqual({ id: "in-1", title: "Contractor rituals", why: "archived" });
  });

  it("drops a primary that is no longer linked to this priority", () => {
    const list = [init("in-1", "active", ["pr-2"], "Moved elsewhere")];
    expect(livePrimaryId(p, list)).toBe("");
    expect(stalePrimary(p, list)?.why).toBe("unlinked");
  });

  it("drops a primary that no longer exists", () => {
    expect(livePrimaryId(p, [])).toBe("");
    expect(stalePrimary(p, [])).toEqual({ id: "in-1", title: "", why: "gone" });
  });

  it("has nothing to say for a priority with no primary", () => {
    const none = { id: "pr-1", primaryInitiativeId: "" };
    expect(livePrimaryId(none, [init("in-1", "active", ["pr-1"])])).toBe("");
    expect(stalePrimary(none, [])).toBeNull();
  });
});

describe("a priority's objectives", () => {
  const values: Record<string, { key: string; starred: boolean; name: string }[]> = {
    "in-1": [
      { key: "m1", starred: true, name: "LTI rate" },
      { key: "m2", starred: false, name: "Audits done" },
    ],
    "in-2": [{ key: "m9", starred: false, name: "Forum attendance" }],
  };
  const valuesOf = (id: string) => values[id] ?? [];
  const picks = { objectives: [{ initiativeId: "in-2", metricKey: "m9" }, { initiativeId: "in-1", metricKey: "m2" }, { initiativeId: "in-3", metricKey: "x" }] };

  it("are the live primary's starred metrics", () => {
    expect(objectiveValues(picks, "in-1", valuesOf, () => true).map((v) => v.name)).toEqual(["LTI rate"]);
  });

  it("are the picked metrics when there is no primary, in the order picked", () => {
    expect(objectiveValues(picks, "", valuesOf, () => true).map((v) => v.name)).toEqual(["Forum attendance", "Audits done"]);
  });

  it("drop a pick whose initiative is no longer under the priority", () => {
    expect(objectiveValues(picks, "", valuesOf, (id) => id !== "in-2").map((v) => v.name)).toEqual(["Audits done"]);
  });

  it("are none with no primary and nothing picked", () => {
    expect(objectiveValues({ objectives: [] }, "", valuesOf, () => true)).toEqual([]);
  });

  it("read the stored picks defensively", () => {
    expect(parseObjectives('[{"initiativeId":"in-1","metricKey":"m1"},{"initiativeId":"in-1","metricKey":"m1"},{"initiativeId":"","metricKey":"m"},7]')).toEqual([{ initiativeId: "in-1", metricKey: "m1" }]);
    expect(parseObjectives("not json")).toEqual([]);
    expect(parseObjectives(undefined)).toEqual([]);
    expect(parsePlacements('[{"pillarId":"p2","to":"FY26"},{"pillarId":"","to":"FY25"}]')).toEqual([{ pillarId: "p2", to: "FY26" }]);
  });
});

describe("an initiative's owners", () => {
  const who = (...names: string[]) => ({ roles: { owner: names.map((n, i) => ({ whoId: `u${i}`, who: n })) } });

  it("names every owner, not the first alone", () => {
    expect(ownersLabel(who("Vallance, Colin", "Williams, Thomas"))).toBe("Vallance, Colin & Williams, Thomas");
  });

  it("counts the rest past two, and keeps them for the tooltip", () => {
    const i = who("Vallance, Colin", "Williams, Thomas", "Clegg, Tammy", "Jukes, Emily");
    expect(ownersLabel(i)).toBe("Vallance, Colin & Williams, Thomas +2");
    expect(ownersTitle(i)).toBe("Vallance, Colin; Williams, Thomas; Clegg, Tammy; Jukes, Emily");
  });

  it("is empty with no owner", () => {
    expect(ownersLabel({ roles: {} })).toBe("");
  });
});

describe("a remembered organisation", () => {
  const tree = { companies: [{ name: "Pechey", sites: [{ name: "Bendigo", departments: [{ name: "Packaging", areas: ["Line 2"] }] }] }] };
  const org = (company: string, site = "", department = "", area = "") => ({ company, site, department, area });

  it("is used while the tree still has it, at any level", () => {
    expect(orgInTree(tree, org("Pechey"))).toBe(true);
    expect(orgInTree(tree, org("Pechey", "Bendigo"))).toBe(true);
    expect(orgInTree(tree, org("Pechey", "Bendigo", "Packaging", "Line 2"))).toBe(true);
  });

  it("is dropped when its site, department or area has gone", () => {
    expect(orgInTree(tree, org("Other"))).toBe(false);
    expect(orgInTree(tree, org("Pechey", "Geelong"))).toBe(false);
    expect(orgInTree(tree, org("Pechey", "Bendigo", "Stores"))).toBe(false);
    expect(orgInTree(tree, org("Pechey", "Bendigo", "Packaging", "Line 9"))).toBe(false);
  });
});
