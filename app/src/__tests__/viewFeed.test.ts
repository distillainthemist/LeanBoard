// What a view asks of one library's feed — the rules the register and
// the board's doc cards share (docs/viewFeed.ts, backlog programme
// tranche 6, F6, 2026-11-27).

import { describe, expect, it } from "vitest";
import { CARD_VIEW_PARTS, cardViewLimits, filtersByColumn, modifiedBounds, termFilterFields, termFiltersCarried, viewFilterWords, viewQueryFor } from "../docs/viewFeed";
import { matchesTermFilters } from "../docs/filterModel";
import { emptyDocView } from "../docs/views";

const view = (over: Partial<ReturnType<typeof emptyDocView>> = {}) => ({ ...emptyDocView(), ...over });
const now = new Date(2026, 10, 27, 9, 0, 0).getTime();

describe("the Modified window", () => {
  it("is open when nothing is set", () => {
    expect(modifiedBounds(view(), now)).toEqual({ afterIso: undefined, beforeIso: undefined });
  });

  it("counts back N days from now", () => {
    expect(modifiedBounds(view({ modifiedDays: 7 }), now).afterIso).toBe(new Date(now - 7 * 86400000).toISOString());
  });

  it("lets a custom range lead, whole days at both ends", () => {
    const b = modifiedBounds(view({ modifiedDays: 7, modifiedFrom: "2026-10-01", modifiedTo: "2026-10-31" }), now);
    expect(b.afterIso).toBe(new Date("2026-10-01T00:00:00").toISOString());
    expect(b.beforeIso).toBe(new Date("2026-10-31T23:59:59").toISOString());
  });

  it("takes an end with no start", () => {
    const b = modifiedBounds(view({ modifiedTo: "2026-10-31" }), now);
    expect(b.afterIso).toBeUndefined();
    expect(b.beforeIso).toBe(new Date("2026-10-31T23:59:59").toISOString());
  });
});

describe("term filters for one library", () => {
  const asked = [
    { cols: ["Org", "OrgAlt"], labels: ["casting"] },
    { cols: ["DocType"], labels: ["procedure", "form"] },
  ];

  it("cuts each filter to the columns the library carries", () => {
    expect(termFiltersCarried(asked, new Set(["Org", "DocType"]))).toEqual([
      { cols: ["Org"], labels: ["casting"] },
      { cols: ["DocType"], labels: ["procedure", "form"] },
    ]);
  });

  it("says a library that lacks a filtered column cannot match", () => {
    expect(termFiltersCarried(asked, new Set(["Org"]))).toBeNull();
  });

  it("asks the library to return the filtered columns it carries, once each", () => {
    expect(termFilterFields([...asked, { cols: ["Org"] }], new Set(["Org", "DocType", "Owner"]))).toEqual(["Org", "DocType"]);
  });
});

describe("the view's part of a library's query", () => {
  const carried = new Set(["Org", "Owner", "Effective", "Links"]);

  it("carries every filter the register knows", () => {
    const q = viewQueryFor(
      view({
        query: "  heat  treatment ",
        modifiedFrom: "2026-10-01",
        dates: [{ col: "Effective", from: "2026-01-01", to: "" }],
        people: [{ col: "Owner", text: "Sam" }],
        present: ["Links"],
      }),
      [{ cols: ["Org"], labels: ["casting"] }],
      carried,
      now
    );
    expect(q).not.toBeNull();
    expect(q?.nameWords).toEqual(["heat", "treatment"]);
    expect(q?.modifiedAfterIso).toBe(new Date("2026-10-01T00:00:00").toISOString());
    expect(q?.dateRanges).toEqual([{ col: "Effective", from: "2026-01-01", to: "" }]);
    expect(q?.personFilters).toEqual([{ col: "Owner", text: "Sam" }]);
    expect(q?.presentCols).toEqual(["Links"]);
    expect(q?.termFilters).toEqual([{ cols: ["Org"], labels: ["casting"] }]);
  });

  it("leaves out a date, people or presence filter on a column the library lacks", () => {
    const q = viewQueryFor(view({ dates: [{ col: "Review", from: "2026-01-01", to: "" }], people: [{ col: "Approver", text: "Jo" }], present: ["Tags"] }), [], carried, now);
    expect(q?.dateRanges).toEqual([]);
    expect(q?.personFilters).toEqual([]);
    expect(q?.presentCols).toEqual([]);
  });

  it("is null when a TERM filter names a column the library lacks", () => {
    expect(viewQueryFor(view(), [{ cols: ["DocType"], labels: ["form"] }], carried, now)).toBeNull();
  });

  it("asks for no words when the search box is empty", () => {
    expect(viewQueryFor(view(), [], carried, now)?.nameWords).toBeUndefined();
  });
});

describe("several terms picked on one column", () => {
  it("are one filter, and columns stay apart, in first-seen order", () => {
    const got = filtersByColumn([
      { col: "Status", termId: "a" },
      { col: "DocType", termId: "p" },
      { col: "Status", termId: "d" },
    ]);
    expect(got.map((g) => [g.col, g.picks.map((p) => p.termId)])).toEqual([
      ["Status", ["a", "d"]],
      ["DocType", ["p"]],
    ]);
  });

  it("keep a row that carries ANY of them, and only those", () => {
    const filters = [{ cols: ["Status"], ids: ["a", "d"] }];
    expect(matchesTermFilters({ "Status#termid": "d" }, filters)).toBe(true);
    expect(matchesTermFilters({ "Status#termid": "x" }, filters)).toBe(false);
  });
});

describe("what a card does with each part of a view", () => {
  it("decides every part a view can carry", () => {
    expect(Object.keys(CARD_VIEW_PARTS).sort()).toEqual(Object.keys(emptyDocView()).sort());
  });

  it("says so when the view searches inside documents", () => {
    expect(cardViewLimits(view({ contents: true, query: "heat" }))).toHaveLength(1);
    expect(cardViewLimits(view({ contents: true }))).toEqual([]);
    expect(cardViewLimits(view({ query: "heat" }))).toEqual([]);
  });

  it("puts the view's filters into words", () => {
    const labelOf = (c: string) => ({ Owner: "Owner", Links: "Linked documents", Effective: "Effective date" })[c] ?? c;
    expect(
      viewFilterWords(view({ query: "SOP", modifiedDays: 30, people: [{ col: "Owner", text: "Sam" }], present: ["Links"], dates: [{ col: "Effective", from: "2026-01-01", to: "" }] }), labelOf)
    ).toEqual(["“SOP”", "modified 30d", "Effective date 2026-01-01 to …", "Owner: Sam", "has linked documents"]);
    expect(viewFilterWords(view({ modifiedDays: 30, modifiedFrom: "2026-10-01" }), labelOf)).toEqual(["modified 2026-10-01 to …"]);
  });
});
