import { describe, it, expect } from "vitest";
import { docSiteVerdict, scopedSite, siteBranchOf, taskInSite } from "../docs/siteScope";

// Company › Site › Department › Area, as the Organisation set is walked
const nodes = [
  { id: "c1", labels: ["Pechey"] },
  { id: "s1", labels: ["Pechey", "North"] },
  { id: "d1", labels: ["Pechey", "North", "Maintenance"] },
  { id: "a1", labels: ["Pechey", "North", "Maintenance", "Workshop"] },
  { id: "s2", labels: ["Pechey", "South"] },
  { id: "d2", labels: ["Pechey", "South", "Maintenance"] },
  { id: "d3", labels: ["Pechey", "South", "North"] }, // a department named like a site
  { id: "d4", labels: ["Pechey", "South", "Casting"] },
];

describe("a controller sees their own site (2026-11-23)", () => {
  it("only a controller who is not a super admin, with a site, is scoped", () => {
    expect(scopedSite({ isController: true, isSuper: false, site: " North " })).toBe("North");
    expect(scopedSite({ isController: true, isSuper: true, site: "North" })).toBe("");
    expect(scopedSite({ isController: false, isSuper: false, site: "North" })).toBe("");
    expect(scopedSite({ isController: true, isSuper: false, site: "" })).toBe("");
  });

  it("the site's branch is its own term (the shallowest match) and all beneath", () => {
    const b = siteBranchOf("north", nodes)!;
    expect([...b.ids].sort()).toEqual(["a1", "d1", "s1"]);
    expect(b.labels.has("workshop")).toBe(true);
    expect(b.ids.has("d3")).toBe(false);
    // a site the set does not know: nothing can be judged
    expect(siteBranchOf("West", nodes)).toBeNull();
    expect(siteBranchOf("", nodes)).toBeNull();
  });

  it("a document is placed by its term ids; one with no Organisation unit is nobody's", () => {
    const b = siteBranchOf("North", nodes)!;
    expect(docSiteVerdict("", [], b)).toBe("none");
    expect(docSiteVerdict("Maintenance", ["{D1}"], b)).toBe("mine");
    // the same label at the other site: the id decides
    expect(docSiteVerdict("Maintenance", ["d2"], b)).toBe("other");
    // on two sites at once: mine
    expect(docSiteVerdict("Casting; Workshop", ["d4", "a1"], b)).toBe("mine");
  });

  it("with no ids the labels stand in, and an unknown label hides nothing", () => {
    const b = siteBranchOf("North", nodes)!;
    expect(docSiteVerdict("Workshop", [], b)).toBe("mine");
    expect(docSiteVerdict("Casting", [], b)).toBe("other");
    // shared across sites: kept, the label cannot tell them apart
    expect(docSiteVerdict("Maintenance", [], b)).toBe("mine");
    expect(docSiteVerdict("Somewhere new", [], b)).toBe("none");
  });

  it("an ingestion task: its own site, no site, or the person's own work", () => {
    const t = (site: string, over: Record<string, unknown> = {}) => ({ site, createdByEmail: "x@a", assignees: [] as { email: string }[], ...over });
    expect(taskInSite(t("North"), "north", "me@a")).toBe(true);
    expect(taskInSite(t(""), "North", "me@a")).toBe(true);
    expect(taskInSite(t("South"), "North", "me@a")).toBe(false);
    expect(taskInSite(t("South", { createdByEmail: "ME@a" }), "North", "me@a")).toBe(true);
    expect(taskInSite(t("South", { assignees: [{ email: "me@a" }] }), "North", "me@a")).toBe(true);
    // not scoped: everything
    expect(taskInSite(t("South"), "", "me@a")).toBe(true);
  });
});
