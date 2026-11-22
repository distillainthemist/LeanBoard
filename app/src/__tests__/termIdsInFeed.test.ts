// A term renamed after a file was tagged (2026-11-22): the list feed's
// label is SharePoint's stored copy and lags the rename; the term's id
// does not change. The feed keeps the ids, and the ingestion grid reads
// each term's current name by id.

import { describe, expect, it } from "vitest";
import { currentTermLabels } from "../docs/ingestionModel";
import { parseRenderPage, termIdsOf } from "../docs/rows";

const term = (Label: string, TermID: string) => ({ __type: "TaxonomyFieldValue:#Microsoft.SharePoint.Taxonomy", Label, TermID });

describe("the term ids a feed value carries", () => {
  it("reads one term, and several in label order", () => {
    expect(termIdsOf(term("Procedure", "AAAA-1"))).toEqual(["aaaa-1"]);
    expect(termIdsOf([term("Casting", "{B-2}"), term("Smelting", "c-3")])).toEqual(["b-2", "c-3"]);
  });
  it("is empty for anything that is not a term", () => {
    expect(termIdsOf("Procedure")).toEqual([]);
    expect(termIdsOf(null)).toEqual([]);
    expect(termIdsOf([{ title: "Ben", email: "ben@x.test" }])).toEqual([]);
    expect(termIdsOf({ Label: "No id" })).toEqual([]);
  });
  it("is empty when a label has no id: the pairing cannot be trusted", () => {
    expect(termIdsOf([term("Casting", "b-2"), { Label: "Smelting" }])).toEqual([]);
  });
  it("rides the row beside the label, as a person's email does", () => {
    const page = parseRenderPage({ Row: [{ ID: "7", FileLeafRef: "a.pdf", FSObjType: "0", UniqueId: "{U-1}", DocType: term("Procedure", "AAAA-1"), Title: "A" }] }, "list-1");
    expect(page.rows[0].values.DocType).toBe("Procedure");
    expect(page.rows[0].values["DocType#termid"]).toBe("aaaa-1");
    expect(page.rows[0].values["Title#termid"]).toBeUndefined();
  });
});

describe("a term cell reads the term's current name", () => {
  const names = new Map([["aaaa-1", "Standard operating procedure"], ["b-2", "Casting"], ["c-3", "Smelting"]]);
  const nameOf = (id: string) => names.get(id);
  it("a renamed term shows its new name", () => {
    expect(currentTermLabels({ DocType: "Procedure", "DocType#termid": "aaaa-1" }, "DocType", nameOf)).toBe("Standard operating procedure");
  });
  it("several terms keep their order", () => {
    expect(currentTermLabels({ Area: "Casting; Smelter", "Area#termid": "b-2;c-3" }, "Area", nameOf)).toBe("Casting; Smelting");
  });
  it("leaves the stored label when the feed gave no id or the set does not know it", () => {
    expect(currentTermLabels({ DocType: "Procedure" }, "DocType", nameOf)).toBeNull();
    expect(currentTermLabels({ DocType: "Gone", "DocType#termid": "zzzz-9" }, "DocType", nameOf)).toBeNull();
    expect(currentTermLabels({ Area: "Casting; Gone", "Area#termid": "b-2;zzzz-9" }, "Area", nameOf)).toBeNull();
    expect(currentTermLabels({}, "DocType", nameOf)).toBeNull();
  });
});
