// A department's part of a shared priority (R5 of the 2026-11-25 round, report 22).
import { describe, expect, it } from "vitest";
import { inPart, orgWithin, partLine, partNone } from "../priorities/orgPart";

const org = (site: string, department = "", area = "") => ({ company: "Acme", site, department, area });
const site = org("Weipa");
const casting = org("Weipa", "Casting");
const furnace = org("Weipa", "Casting", "Furnace");
const hr = org("Weipa", "HR");

describe("the Improvement tab's rule, by the org in view", () => {
  it("at the org or anywhere below it", () => {
    expect(orgWithin(casting, casting)).toBe(true);
    expect(orgWithin(furnace, casting)).toBe(true);
    expect(orgWithin(casting, furnace)).toBe(false);
    expect(orgWithin(hr, casting)).toBe(false);
    expect(orgWithin(furnace, site)).toBe(true);
    expect(orgWithin(org("Gove", "Casting"), casting)).toBe(false);
  });
  it("on the owner's own page every initiative is part of it", () => {
    expect(inPart([hr], site, site)).toBe(true);
  });
  it("on a department's page: filed under it or within it, or naming it in Also shown in", () => {
    expect(inPart([casting], casting, site)).toBe(true);
    expect(inPart([furnace], casting, site)).toBe(true);
    expect(inPart([site], casting, site)).toBe(false);
    expect(inPart([site, casting], casting, site)).toBe(true);
    expect(inPart([hr], casting, site)).toBe(false);
  });
  it("the mapping names the level or below: a department named does not show on its area's page", () => {
    expect(inPart([site, casting], furnace, site)).toBe(false);
    expect(inPart([site, furnace], furnace, site)).toBe(true);
  });
});

describe("words", () => {
  it("counts the part", () => {
    expect(partLine(2, 5, "Casting")).toBe("2 of 5 are Casting’s");
    expect(partLine(1, 5, "Casting")).toBe("1 of 5 is Casting’s");
  });
  it("says why a part is empty", () => {
    expect(partNone(5, "Casting")).toBe("None of this priority’s 5 initiatives are Casting’s. An initiative shows here when it is filed under Casting, or names it in “Also shown in”.");
  });
});
