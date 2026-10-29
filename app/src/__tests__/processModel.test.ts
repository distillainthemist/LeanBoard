// The process model's pure parts (shared/schema/process.ts, 2026-10-12;
// site trees and the central link 2026-10-29, features-plan §1).
import { describe, expect, it } from "vitest";
import { NO_PROCESS_FILTER, ProcessNode, allSiteRoots, buildProcessTree, centralOf, cloneTypeForSite, fitProcessFilter, inCentralSubtree, liveChildren, matchesProcessFilter, nextOrder, nodeFromRow, processLabel, processLabelWithCentral, processNameFor, processPath, processPathLabel, reorder, repointedNodeId, rootLabel, rowFromNode, siteNodesUnderCentral, siteRootOf, typeOf } from "../../../shared/schema/process";

const n = (nodeId: string, level: 0 | 1 | 2 | 3, name: string, parentId = "", order = 10, over: Partial<ProcessNode> = {}): ProcessNode => ({ rowId: "", nodeId, parentId, level, name, order, termId: "", aliases: {}, archived: false, site: "", centralId: "", ...over });
// the central tree (the Smelter type) and Bell Bay's own tree
const nodes = [
  n("t1", 0, "Smelter", "", 10),
  n("a1", 1, "Reduction", "t1", 10),
  n("a2", 1, "Casting", "t1", 20, { aliases: { "bell bay": "Casthouse" } }),
  n("p1", 2, "Ingot casting", "a2", 10),
  n("s1", 3, "Line 2", "p1", 10),
  n("p0", 2, "Old", "a2", 5, { archived: true }),
  n("t2", 0, "Refinery", "", 20),
  n("bb", 0, "Bell Bay", "", 10, { site: "Bell Bay" }),
  n("bb-a", 1, "Casthouse", "bb", 10, { site: "Bell Bay", centralId: "a2" }),
  n("bb-p", 2, "Ingots", "bb-a", 10, { site: "Bell Bay" }),
  n("bb-x", 1, "Services", "bb", 20, { site: "Bell Bay" }),
  n("old-bb", 0, "Bell Bay", "", 5, { site: "Bell Bay", archived: true }),
];

describe("rows", () => {
  it("round-trips and tolerates rubbish", () => {
    const back = nodeFromRow({ ...rowFromNode(nodes[8]), ben_ltkprocessnodeid: "r" });
    expect(back).toEqual({ ...nodes[8], rowId: "r" });
    const bad = nodeFromRow({ ben_nodeid: "x", ben_level: "9", ben_order: "abc", ben_aliasesjson: "{nope" });
    expect(bad.level).toBe(0);
    expect(bad.order).toBe(0);
    expect(bad.aliases).toEqual({});
    expect(bad.site).toBe("");
    expect(bad.centralId).toBe("");
  });
});

describe("tree", () => {
  const tree = buildProcessTree(nodes);
  it("orders siblings, lists the central types, hides archived from live children", () => {
    expect(tree.types.map((t) => t.name)).toEqual(["Smelter", "Refinery"]);
    expect(liveChildren(tree, "a2").map((x) => x.name)).toEqual(["Ingot casting"]);
    expect((tree.childrenOf.get("a2") ?? []).length).toBe(2);
    expect(nextOrder(tree, "t1")).toBe(30);
    expect(nextOrder(tree, "s1")).toBe(10);
  });
  it("knows each site's root — the live one over an archived twin, blind to case", () => {
    expect(allSiteRoots(tree)).toEqual({ "Bell Bay": "bb" });
    expect(siteRootOf(tree, "bell bay")).toBe("bb");
    expect(siteRootOf(tree, "Boyne")).toBe("");
    expect(rootLabel(tree.byId.get("bb")!)).toBe("Site");
    expect(rootLabel(tree.byId.get("t1")!)).toBe("Process type");
  });
  it("walks the path and knows the root", () => {
    expect(processPath(tree, "s1").map((x) => x.name)).toEqual(["Smelter", "Casting", "Ingot casting", "Line 2"]);
    expect(typeOf(tree, "s1")).toBe("t1");
    expect(typeOf(tree, "bb-p")).toBe("bb");
    expect(processPathLabel(tree, "bb-p", "Bell Bay")).toBe("Casthouse › Ingots");
  });
  it("reorders with a live neighbour and stops at the edge", () => {
    const pair = reorder(tree, "a2", true)!;
    expect(pair.map((x) => [x.name, x.order])).toEqual([["Casting", 10], ["Reduction", 20]]);
    expect(reorder(tree, "a1", true)).toBeNull();
  });
});

