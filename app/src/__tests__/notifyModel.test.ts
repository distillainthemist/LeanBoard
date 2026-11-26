// N2 — the notify plan: who the next step is and what the message says.
// The panel only paints what these functions decide, so the decisions
// are tested here, not in a browser.

import { describe, expect, it } from "vitest";
import {
  accessRequestPlan,
  escapeHtml,
  handsOver,
  notifyCard,
  notifyEmailHtml,
  notifyPlanFor,
  withoutSelf,
} from "../docs/notifyModel";

const P = (name: string, email: string) => ({ name, email });
const LINK = "https://apps.powerapps.com/play/e/env/app/app?ltkdoc=l%3A1&ltkmode=work#/";

const ROLES = {
  owners: [P("Olive Owner", "olive@x.com")],
  approvers: [P("Andy Approver", "andy@x.com"), P("Olive Owner", "olive@x.com")],
  reviewers: [P("Rita Reviewer", "rita@x.com")],
  editors: [P("Eddy Editor", "eddy@x.com")],
};

const base = {
  docName: "Mash SOP",
  actorName: "Ben",
  roles: ROLES,
  myEmail: "ben@x.com",
  link: LINK,
};

describe("notifyPlanFor", () => {
  it("submit for review notifies the reviewers", () => {
    const plan = notifyPlanFor({ ...base, commandKey: "submitReview", to: "inReview" });
    expect(plan?.recipients.map((p) => p.email)).toEqual(["rita@x.com"]);
    expect(plan?.subject).toBe("Review requested — Mash SOP");
    expect(plan?.message).toContain("Ben has submitted");
    expect(plan?.message).toContain("Please review");
    expect(plan?.link).toBe(LINK);
  });

  it("submit for approval targets the resolved stage: approvers or owner", () => {
    const toApprovers = notifyPlanFor({ ...base, commandKey: "submitApproval", to: "inApproval" });
    expect(toApprovers?.recipients.map((p) => p.email)).toEqual(["andy@x.com", "olive@x.com"]);
    const toOwner = notifyPlanFor({ ...base, commandKey: "submitApproval", to: "inOwnerApproval" });
    expect(toOwner?.recipients.map((p) => p.email)).toEqual(["olive@x.com"]);
    expect(toOwner?.message).toContain("final step");
  });

  it("an endorsement notifies the owner; the final approve closes the loop", () => {
    const endorse = notifyPlanFor({ ...base, commandKey: "approve", to: "inOwnerApproval" });
    expect(endorse?.recipients.map((p) => p.email)).toEqual(["olive@x.com"]);
    expect(endorse?.message).toContain("endorsed");
    const final = notifyPlanFor({ ...base, commandKey: "approve", to: "approved" });
    // reviewers + approvers, deduped — a courtesy, and it says so
    expect(final?.recipients.map((p) => p.email)).toEqual([
      "rita@x.com",
      "andy@x.com",
      "olive@x.com",
    ]);
    expect(final?.message).toContain("No action needed");
  });

  it("request revision goes to the owner and any granted editors", () => {
    const plan = notifyPlanFor({ ...base, commandKey: "requestRevision", to: "draft" });
    expect(plan?.recipients.map((p) => p.email)).toEqual(["olive@x.com", "eddy@x.com"]);
  });

  it("never notifies the actor about their own step", () => {
    const own = notifyPlanFor({
      ...base,
      myEmail: "olive@x.com",
      commandKey: "approve",
      to: "inOwnerApproval",
    });
    // a hand-over keeps its plan with nobody in it: the dialog says
    // "nobody else to tell" (2026-11-25, reports 15 and 18)
    expect(own?.recipients).toEqual([]);
  });

  it("a hand-over with nobody named still has a plan — reviewers may be added in the dialog", () => {
    const none = notifyPlanFor({
      ...base,
      roles: { ...ROLES, reviewers: [] },
      commandKey: "submitReview",
      to: "inReview",
    });
    expect(none).not.toBeNull();
    expect(none?.recipients).toEqual([]);
    expect(none?.subject).toContain("Mash SOP");
  });

  it("a notice nobody waits on has no plan when there is nobody to tell", () => {
    const final = notifyPlanFor({ ...base, roles: { ...ROLES, reviewers: [], approvers: [] }, commandKey: "approve", to: "approved" });
    expect(final).toBeNull();
    const retired = notifyPlanFor({ ...base, myEmail: "olive@x.com", commandKey: "markObsolete", to: "obsolete" });
    expect(retired).toBeNull();
  });

  it("a message never goes to the person sending it, or to anyone twice", () => {
    // Teams seats the caller itself: naming them is "Duplicate chat members"
    const picked = [P("Ben Pechey", "Ben@x.com"), P("Pechey Distilling", "partnership@x.com"), P("Again", "PARTNERSHIP@x.com"), P("No mail", "")];
    expect(withoutSelf(picked, "ben@x.com")).toEqual([P("Pechey Distilling", "partnership@x.com")]);
    expect(withoutSelf([P("Ben Pechey", "ben@x.com")], "ben@x.com")).toEqual([]);
  });

  it("knows which steps hand the document on", () => {
    expect(handsOver("submitReview", "inReview")).toBe(true);
    expect(handsOver("reviewComplete", "inReview")).toBe(true);
    expect(handsOver("submitApproval", "inApproval")).toBe(true);
    expect(handsOver("submitApproval", "inOwnerApproval")).toBe(true);
    expect(handsOver("requestRevision", "draft")).toBe(true);
    expect(handsOver("approve", "inOwnerApproval")).toBe(true);
    // the final approval's courtesy note and the notices are offered, not sent
    expect(handsOver("approve", "approved")).toBe(false);
    expect(handsOver("markSuperseded", "superseded")).toBe(false);
    expect(handsOver("markObsolete", "obsolete")).toBe(false);
    expect(handsOver("reinstate", "approved")).toBe(false);
    expect(handsOver("revise", "draft")).toBe(false);
  });

  it("start-revision derives no plan (no next actor)", () => {
    expect(notifyPlanFor({ ...base, commandKey: "revise", to: "draft" })).toBeNull();
  });

  it("drops entries without an email and dedupes by it", () => {
    const plan = notifyPlanFor({
      ...base,
      roles: {
        ...ROLES,
        reviewers: [P("No Mail", ""), P("Rita Reviewer", "rita@x.com"), P("Rita again", "RITA@x.com")],
      },
      commandKey: "submitReview",
      to: "inReview",
    });
    expect(plan?.recipients).toEqual([{ name: "Rita Reviewer", email: "rita@x.com" }]);
  });
});

