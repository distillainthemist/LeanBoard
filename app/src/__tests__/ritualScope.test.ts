// Who sees and who changes a ritual in Settings (programme G8, 2026-11-24).

import { describe, expect, it } from "vitest";
import { ritualStanding, sharedRitualNote } from "../screens/ritualScope";

const ritual = { site: "Bell Bay", ownerId: "owner", alsoSites: ["Weipa", "Gove"] };

describe("a ritual in Settings › Rituals", () => {
  it("a super admin manages every ritual", () => {
    expect(ritualStanding({ role: "superadmin", site: "", whoId: "s" }, ritual)).toBe("manage");
  });
  it("the primary site's admin manages it", () => {
    expect(ritualStanding({ role: "siteadmin", site: "Bell Bay", whoId: "a" }, ritual)).toBe("manage");
  });
  it("a secondary site's admin sees it and does not change it", () => {
    expect(ritualStanding({ role: "siteadmin", site: "Weipa", whoId: "a" }, ritual)).toBe("view");
  });
  it("an admin at a site it is not shown in does not see it", () => {
    expect(ritualStanding({ role: "siteadmin", site: "Boyne", whoId: "a" }, ritual)).toBe("none");
  });
  it("the owner manages it wherever it sits, whatever their role", () => {
    expect(ritualStanding({ role: "user", site: "Weipa", whoId: "owner" }, ritual)).toBe("manage");
    expect(ritualStanding({ role: "siteadmin", site: "Weipa", whoId: "owner" }, ritual)).toBe("manage");
  });
  it("anyone else has no standing here", () => {
    expect(ritualStanding({ role: "user", site: "Weipa", whoId: "u" }, ritual)).toBe("none");
    expect(ritualStanding({ role: "user", site: "Bell Bay", whoId: "" }, { ...ritual, ownerId: "" })).toBe("none");
  });
  it("an admin with no site is not matched to a ritual shown at no site", () => {
    expect(ritualStanding({ role: "siteadmin", site: "", whoId: "a" }, { site: "Bell Bay", ownerId: "o", alsoSites: [""] })).toBe("none");
  });
  it("the note names the primary site", () => {
    expect(sharedRitualNote("Bell Bay")).toBe("Also at your site, from Bell Bay");
    expect(sharedRitualNote("")).toBe("Also at your site, from another site");
  });
});
