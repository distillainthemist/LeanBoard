// The register's Filters pane — order, featured terms and the tree
// (2026-11-17, issues 7, 8 and 9).
import { describe, expect, it } from "vitest";
import { featuredFor, featuredScopeKey, featuredScopeLabel, leadTerms, openBranches, orderFilterColumns, parseFeatured, termTree, treeSearch, vocabularyDepth } from "../docs/filterModel";

const t = (id: string, ...labels: string[]) => ({ id, labels });

describe("the order of the filter groups", () => {
  const roles: Record<string, string> = { St: "status", Ty: "docType", Pa: "processArea", Im: "importance", Mo: "", "": "orgUnit" };
  const roleOf = (c: string) => roles[c] ?? "";
  it("status, document type and process area lead; the rest keep their places", () => {
    expect(orderFilterColumns(["", "Ty", "Im", "Pa", "Mo", "St"], roleOf)).toEqual(["St", "Ty", "Pa", "", "Im", "Mo"]);
  });
  it("is stable when a leading role is absent", () => {
    expect(orderFilterColumns(["Im", "Ty", "Mo"], roleOf)).toEqual(["Ty", "Im", "Mo"]);
    expect(orderFilterColumns([], roleOf)).toEqual([]);
  });
});

describe("featured terms", () => {
  const featured = { "": ["all1"], "site:BSL": ["s1", "s2"], "dept:BSL|Casting": ["c1", "c2", "c3"], "site:Weipa": [] };
  it("scopes by department, then site, then everyone", () => {
    expect(featuredFor(featured, { site: "BSL", department: "Casting" })).toEqual(["c1", "c2", "c3"]);
    expect(featuredFor(featured, { site: "BSL", department: "Potlines" })).toEqual(["s1", "s2"]);
    expect(featuredFor(featured, { site: "Weipa", department: "Mine" })).toEqual(["all1"]); // an empty list is no list
    expect(featuredFor(featured, { site: "", department: "" })).toEqual(["all1"]);
    expect(featuredFor(undefined, { site: "BSL", department: "Casting" })).toEqual([]);
  });
  it("matches a profile's site and department case-blind", () => {
    expect(featuredFor(featured, { site: "bsl", department: "casting" })).toEqual(["c1", "c2", "c3"]);
  });
  it("keys and words a scope", () => {
    expect(featuredScopeKey("", "x")).toBe("");
    expect(featuredScopeKey("BSL")).toBe("site:BSL");
    expect(featuredScopeKey("BSL", "Casting")).toBe("dept:BSL|Casting");
    expect(featuredScopeLabel("")).toBe("Everyone");
    expect(featuredScopeLabel("site:BSL")).toBe("BSL");
    expect(featuredScopeLabel("dept:BSL|Casting")).toBe("BSL › Casting");
  });
  it("parses defensively", () => {
    expect(parseFeatured({ "": ["a", "a", " b ", 3, ""], "site:X": [], bad: "no" })).toEqual({ "": ["a", "b"] });
    expect(parseFeatured(null)).toBeUndefined();
    expect(parseFeatured({})).toBeUndefined();
  });
  const nodes = [t("1", "Procedure"), t("2", "Procedure", "Isolation"), t("3", "Procedure", "Isolation", "Electrical"), t("4", "Form"), t("5", "Procedure", "Lesson", "Single Point Lesson")];
  it("leads with the featured terms, in their order, at any depth", () => {
    expect(leadTerms(nodes, ["5", "2"]).map((n) => n.id)).toEqual(["5", "2"]);
  });
  it("drops a featured term the vocabulary no longer has; with none left, the top two levels lead", () => {
    expect(leadTerms(nodes, ["gone", "4"]).map((n) => n.id)).toEqual(["4"]);
    expect(leadTerms(nodes, ["gone"]).map((n) => n.id)).toEqual(["1", "2", "4"]);
    expect(leadTerms(nodes, []).map((n) => n.id)).toEqual(["1", "2", "4"]);
  });
});

describe("the tree", () => {
  const nodes = [t("b", "BSL"), t("bc", "BSL", "Casting"), t("bcc", "BSL", "Casting", "Casting"), t("bcf", "BSL", "Casting", "Casting", "Furnace Operations"), t("bm", "BSL", "Metal Delivery"), t("w", "Weipa"), t("wm", "Weipa", "Mine"), t("orphan", "Lost", "Child")];
  it("nests by label path, in the walk's order; an orphan hangs from the root", () => {
    const tree = termTree(nodes);
    expect(tree.map((r) => r.node.id)).toEqual(["b", "w", "orphan"]);
    expect(tree[0].children.map((c) => c.node.id)).toEqual(["bc", "bm"]);
    expect(tree[0].children[0].children[0].children.map((c) => c.node.id)).toEqual(["bcf"]);
  });
  it("measures the depth", () => {
    expect(vocabularyDepth(nodes)).toBe(4);
    expect(vocabularyDepth([])).toBe(0);
  });
  it("a search shows the matches and the path down to each", () => {
    expect([...(treeSearch(nodes, "furnace") ?? [])].sort()).toEqual(["b", "bc", "bcc", "bcf"]);
    expect([...(treeSearch(nodes, "MINE") ?? [])].sort()).toEqual(["w", "wm"]);
    expect(treeSearch(nodes, "  ")).toBeNull();
    expect(treeSearch(nodes, "zzz")?.size).toBe(0);
  });
  it("opens at the person's site and department, and down to what is picked", () => {
    const open = openBranches(nodes, { site: "bsl", department: "Casting" }, []);
    // BSL and both Castings are open; Weipa stays closed
    expect([...open].sort()).toEqual(["b", "bc", "bcc"]);
    expect([...openBranches(nodes, { site: "", department: "" }, ["wm"])]).toEqual(["w"]);
    expect(openBranches(nodes, { site: "Nowhere", department: "" }, []).size).toBe(0);
  });
});
