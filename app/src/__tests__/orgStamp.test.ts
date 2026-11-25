// The org on the action row (programme E13, 2026-11-25).

import { describe, expect, it } from "vitest";
import { assigneeStamp, isStamped, makeStamp, NO_ORG_STAMP, orgTokens, raisedStamp, renameInStamp, scopeToken, stampHas, stampNeedle } from "../actions/orgStamp";

const roster: Record<string, { site: string; department: string; area: string }> = {
  ana: { site: "Weipa", department: "Mine", area: "Crew A" },
  bo: { site: "Weipa", department: "Mine", area: "" },
  cy: { site: "Bell Bay", department: "Casting", area: "" },
  dee: { site: "", department: "", area: "" },
};
const placeOf = (id: string) => roster[id] ?? null;

describe("an org's tokens", () => {
  it("are its site, department and area, widest first", () => {
    expect(orgTokens({ site: "Weipa", department: "Mine", area: "Crew A" })).toEqual(["Weipa", "Weipa>Mine", "Weipa>Mine>Crew A"]);
    expect(orgTokens({ site: "Weipa", department: "", area: "" })).toEqual(["Weipa"]);
    // an area with no department is not a place
    expect(orgTokens({ site: "Weipa", department: "", area: "Crew A" })).toEqual(["Weipa"]);
    expect(orgTokens({ site: "", department: "Mine" })).toEqual([]);
    expect(orgTokens(null)).toEqual([]);
  });
  it("never carry a separator from a name", () => {
    expect(orgTokens({ site: "A|B", department: "C > D", area: "" })).toEqual(["A B", "A B>C D"]);
  });
});

describe("where an action's assignees sit", () => {
  it("each org once, sites first", () => {
    expect(assigneeStamp([{ whoId: "ana" }, { whoId: "bo" }], placeOf)).toBe("|Weipa|Weipa>Mine|Weipa>Mine>Crew A|");
  });
  it("an action shared across orgs carries both", () => {
    const s = assigneeStamp([{ whoId: "ana" }, { whoId: "cy" }], placeOf);
    expect(stampHas(s, "Weipa")).toBe(true);
    expect(stampHas(s, "Bell Bay>Casting")).toBe(true);
    expect(s.startsWith("|Weipa|Bell Bay|")).toBe(true);
  });
  it("nobody placed is stamped, with nothing to find", () => {
    expect(assigneeStamp([{ whoId: "dee" }, { whoId: "" }, { whoId: "stranger" }], placeOf)).toBe(NO_ORG_STAMP);
    expect(assigneeStamp([], placeOf)).toBe(NO_ORG_STAMP);
    expect(isStamped(NO_ORG_STAMP)).toBe(true);
    expect(isStamped("")).toBe(false);
    expect(isStamped(null)).toBe(false);
  });
});

describe("a scope's filter", () => {
  it("looks for its narrowest level, whole tokens only", () => {
    expect(scopeToken({ site: "Weipa", department: "", area: "" })).toBe("Weipa");
    expect(scopeToken({ site: "Weipa", department: "Mine", area: "" })).toBe("Weipa>Mine");
    expect(scopeToken({ site: "Weipa", department: "Mine", area: "Crew A" })).toBe("Weipa>Mine>Crew A");
    expect(scopeToken({ site: "", department: "", area: "" })).toBeNull();
    expect(stampNeedle("Weipa>Mine")).toBe("|Weipa>Mine|");
    // "Weipa" must not find "Weipa North", nor "Mine" find "Mine East"
    const other = assigneeStamp([{ whoId: "x" }], () => ({ site: "Weipa North", department: "Mine East", area: "" }));
    expect(stampHas(other, "Weipa")).toBe(false);
    expect(stampHas(other, "Weipa North>Mine")).toBe(false);
    expect(stampHas(other, "Weipa North")).toBe(true);
  });
});

describe("where it was raised", () => {
  it("is its home org's tokens, or none", () => {
    expect(raisedStamp({ site: "Weipa", department: "Mine", area: "" })).toBe("|Weipa|Weipa>Mine|");
    expect(raisedStamp(null)).toBe(NO_ORG_STAMP);
  });
});

describe("a stamp cut to its column", () => {
  it("keeps the site tokens first", () => {
    const tokens = Array.from({ length: 40 }, (_, i) => [`Site ${i}`, `Site ${i}>Department ${i}`, `Site ${i}>Department ${i}>Area ${i}`]).flat();
    const s = makeStamp(tokens, 400);
    expect(s.length).toBeLessThanOrEqual(400);
    for (let i = 0; i < 40; i++) expect(stampHas(s, `Site ${i}`)).toBe(true);
    expect(s.endsWith("|")).toBe(true);
  });
});

describe("a rename", () => {
  const s = "|Weipa|Bell Bay|Weipa>Mine|Weipa>Mine>Crew A|Weipa>Plant|";
  it("moves a site and everything under it", () => {
    const r = renameInStamp(s, "Weipa", "Weipa North");
    expect(stampHas(r, "Weipa")).toBe(false);
    for (const t of ["Weipa North", "Weipa North>Mine", "Weipa North>Mine>Crew A", "Weipa North>Plant", "Bell Bay"]) expect(stampHas(r, t)).toBe(true);
  });
  it("moves a department and its areas only", () => {
    const r = renameInStamp(s, "Weipa>Mine", "Weipa>Mining");
    for (const t of ["Weipa", "Weipa>Mining", "Weipa>Mining>Crew A", "Weipa>Plant"]) expect(stampHas(r, t)).toBe(true);
    expect(stampHas(r, "Weipa>Mine")).toBe(false);
  });
  it("leaves a stamp it does not touch, and an unstamped row, alone", () => {
    expect(renameInStamp(s, "Gove", "Gove 2")).toBe(s);
    expect(renameInStamp("", "Weipa", "X")).toBe("");
    expect(renameInStamp(NO_ORG_STAMP, "Weipa", "X")).toBe(NO_ORG_STAMP);
  });
});
