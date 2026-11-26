import { describe, expect, it } from "vitest";
import { labelsOutsideRoot, savedTerm, savedTerms } from "../docs/ingestionModel";
import { matchesTermFilters } from "../docs/filterModel";

// report 5 (2026-11-25): BSL's process tree has "General" under both
// Casthouse and Metal Delivery. A file tagged with one came back from
// the ingestion grid as the other, because a term was found by its name.
const N = (id: string, ...labels: string[]) => ({ id, labels });
const nodes = [
  N("bsl", "BSL"),
  N("cast", "BSL", "Casting"),
  N("ch", "BSL", "Casting", "Casthouse"),
  N("ch-gen", "BSL", "Casting", "Casthouse", "General"),
  N("ch-insp", "BSL", "Casting", "Casthouse", "Inspection, Homogenising & Sawing"),
  N("md", "BSL", "Casting", "Metal Delivery"),
  N("md-gen", "BSL", "Casting", "Metal Delivery", "General"),
  N("md-mrp", "BSL", "Casting", "Metal Delivery", "MRP"),
  N("other", "Weipa"),
  N("w-gen", "Weipa", "General"),
];

describe("a saved term is the term its id names", () => {
  it("takes the id the item carries, whatever shares its name", () => {
    expect(savedTerms("General", "ch-gen", nodes)).toEqual({ terms: [{ label: "General", termId: "ch-gen" }], unsure: [] });
    expect(savedTerms("General", "md-gen", nodes)).toEqual({ terms: [{ label: "General", termId: "md-gen" }], unsure: [] });
  });
  it("shows the term's current name when it was renamed since", () => {
    expect(savedTerms("Old name", "md-mrp", nodes).terms).toEqual([{ label: "MRP", termId: "md-mrp" }]);
  });
  it("keeps an id the walk does not know, under the name the item has", () => {
    expect(savedTerms("Gone", "zzz", nodes).terms).toEqual([{ label: "Gone", termId: "zzz" }]);
  });
  it("with no id, a name only ONE term has finds it", () => {
    expect(savedTerms("MRP", "", nodes)).toEqual({ terms: [{ label: "MRP", termId: "md-mrp" }], unsure: [] });
  });
  it("with no id, a shared name is never guessed", () => {
    expect(savedTerms("General", "", nodes)).toEqual({ terms: [], unsure: ["General"] });
  });
  it("several values keep their own ids", () => {
    expect(savedTerms("General; MRP", "ch-gen;md-mrp", nodes).terms).toEqual([
      { label: "General", termId: "ch-gen" },
      { label: "MRP", termId: "md-mrp" },
    ]);
  });
  it("ids that do not line up with the names are not trusted", () => {
    expect(savedTerms("General; MRP", "ch-gen", nodes)).toEqual({ terms: [{ label: "MRP", termId: "md-mrp" }], unsure: ["General"] });
  });
  it("a single value, as Importance is read", () => {
    expect(savedTerm("General", "md-gen", nodes)).toEqual({ label: "General", termId: "md-gen" });
    expect(savedTerm("General", "", nodes)).toBeNull();
    expect(savedTerm("", "", nodes)).toBeNull();
  });
});

describe("the site check goes by the id too", () => {
  it("a shared name under another site is caught when the id says so", () => {
    expect(labelsOutsideRoot("General", nodes, "bsl", "w-gen")).toEqual(["General"]);
    expect(labelsOutsideRoot("General", nodes, "bsl", "ch-gen")).toEqual([]);
  });
  it("by name, a shared name under the root is let through as before", () => {
    expect(labelsOutsideRoot("General", nodes, "bsl")).toEqual([]);
  });
});

describe("a term filter keeps the rows whose term it picked", () => {
  const picked = [{ cols: ["Area"], ids: ["md", "md-gen", "md-mrp"] }];
  it("drops a row the name matched and the id does not", () => {
    expect(matchesTermFilters({ Area: "General", "Area#termid": "ch-gen" }, picked)).toBe(false);
    expect(matchesTermFilters({ Area: "General", "Area#termid": "md-gen" }, picked)).toBe(true);
  });
  it("keeps a row that carries no ids", () => {
    expect(matchesTermFilters({ Area: "General" }, picked)).toBe(true);
  });
  it("a row with several terms matches on any of them", () => {
    expect(matchesTermFilters({ Area: "General; MRP", "Area#termid": "ch-gen;md-mrp" }, picked)).toBe(true);
  });
  it("looks across every column the filter covers, and every filter", () => {
    const org = [{ cols: ["Org", "Org2"], ids: ["bsl"] }, { cols: ["Area"], ids: ["md-gen"] }];
    expect(matchesTermFilters({ "Org2#termid": "BSL", "Area#termid": "md-gen" }, org)).toBe(true);
    expect(matchesTermFilters({ "Org2#termid": "other", "Area#termid": "md-gen" }, org)).toBe(false);
  });
  it("a filter with no ids decides nothing", () => {
    expect(matchesTermFilters({ "Area#termid": "ch-gen" }, [{ cols: ["Area"], ids: [] }])).toBe(true);
  });
});
