// The Process area term set's pure parts (shared/schema/process.ts, 2026-10-12).
import { describe, expect, it } from "vitest";
import { ProcessNode, buildProcessTree, processTermPaths, synonymsToAdd } from "../../../shared/schema/process";

const n = (nodeId: string, level: 0 | 1 | 2 | 3, name: string, parentId = "", order = 10, over: Partial<ProcessNode> = {}): ProcessNode => ({ rowId: "", nodeId, parentId, level, name, order, termId: "", aliases: {}, archived: false, ...over });

describe("processTermPaths", () => {
  it("walks the live tree parents-first in the general names", () => {
    const tree = buildProcessTree([n("t1", 0, "Smelter"), n("a1", 1, "Casting", "t1", 10, { aliases: { "bell bay": "Casthouse" } }), n("p1", 2, "Ingot casting", "a1"), n("a0", 1, "Old", "t1", 5, { archived: true }), n("t2", 0, "Refinery", "", 20)]);
    expect(processTermPaths(tree).map((e) => e.path.join(" › "))).toEqual(["Smelter", "Smelter › Casting", "Smelter › Casting › Ingot casting", "Refinery"]);
  });
});

describe("synonymsToAdd", () => {
  it("adds the local names the term lacks, never the general name or a duplicate", () => {
    const node = { name: "Casting", aliases: { "bell bay": "Casthouse", boyne: "casting", kurri: "Cast House", other: "Casthouse" } };
    const have = [{ name: "Casting", languageTag: "en-US", isDefault: true }, { name: "Cast House", languageTag: "en-US", isDefault: false }];
    expect(synonymsToAdd(have, node, "en-US")).toEqual([{ name: "Casthouse", languageTag: "en-US", isDefault: false }]);
    expect(synonymsToAdd([], { name: "X", aliases: {} }, "en-US")).toEqual([]);
  });
});

describe("synonymsToAdd — the store's ＆", () => {
  it("does not re-add a local name the term already carries as ＆", () => {
    const node = { name: "Carbon & Casting", aliases: { "bell bay": "Carbon & Cast House" } };
    const have = [{ name: "Carbon ＆ Casting", languageTag: "en-US", isDefault: true }, { name: "Carbon ＆ Cast House", languageTag: "en-US", isDefault: false }];
    expect(synonymsToAdd(have, node, "en-US")).toEqual([]);
  });
});
