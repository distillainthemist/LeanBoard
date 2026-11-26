// Approving on behalf, with evidence (R4 of the 2026-11-25 round, report 12).
import { describe, expect, it } from "vitest";
import { approvalStep, behalfBase, behalfCandidates, behalfCard, evidenceLabel, evidenceParentId, evidencePrefix } from "../docs/onBehalfModel";

const kat = { name: "Kat", email: "kat@x.com" };
const sam = { name: "Sam", email: "Sam@x.com" };
const owner = { name: "Olga", email: "olga@x.com" };
const roles = { owners: [owner], approvers: [kat, sam, kat] };

describe("who a controller approves for", () => {
  it("the step follows where the command leads", () => {
    expect(approvalStep("inOwnerApproval")).toBe("approvers");
    expect(approvalStep("approved")).toBe("owner");
    expect(approvalStep("draft")).toBeNull();
  });
  it("the named approvers at their step, the owner at the owner's", () => {
    expect(behalfCandidates("approvers", roles, "ctl@x.com")).toEqual([kat, sam]);
    expect(behalfCandidates("owner", roles, "ctl@x.com")).toEqual([owner]);
  });
  it("a controller named at the step approves in their own right", () => {
    expect(behalfCandidates("approvers", roles, "SAM@x.com")).toEqual([]);
    expect(behalfCandidates("owner", roles, "olga@x.com")).toEqual([]);
    // named as an approver, but this is the owner's step
    expect(behalfCandidates("owner", roles, "kat@x.com")).toEqual([owner]);
  });
});

describe("the record", () => {
  it("the comment names both", () => {
    expect(behalfBase("Approved", "O'Brien, Ben", [kat])).toBe("Approved by O'Brien, Ben on behalf of Kat");
    expect(behalfBase("Approved", "Ben", [kat, sam, owner])).toBe("Approved by Ben on behalf of Kat, Sam and Olga");
    expect(behalfBase("Approved", "", [{ name: "", email: "x@y.com" }])).toBe("Approved on behalf of x@y.com");
  });
  it("evidence is kept against the document and the version", () => {
    const id = evidenceParentId("ABCDEF12-0000-4000-8000-000000000001", "12.0");
    expect(id).toBe("abcdef12-0000-4000-8000-000000000001/12.0");
    expect(id.length).toBeLessThanOrEqual(80);
    expect(id.startsWith(evidencePrefix("ABCDEF12-0000-4000-8000-000000000001"))).toBe(true);
    expect(evidenceLabel(id)).toBe("12.0");
    expect(evidenceLabel("nothing")).toBe("");
  });
  it("the person approved for is told what was done in their name", () => {
    const c = behalfCard("Crane SOP.docx", "Ben", "owner", "as agreed by email", 2);
    expect(c.subject).toBe("Approved on your behalf — Crane SOP.docx");
    expect(c.text).toBe("Hi — Ben approved “Crane SOP.docx” on your behalf in LeanBoard. 2 files were attached as evidence; it is on that version in the document's history. If this was not agreed with you, tell them or a document controller.\n\nComment: as agreed by email");
    expect(behalfCard("A.docx", "Ben", "approvers", "", 0).text).toBe("Hi — Ben endorsed “A.docx” on your behalf in LeanBoard. If this was not agreed with you, tell them or a document controller.");
  });
});
