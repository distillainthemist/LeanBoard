// The process model's pure parts (processes/model.ts, 2026-10-12).
import { describe, expect, it } from "vitest";
import { ProcessNode, buildProcessTree, liveChildren, nextOrder, nodeFromRow, processLabel, processLabelWithGeneral, processPath, processPathLabel, reorder, rowFromNode, typeOf } from "../processes/model";

const n = (nodeId: string, level: 0 | 1 | 2 | 3, name: string, parentId = "", order = 10, over: Partial<ProcessNode> = {}): ProcessNode => ({ rowId: "", nodeId, parentId, level, name, order, termId: "", aliases: {}, archived: false, ...over });
const nodes = [
  n("t1", 0, "Smelter", "", 10),
  n("a1", 1, "Reduction", "t1", 10),
  n("a2", 1, "Casting", "t1", 20, { aliases: { "bell bay": "Casthouse" } }),
  n("p1", 2, "Ingot casting", "a2", 10),
  n("s1", 3, "Line 2", "p1", 10),
  n("p0", 2, "Old", "a2", 5, { archived: true }),
  n("t2", 0, "Refinery", "", 20),
];

describe("rows", () => {
  it("round-trips and tolerates rubbish", () => {
    const back = nodeFromRow({ ...rowFromNode(nodes[2]), ben_ltkprocessnodeid: "r" });
    expect(back).toEqual({ ...nodes[2], rowId: "r" });
    const bad = nodeFromRow({ ben_nodeid: "x", ben_level: "9", ben_order: "abc", ben_aliasesjson: "{nope" });
    expect(bad.level).toBe(0);
    expect(bad.order).toBe(0);
    expect(bad.aliases).toEqual({});
  });
});

describe("tree", () => {
  const tree = buildProcessTree(nodes);
  it("orders siblings, lists types, hides archived from live children", () => {
    expect(tree.types.map((t) => t.name)).toEqual(["Smelter", "Refinery"]);
    expect(liveChildren(tree, "a2").map((x) => x.name)).toEqual(["Ingot casting"]);
    expect((tree.childrenOf.get("a2") ?? []).length).toBe(2);
    expect(nextOrder(tree, "t1")).toBe(30);
    expect(nextOrder(tree, "s1")).toBe(10);
  });
  it("walks the path and knows the type", () => {
    expect(processPath(tree, "s1").map((x) => x.name)).toEqual(["Smelter", "Casting", "Ingot casting", "Line 2"]);
    expect(typeOf(tree, "s1")).toBe("t1");
    expect(processPathLabel(tree, "s1", "Bell Bay")).toBe("Casthouse › Ingot casting › Line 2");
  });
  it("reorders with a live neighbour and stops at the edge", () => {
    const pair = reorder(tree, "a2", true)!;
    expect(pair.map((x) => [x.name, x.order])).toEqual([["Casting", 10], ["Reduction", 20]]);
    expect(reorder(tree, "a1", true)).toBeNull();
  });
});

describe("processLabel — the one display rule", () => {
  it("reads the site's local name only with that site in scope", () => {
    const casting = nodes[2];
    expect(processLabel(casting, "Bell Bay")).toBe("Casthouse");
    expect(processLabel(casting, "Boyne")).toBe("Casting");
    expect(processLabel(casting, "")).toBe("Casting");
    expect(processLabelWithGeneral(casting, "bell bay")).toBe("Casthouse (Casting)");
    expect(processLabelWithGeneral(casting, "Boyne")).toBe("Casting");
  });
});
