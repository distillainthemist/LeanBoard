// The term manager's pure parts (termManagerModel.ts, 2026-10-12).
import { describe, expect, it } from "vitest";
import { buildTree, composeLabels, labelsByLanguage, visibleIds } from "../docs/termManagerModel";

describe("labelsByLanguage / composeLabels", () => {
  it("groups the default and the synonyms per working language and keeps unknown tags", () => {
    const by = labelsByLanguage(
      [
        { name: "Casting", languageTag: "en-US", isDefault: true },
        { name: "Casthouse", languageTag: "en-US", isDefault: false },
        { name: "Coulée", languageTag: "fr-FR", isDefault: true },
        { name: "Gießen", languageTag: "de-DE", isDefault: true },
      ],
      ["en-US", "fr-FR"]
    );
    expect([...by.keys()]).toEqual(["en-US", "fr-FR", "de-DE"]);
    expect(by.get("en-US")).toEqual({ name: "Casting", synonyms: ["Casthouse"] });
    expect(by.get("fr-FR")).toEqual({ name: "Coulée", synonyms: [] });
  });
  it("composes one default per language, drops blanks and duplicates, refuses a term with no default", () => {
    const by = new Map([
      ["en-US", { name: " Casting ", synonyms: ["Casthouse", " casthouse", "", "CASTING"] }],
      ["fr-FR", { name: "", synonyms: ["Fonderie"] }],
    ]);
    expect(composeLabels(by)).toEqual([
      { name: "Casting", languageTag: "en-US", isDefault: true },
      { name: "Casthouse", languageTag: "en-US", isDefault: false },
      { name: "Fonderie", languageTag: "fr-FR", isDefault: false },
    ]);
    expect(composeLabels(new Map([["en-US", { name: "", synonyms: ["x"] }]]))).toEqual([]);
  });
});

describe("buildTree / visibleIds", () => {
  const walk = [
    { id: "a", labels: ["Bell Bay"] },
    { id: "b", labels: ["Bell Bay", "Casting"] },
    { id: "c", labels: ["Bell Bay", "Anodes"] },
    { id: "d", labels: ["Bell Bay", "Casting", "Line 2"] },
    { id: "e", labels: ["Boyne"] },
  ];
  it("resolves parents by path and sorts siblings naturally", () => {
    const { nodes, childrenOf } = buildTree(walk);
    expect(nodes.find((n) => n.id === "d")?.parentId).toBe("b");
    expect(nodes.find((n) => n.id === "a")?.parentId).toBe("");
    expect(childrenOf.get("")?.map((n) => n.id)).toEqual(["a", "e"]);
    expect(childrenOf.get("a")?.map((n) => n.id)).toEqual(["c", "b"]);
  });
  it("shows a hit with its ancestors, everything with no query", () => {
    const { nodes } = buildTree(walk);
    expect(visibleIds(nodes, "")).toBeNull();
    expect([...(visibleIds(nodes, "line") ?? [])].sort()).toEqual(["a", "b", "d"]);
    expect([...(visibleIds(nodes, "boyne") ?? [])]).toEqual(["e"]);
  });
});
