// A capture card's PERSON column (2026-11-18): the people are kept with
// who they are, in a cell shape every build already carries.
import { describe, expect, it } from "vitest";
import { decodePeople, encodePeople, parseColumns, parseRowList, peopleText } from "../../../controls/CaptureCard/types";

describe("a person column", () => {
  it("is a column type, one person or several", () => {
    const cols = parseColumns(JSON.stringify([{ key: "who", label: "Who", type: "person", multi: true }, { key: "by", type: "person" }]));
    expect(cols.map((c) => [c.type, c.multi])).toEqual([["person", true], ["person", false]]);
  });
  it("keeps each person's id beside their name, and reads back the same", () => {
    const cell = encodePeople([{ whoId: "u2", who: "Smith, Jane" }, { whoId: "", who: " Visiting Fitter " }]);
    expect(cell).toEqual(["u2|Smith, Jane", "|Visiting Fitter"]);
    expect(decodePeople(cell)).toEqual([{ whoId: "u2", who: "Smith, Jane" }, { whoId: "", who: "Visiting Fitter" }]);
    expect(peopleText(cell)).toBe("Smith, Jane, Visiting Fitter");
  });
  it("reads a name typed before the column became a person column", () => {
    expect(decodePeople("Jane Smith")).toEqual([{ whoId: "", who: "Jane Smith" }]);
    expect(decodePeople(undefined)).toEqual([]);
    expect(decodePeople("")).toEqual([]);
  });
  it("drops blanks and repeats", () => {
    expect(decodePeople(["u1|Ben", "u1|Ben O'Brien", "|", "|Sam", "|sam"]).map((p) => p.who)).toEqual(["Ben", "Sam"]);
    expect(encodePeople([{ whoId: "", who: "" }])).toEqual([]);
  });
  it("is a cell the row parser of ANY build keeps — a string array", () => {
    const rows = parseRowList([{ id: "r1", rowKey: "", cells: { who: ["u2|Smith, Jane"], note: "x" } }]);
    expect(rows[0].cells.who).toEqual(["u2|Smith, Jane"]);
  });
  it("keeps a name holding a bar after the id", () => {
    expect(decodePeople(["u9|Night shift | B crew"])).toEqual([{ whoId: "u9", who: "Night shift | B crew" }]);
  });
});
