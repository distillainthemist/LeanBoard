// Adding from the directory: who may, and where the person lands
// (issue 12, 2026-11-16).

import { describe, expect, it, vi } from "vitest";

vi.mock("../runtime", () => ({ currentViewer: () => null }));
vi.mock("../store/people", () => ({ searchEntra: async () => [], upsertPerson: async () => undefined, viewerPerson: async () => null }));

import { existingOutcome, placementFor } from "../people/directoryAdd";

describe("who may add from the directory", () => {
  const context = { site: "Weipa", department: "Mining" };

  it("lets a super admin add at the org being worked on", () => {
    expect(placementFor({ role: "superadmin", site: "Bell Bay" }, context)).toEqual({ site: "Weipa", department: "Mining" });
  });

  it("pins a site admin's add to their own site", () => {
    expect(placementFor({ role: "siteadmin", site: "Weipa" }, context)).toEqual({ site: "Weipa", department: "Mining" });
    expect(placementFor({ role: "siteadmin", site: "Bell Bay" }, context)).toEqual({ site: "Bell Bay", department: "" });
  });

  it("offers it to nobody else", () => {
    expect(placementFor({ role: "user", site: "Weipa" }, context)).toBeNull();
    expect(placementFor({ role: "siteadmin", site: "" }, context)).toBeNull();
  });

  it("keeps a company-level context unplaced for a super admin", () => {
    expect(placementFor({ role: "superadmin", site: "" }, { site: "", department: "" })).toEqual({ site: "", department: "" });
  });
});

describe("someone the app already knows", () => {
  it("is added when new, chosen when on the roster, refused when revoked", () => {
    expect(existingOutcome(null)).toBe("add");
    expect(existingOutcome({ who: "Jane", active: true })).toBe("choose");
    expect(existingOutcome({ who: "Jane", active: false })).toBe("revoked");
  });
});
