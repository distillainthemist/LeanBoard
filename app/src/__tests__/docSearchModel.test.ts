import { describe, it, expect } from "vitest";
import { hitSubline, mergeDocHits, unreadWords } from "../docs/docSearchModel";

const row = (uniqueId: string, name: string, docId = "") => ({ uniqueId, name, values: { DocId: docId } });
const o = { exclude: "SELF", docIdInternal: "DocId", max: 3, nameOf: (l: string) => l };

describe("the document search's answers (2026-11-23)", () => {
  it("merges library by library, less the document itself and repeats, up to the cap", () => {
    const { hits, unread } = mergeDocHits(
      ["Standards", "Procedures"],
      [
        { rows: [row("self", "This one"), row("a", "A.docx", " STD-1 "), row("b", "B.docx")], failed: false },
        { rows: [row("A", "A again"), row("c", "C.docx"), row("d", "D.docx")], failed: false },
      ],
      o
    );
    expect(hits.map((h) => h.uniqueId)).toEqual(["a", "b", "c"]);
    expect(hits[0]).toEqual({ uniqueId: "a", name: "A.docx", docId: "STD-1", lib: "Standards" });
    expect(hits[2].lib).toBe("Procedures");
    expect(unread).toEqual([]);
  });

  it("a library that could not be read is named, and the rest still answer", () => {
    const { hits, unread } = mergeDocHits(["Standards", "Procedures"], [{ rows: [], failed: true }, { rows: [row("c", "C.docx")], failed: false }], o);
    expect(hits.map((h) => h.uniqueId)).toEqual(["c"]);
    expect(unread).toEqual(["Standards"]);
    expect(unreadWords(unread)).toBe("Could not search Standards.");
    expect(unreadWords([])).toBe("");
    // a missing answer counts as unread
    expect(mergeDocHits(["Standards"], [], o).unread).toEqual(["Standards"]);
  });

  it("no document id column: none is carried", () => {
    const { hits } = mergeDocHits(["Standards"], [{ rows: [row("a", "A.docx", "STD-1")], failed: false }], { ...o, docIdInternal: "" });
    expect(hits[0].docId).toBe("");
  });

  it("the line under a name is the library, then the document id", () => {
    expect(hitSubline("Standards", "STD-1")).toBe("Standards · STD-1");
    expect(hitSubline("Standards", "")).toBe("Standards");
  });
});
