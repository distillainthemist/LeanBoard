import { describe, expect, it } from "vitest";
import { DEFAULT_REVIEW_LEVELS, DocFlag, flagChipText, flagKey, flagNotice, flagTitle, flagsByDoc, flagsForTasks, reviewLevelsOf } from "../docs/docFlagsModel";

const flag = (over: Partial<DocFlag>): DocFlag => ({
  id: "f", site: "https://x/sites/a", listId: "l1", itemId: 1, uid: "", docName: "Doc", docVersion: "2.0", level: "Content review", comment: "", status: "open", source: "register",
  flaggerEmail: "ann@x.com", flaggerName: "Ann", flaggedAt: "2026-10-19T00:00:00Z", closedByName: "", closedAt: "", resolution: "", hasScreenshot: false, ...over,
});

describe("document flags (issue 23)", () => {
  it("levels: the site's own list, else the defaults", () => {
    expect(reviewLevelsOf({ reviewLevels: [] })).toEqual(DEFAULT_REVIEW_LEVELS);
    expect(reviewLevelsOf({ reviewLevels: [" Typo ", ""] })).toEqual(["Typo"]);
  });
  it("keys and groups by list + item, case-blind", () => {
    expect(flagKey("ABC", 7)).toBe("abc:7");
    const m = flagsByDoc([flag({ id: "a", listId: "L1" }), flag({ id: "b" }), flag({ id: "c", itemId: 2 })]);
    expect(m.get("l1:1")?.map((f) => f.id)).toEqual(["a", "b"]);
    expect(m.get("l1:2")?.length).toBe(1);
  });
  it("title and chip", () => {
    expect(flagTitle(" Full rewrite ", "Doc A ")).toBe("Full rewrite — Doc A");
    expect(flagChipText([])).toBe("");
    expect(flagChipText([flag({})])).toBe("⚑ Content review");
    expect(flagChipText([flag({}), flag({ id: "g" })])).toBe("⚑ 2 open flags");
  });
  it("tasks: controllers see every open flag; owners see their own documents; closed never", () => {
    const flags = [flag({ id: "a", flaggedAt: "2026-10-01" }), flag({ id: "b", itemId: 2, flaggedAt: "2026-10-05" }), flag({ id: "c", status: "closed" })];
    const owners = (f: DocFlag) => (f.itemId === 2 ? ["Ben@x.com"] : f.itemId === 1 ? ["other@x.com"] : null);
    expect(flagsForTasks(flags, { myEmail: "ben@x.com", isController: true, ownerEmailsOf: owners }).map((f) => f.id)).toEqual(["b", "a"]);
    expect(flagsForTasks(flags, { myEmail: "ben@x.com", isController: false, ownerEmailsOf: owners }).map((f) => f.id)).toEqual(["b"]);
    expect(flagsForTasks(flags, { myEmail: "", isController: false, ownerEmailsOf: owners })).toEqual([]);
  });
  it("the owners' card quotes the comment", () => {
    const n = flagNotice({ level: "Withdraw", docName: "SOP 1", flaggerName: "Ann", comment: " out of date " });
    expect(n.subject).toBe("Flagged for review: SOP 1");
    expect(n.message).toContain("Ann flagged “SOP 1” — Withdraw");
    expect(n.quote.text).toBe("out of date");
    expect(flagNotice({ level: "x", docName: "d", flaggerName: "", comment: "" }).quote.text).toBe("(no comment)");
  });
});