describe("the central link", () => {
  const tree = buildProcessTree(nodes);
  it("is the node's own, else inherited, else none; a central node is its own", () => {
    expect(centralOf(tree, "bb-a")).toBe("a2");
    expect(centralOf(tree, "bb-p")).toBe("a2"); // inherited from Casthouse
    expect(centralOf(tree, "bb-x")).toBe("");
    expect(centralOf(tree, "bb")).toBe("");
    expect(centralOf(tree, "p1")).toBe("p1");
    expect(centralOf(tree, "nope")).toBe("");
  });
  it("answers the cross-site filter", () => {
    expect(inCentralSubtree(tree, "bb-p", "t1")).toBe(true);
    expect(inCentralSubtree(tree, "bb-p", "a2")).toBe(true);
    expect(inCentralSubtree(tree, "bb-p", "a1")).toBe(false);
    expect(inCentralSubtree(tree, "bb-x", "t1")).toBe(false);
    expect(inCentralSubtree(tree, "bb-x", "")).toBe(true);
    expect(siteNodesUnderCentral(tree, "a2").map((x) => x.nodeId)).toEqual(["bb-a", "bb-p"]);
  });
  it("labels a site node with its central counterpart when the names differ", () => {
    expect(processLabel(tree.byId.get("bb-a")!, "Bell Bay")).toBe("Casthouse");
    expect(processLabelWithCentral(tree, tree.byId.get("bb-a")!)).toBe("Casthouse (Casting)");
    expect(processLabelWithCentral(tree, tree.byId.get("bb-x")!)).toBe("Services");
    expect(processLabelWithCentral(tree, tree.byId.get("a2")!)).toBe("Casting");
  });
});

describe("the migration — clone a type for a site", () => {
  const tree = buildProcessTree(nodes);
  it("copies the live tree in the site's own words, linked node for node, bindings empty", () => {
    let i = 0;
    const { nodes: made, idMap } = cloneTypeForSite(tree, "t1", "Boyne", () => `n${++i}`);
    expect(made.map((x) => [x.nodeId, x.level, x.name, x.parentId, x.centralId, x.site])).toEqual([
      ["n1", 0, "Boyne", "", "", "Boyne"],
      ["n2", 1, "Reduction", "n1", "a1", "Boyne"],
      ["n3", 1, "Casting", "n1", "a2", "Boyne"],
      ["n4", 2, "Ingot casting", "n3", "p1", "Boyne"],
      ["n5", 3, "Line 2", "n4", "s1", "Boyne"],
    ]);
    expect(made.every((x) => x.termId === "" && Object.keys(x.aliases).length === 0)).toBe(true);
    expect(idMap).toEqual({ t1: "n1", a1: "n2", a2: "n3", p1: "n4", s1: "n5" });
    // the retired local name becomes the site's own name
    i = 0;
    const bb = cloneTypeForSite(tree, "t1", "Bell Bay", () => `b${++i}`);
    expect(bb.nodes.find((x) => x.centralId === "a2")?.name).toBe("Casthouse");
    expect(processNameFor(tree.byId.get("a2")!, "BELL BAY")).toBe("Casthouse");
    expect(cloneTypeForSite(tree, "a2", "Boyne").nodes).toEqual([]);
    expect(cloneTypeForSite(tree, "t1", " ").nodes).toEqual([]);
  });
  it("re-points a reference through the id map", () => {
    expect(repointedNodeId("a2", { a2: "n3" })).toBe("n3");
    expect(repointedNodeId("bb-a", { a2: "n3" })).toBe("bb-a");
    expect(repointedNodeId("", { a2: "n3" })).toBe("");
  });
});

describe("the process filter a surface holds (decision 7)", () => {
  const tree = buildProcessTree(nodes);
  it("matches by the site's tree or through the central link; an empty filter passes all", () => {
    expect(matchesProcessFilter(tree, "bb-p", { mode: "site", value: "bb-a" })).toBe(true);
    expect(matchesProcessFilter(tree, "bb-x", { mode: "site", value: "bb-a" })).toBe(false);
    expect(matchesProcessFilter(tree, "bb-p", { mode: "central", value: "t1" })).toBe(true);
    expect(matchesProcessFilter(tree, "bb-x", { mode: "central", value: "t1" })).toBe(false);
    expect(matchesProcessFilter(tree, "", { mode: "central", value: "" })).toBe(true);
    expect(matchesProcessFilter(tree, "", NO_PROCESS_FILTER)).toBe(true);
  });
  it("clears a value that no longer fits the scope, keeping the mode", () => {
    expect(fitProcessFilter(tree, { mode: "site", value: "bb-a" }, "Bell Bay")).toEqual({ mode: "site", value: "bb-a" });
    expect(fitProcessFilter(tree, { mode: "site", value: "bb-a" }, "Boyne")).toEqual({ mode: "site", value: "" });
    expect(fitProcessFilter(tree, { mode: "site", value: "a2" }, "Bell Bay")).toEqual({ mode: "site", value: "" });
    expect(fitProcessFilter(tree, { mode: "central", value: "a2" }, "Boyne")).toEqual({ mode: "central", value: "a2" });
    expect(fitProcessFilter(tree, { mode: "central", value: "bb-a" }, "Bell Bay")).toEqual({ mode: "central", value: "" });
    expect(fitProcessFilter(tree, { mode: "central", value: "" }, "")).toEqual({ mode: "central", value: "" });
  });
});
