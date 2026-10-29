// The Process area term set's pure parts (shared/schema/process.ts,
// 2026-10-12; site-rooted since 2026-10-29, features-plan §1).
import { describe, expect, it } from "vitest";
import { ProcessNode, buildProcessTree, processTermPaths, synonymsToRemove } from "../../../shared/schema/process";

const n = (nodeId: string, level: 0 | 1 | 2 | 3, name: string, parentId = "", order = 10, over: Partial<ProcessNode> = {}): ProcessNode => ({ rowId: "", nodeId, parentId, level, name, order, termId: "", aliases: {}, archived: false, site: "", centralId: "", ...over });

describe("processTermPaths", () => {
  it("walks the live SITE trees parents-first; the central tree does not sync", () => {
    const tree = buildProcessTree([
      n("t1", 0, "Smelter"),
      n("a1", 1, "Casting", "t1", 10, { aliases: { "bell bay": "Casthouse" } }),
      n("bb", 0, "Bell Bay", "", 10, { site: "Bell Bay" }),
      n("bb-a", 1, "Casthouse", "bb", 10, { site: "Bell Bay", centralId: "a1" }),
      n("bb-p", 2, "Ingot casting", "bb-a", 10, { site: "Bell Bay" }),
      n("bb-0", 1, "Old", "bb", 5, { site: "Bell Bay", archived: true }),
      n("by", 0, "Boyne", "", 20, { site: "Boyne" }),
    ]);
    expect(processTermPaths(tree).map((e) => e.path.join(" › "))).toEqual(["Bell Bay", "Bell Bay › Casthouse", "Bell Bay › Casthouse › Ingot casting", "Boyne"]);
  });
});

describe("synonymsToRemove", () => {
  it("strips the non-default labels equal to an alias, never the default or a hand-typed one", () => {
    const node = { aliases: { "bell bay": "Casthouse", boyne: "casting", kurri: "Cast House" } };
    const have = [
      { name: "Casting", languageTag: "en-US", isDefault: true },
      { name: "Cast House", languageTag: "en-US", isDefault: false },
      { name: "Pour", languageTag: "en-US", isDefault: false },
      { name: "casthouse", languageTag: "en-US", isDefault: false },
    ];
    const r = synonymsToRemove(have, node);
    expect(r.removed).toEqual(["Cast House", "casthouse"]);
    expect(r.keep.map((l) => l.name)).toEqual(["Casting", "Pour"]);
    expect(synonymsToRemove(have, { aliases: {} })).toEqual({ keep: have, removed: [] });
  });
  it("compares the store's ＆ as &", () => {
    const node = { aliases: { "bell bay": "Carbon & Cast House" } };
    const have = [{ name: "Carbon ＆ Casting", languageTag: "en-US", isDefault: true }, { name: "Carbon ＆ Cast House", languageTag: "en-US", isDefault: false }];
    expect(synonymsToRemove(have, node).removed).toEqual(["Carbon ＆ Cast House"]);
  });
});
