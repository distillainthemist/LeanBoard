// The Priorities page's decision zone (2026-11-18): what waits on an org
// from below and from above, the priorities that have lost their column,
// and the messages its steps offer.
import { describe, expect, it } from "vitest";
import { orgRef, orphansOf, waitingAt } from "../priorities/model";
import { stepDraft, stepRecipients } from "../priorities/stepMessageModel";

const weipa = orgRef("PacOps", "Weipa");
const bsl = orgRef("PacOps", "BSL");
const a = (id: string, org: typeof weipa, status: "proposed" | "onhold" | "accepted" | "rejected", decidedById = "") => ({ id, org, status, decidedById });

describe("what waits on an org", () => {
  const all = [
    a("held", weipa, "onhold", "u1"),
    a("cascade", weipa, "proposed"),
    a("pull", weipa, "proposed", "u2"),
    a("done", weipa, "accepted", "u1"),
    a("gone", weipa, "rejected", "u1"),
    a("elsewhere", bsl, "proposed"),
  ];
  it("sorts a direct report's pull with the proposals and a cascade with what came from above", () => {
    const w = waitingAt(weipa, all);
    expect(w.fromBelow.map((x) => x.id)).toEqual(["pull"]);
    expect(w.fromAbove.map((x) => x.id)).toEqual(["cascade", "held"]);
  });
  it("lists what awaits before what is on hold, and nothing already answered", () => {
    const w = waitingAt(weipa, all);
    expect([...w.fromBelow, ...w.fromAbove].some((x) => x.id === "done" || x.id === "gone")).toBe(false);
  });
  it("keeps to the org asked about", () => {
    expect(waitingAt(bsl, all).fromAbove.map((x) => x.id)).toEqual(["elsewhere"]);
    expect(waitingAt(orgRef("PacOps", "BBA"), all)).toEqual({ fromBelow: [], fromAbove: [] });
  });
});

describe("the priorities with no column in the year shown", () => {
  const live = [
    { id: "L1", level: 1 as const, active: true },
    { id: "S1", level: 2 as const, active: true },
    { id: "S2", level: 2 as const, active: true },
    { id: "S9", level: 2 as const, active: false },
  ];
  const ps = [{ id: "a", col: "S1" }, { id: "b", col: "S4" }, { id: "c", col: "S9" }, { id: "d", col: "L1" }, { id: "e", col: "S2" }];
  it("are those whose sub-pillar is not live that year", () => {
    expect(orphansOf(ps, (p) => p.col, live).map((p) => p.id)).toEqual(["b", "c", "d"]);
  });
  it("are none when every sub-pillar is live — whatever is filtered on screen", () => {
    expect(orphansOf([ps[0], ps[4]], (p) => p.col, live)).toEqual([]);
  });
});

describe("the message a step offers", () => {
  const facts = { statement: "Zero Harm - CRM Maturity Uplift", org: "Weipa", by: "Smith, Jane" };
  it("says what happened, in the receiver's terms", () => {
    expect(stepDraft("proposed", facts).body).toContain("waiting in the Proposed row");
    expect(stepDraft("cascaded", { ...facts, org: "PacOps", toOrgs: ["Weipa", "BSL"] }).body).toContain("from PacOps to Weipa, BSL");
    expect(stepDraft("accepted", facts).subject).toBe("Weipa accepted: Zero Harm - CRM Maturity Uplift");
  });
  it("a link names the parent and what moved with it (programme D9)", () => {
    const d = stepDraft("linked", { ...facts, parent: "PacOps's “Zero Harm”", moved: "It moves to Safety. 2 priorities made from it move with it." });
    expect(d.subject).toBe("Priority linked to a parent: Zero Harm - CRM Maturity Uplift");
    expect(d.body).toContain("has linked Weipa's priority “Zero Harm - CRM Maturity Uplift” under PacOps's “Zero Harm”.");
    expect(d.body).toContain("It now counts toward that priority");
    expect(d.body).toContain("2 priorities made from it move with it.");
    // nothing moved: no extra line
    expect(stepDraft("linked", { ...facts, parent: "PacOps's “Zero Harm”" }).body.split("\n")).toHaveLength(2);
  });
  it("carries the reason for a hold or a decline, and only then", () => {
    expect(stepDraft("held", { ...facts, reason: " No capacity until Q3 " }).body).toContain("Reason: No capacity until Q3");
    expect(stepDraft("declined", { ...facts, reason: "" }).body).not.toContain("Reason");
    expect(stepDraft("proposal-declined", { ...facts, reason: "Covered elsewhere" }).body).toContain("Reason: Covered elsewhere");
    expect(stepDraft("proposal-held", { ...facts, reason: "Budget" }).body).toContain("on hold for Weipa.\nReason: Budget");
  });
  it("shortens a long statement in the subject only", () => {
    const long = "x".repeat(120);
    const d = stepDraft("accepted", { ...facts, statement: long });
    expect(d.subject.length).toBeLessThan(110);
    expect(d.body).toContain(long);
  });
});

describe("who a step's message opens addressed to", () => {
  const names: Record<string, string> = { u1: "O'Brien, Ben", u2: "Smith, Jane", u3: "Lee, Sam" };
  const mails: Record<string, string> = { u1: "ben@x.test", u2: "jane@x.test", u3: "" };
  const to = (ids: string[], sender: string) => stepRecipients(ids, (id) => names[id] ?? "", (id) => mails[id] ?? "", sender);
  it("is the people named who have an email, once each", () => {
    expect(to(["u2", "u2", "u1"], "u9")).toEqual([{ name: "Smith, Jane", email: "jane@x.test" }, { name: "O'Brien, Ben", email: "ben@x.test" }]);
  });
  it("never the sender, and nobody without an email — so there may be no one to tell", () => {
    expect(to(["u1"], "u1")).toEqual([]);
    expect(to(["u3", ""], "u9")).toEqual([]);
  });
});