describe("accessRequestPlan (N3)", () => {
  it("a request tells the owners; decisions tell the requester", () => {
    const req = accessRequestPlan({
      kind: "requested",
      docName: "Mash SOP",
      actorName: "Marketing",
      targets: [P("", "olive@x.com")],
      myEmail: "marketing@x.com",
      link: LINK,
    });
    expect(req?.recipients).toEqual([{ name: "olive@x.com", email: "olive@x.com" }]);
    expect(req?.subject).toBe("Edit access requested — Mash SOP");
    expect(req?.message).toContain("My tasks");
    const granted = accessRequestPlan({
      kind: "granted",
      docName: "Mash SOP",
      actorName: "Olive",
      targets: [P("Marketing", "marketing@x.com")],
      myEmail: "olive@x.com",
      link: LINK,
    });
    expect(granted?.recipients.map((p) => p.email)).toEqual(["marketing@x.com"]);
    expect(granted?.message).toContain("start the revision");
    const declined = accessRequestPlan({
      kind: "declined",
      docName: "Mash SOP",
      actorName: "Olive",
      targets: [P("Marketing", "marketing@x.com")],
      myEmail: "olive@x.com",
      link: LINK,
    });
    expect(declined?.message).toContain("declined");
  });

  it("collapses to null when the actor is the only target", () => {
    const plan = accessRequestPlan({
      kind: "requested",
      docName: "Mash SOP",
      actorName: "Olive",
      targets: [P("Olive", "olive@x.com")],
      myEmail: "olive@x.com",
      link: LINK,
    });
    expect(plan).toBeNull();
  });
});

describe("message rendering", () => {
  it("escapes and paragraphs the email body, appending the work link", () => {
    const html = notifyEmailHtml("Hello <you>\n\nSecond & last", "https://x/?a=1&b=2");
    expect(html).toContain("<p>Hello &lt;you&gt;</p>");
    expect(html).toContain("<p>Second &amp; last</p>");
    expect(html).toContain('href="https://x/?a=1&amp;b=2"');
    expect(html).toContain("Open the document in LeanBoard");
  });

  it("builds a v1.2 card with the message and an Open action", () => {
    const card = notifyCard("Subject", "Body text", LINK) as {
      version: string;
      body: { text: string }[];
      actions: { type: string; url: string }[];
    };
    expect(card.version).toBe("1.2");
    expect(card.body.map((b) => b.text)).toEqual(["Subject", "Body text"]);
    expect(card.actions[0]).toMatchObject({ type: "Action.OpenUrl", url: LINK });
  });

  it("quotes the recipient's own words under the message, in the card and the fallback", () => {
    const card = notifyCard("Subject", "Fixed in v0.70", LINK, { label: "Your report", text: "The grid <lost> my edit" }) as { body: { type: string; items?: { text: string }[] }[] };
    const box = card.body[2];
    expect(box.type).toBe("Container");
    expect(box.items?.map((i) => i.text)).toEqual(["Your report", "The grid <lost> my edit"]);
    const html = notifyEmailHtml("Fixed in v0.70", LINK, { label: "Your report", text: "The grid <lost> my edit" });
    expect(html).toContain("<blockquote>The grid &lt;lost&gt; my edit</blockquote>");
    expect((notifyCard("S", "M", LINK, { label: "Your report", text: "  " }) as { body: unknown[] }).body.length).toBe(2);
  });

  it("escapeHtml covers the four", () => {
    expect(escapeHtml('<a href="x">&</a>')).toBe("&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;");
  });

  it("chatTopic drops what Graph refuses in a chat topic and keeps the words (2026-10-26 flag report)", async () => {
    const { chatTopic } = await import("../docs/notifyModel");
    expect(chatTopic("Flag on “Test presentation.pptx” — Ellen's review")).toBe("Flag on Test presentation.pptx — Ellens review");
    expect(chatTopic("  a <b> & c  ")).toBe("a b c");
    expect(chatTopic("x".repeat(140)).length).toBe(100);
  });

  it("chatTopic turns a colon into a dash: Graph refuses one, and every subject has one (2026-11-23)", async () => {
    const { chatTopic } = await import("../docs/notifyModel");
    expect(chatTopic("Flagged for review: SOP 12.docx")).toBe("Flagged for review – SOP 12.docx");
    expect(chatTopic("Ingestion task: Legacy SOPs: batch 2")).toBe("Ingestion task – Legacy SOPs – batch 2");
    expect(chatTopic("Review requested:   Plan")).toBe("Review requested – Plan");
    expect(chatTopic(": leading and trailing :")).toBe("leading and trailing");
    // no colon of any kind survives, nor the other characters Teams refuses in a name
    for (const s of ["a:b", "a：b", "10:30 meeting", "what? a|b * c~d {e}", "tab\there"]) expect(chatTopic(s)).not.toMatch(/[:：|*?~{}\t]/);
  });

});
