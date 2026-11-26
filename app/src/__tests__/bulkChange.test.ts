// Bulk change of properties (R4 of the 2026-11-25 round, N3): what a
// change does to a document's values, which documents are skipped and
// why, the Importance date rule, the comment and the report.
import { describe, expect, it } from "vitest";
import { BulkChange, BulkDoc, BulkValue, DRAFT_NOTE, applyChange, changeProblem, changeWords, changesProblem, commentFor, opsFor, planDoc, previewLine, reportRows, timeWords } from "../docs/bulkChangeModel";

const t = (key: string, label = key): BulkValue => ({ key, label });
const A = t("aaaa", "Metal Delivery General");
const B = t("bbbb", "Casthouse General");
const C = t("cccc", "Crane Ops");
const change = (over: Partial<BulkChange> = {}): BulkChange => ({ internal: "Area", label: "Process area", kind: "taxonomy", multi: true, op: "set", values: [B], from: [], ...over });
const doc = (over: Partial<BulkDoc> = {}): BulkDoc => ({
  id: 1,
  listId: "L",
  uid: "U",
  name: "Procedure.docx",
  serverUrl: "/sites/x/Standards/Procedure.docx",
  libName: "Controlled standards",
  libType: "standard",
  stage: "approved",
  checkedOutTo: "",
  checkedOutToMe: false,
  site: "mine",
  carries: new Set(["Area", "Importance", "Owner"]),
  required: new Set(),
  current: new Map([["Area", { values: [A, C], readable: true }]]),
  effectiveYmd: "2025-03-31",
  reviewYmd: "2027-03-31",
  ...over,
});
const ctx = { importanceInternal: "Importance", cadence: { high: 12, low: 36 }, today: "2026-11-27" };

describe("one change on one document's values", () => {
  it("set replaces everything; the same set is no change", () => {
    expect(applyChange(change(), [A, C])).toEqual({ next: [B], changed: true, why: "" });
    expect(applyChange(change({ values: [C, A] }), [A, C]).changed).toBe(false);
  });
  it("add keeps what is there", () => {
    expect(applyChange(change({ op: "add" }), [A, C]).next).toEqual([A, C, B]);
    expect(applyChange(change({ op: "add", values: [C] }), [A, C])).toEqual({ next: [A, C], changed: false, why: "already has it" });
  });
  it("remove takes one off, and leaves a document that lacks it alone", () => {
    expect(applyChange(change({ op: "remove", values: [A] }), [A, C]).next).toEqual([C]);
    expect(applyChange(change({ op: "remove", values: [B] }), [A, C]).why).toBe("does not have it");
  });
  it("replace swaps one value and touches only documents that have it", () => {
    const swap = change({ op: "replace", from: [A], values: [B] });
    expect(applyChange(swap, [A, C]).next).toEqual([C, B]);
    expect(applyChange(swap, [C])).toEqual({ next: [C], changed: false, why: "does not have “Metal Delivery General”" });
    // the replacement is already there beside the wrong one: no duplicate
    expect(applyChange(swap, [A, B]).next).toEqual([B]);
  });
  it("terms and people compare without case, text exactly", () => {
    expect(applyChange(change({ values: [t("BBBB", "Casthouse General")] }), [B]).changed).toBe(false);
    const text = change({ kind: "text", multi: false, values: [t("Rev B")] });
    expect(applyChange(text, [t("rev b")]).changed).toBe(true);
  });
  it("a single-valued property offers set only", () => {
    expect(opsFor(false)).toEqual(["set"]);
    expect(opsFor(true)).toEqual(["set", "add", "remove", "replace"]);
    expect(changeProblem(change({ multi: false, op: "add" }))).toMatch(/can only be set/);
  });
  it("says what a change still needs", () => {
    expect(changeProblem(change({ values: [] }))).toMatch(/choose the new value/);
    expect(changeProblem(change({ op: "replace", from: [] }))).toMatch(/choose the value to replace/);
    expect(changeProblem(change({ op: "replace", from: [B], values: [B] }))).toMatch(/are the same/);
    expect(changesProblem([change(), change({ op: "add" })])).toMatch(/changed twice/);
    expect(changesProblem([])).toBe("Choose a property.");
    expect(changesProblem([change()])).toBe("");
  });
});

describe("which documents change", () => {
  it("an approved document changes and is published again", () => {
    const p = planDoc(doc(), [change({ op: "replace", from: [A], values: [B] })], ctx);
    expect(p.state).toBe("change");
    expect(p.readerFacing).toBe(true);
    expect(p.writes[0].before).toEqual([A, C]);
    expect(p.writes[0].after).toEqual([C, B]);
    expect(p.notes).toEqual([]);
  });
  it("skips another site's, a checked-out one and one in circulation, with the reason", () => {
    const c = [change()];
    expect(planDoc(doc({ site: "other" }), c, ctx).reason).toBe("Belongs to another site.");
    expect(planDoc(doc({ checkedOutTo: "Kat" }), c, ctx).reason).toBe("Checked out to Kat.");
    expect(planDoc(doc({ checkedOutTo: "Me", checkedOutToMe: true }), c, ctx).reason).toMatch(/Checked out to you/);
    expect(planDoc(doc({ stage: "inReview" }), c, ctx).reason).toBe("It is in review.");
    expect(planDoc(doc({ stage: "inApproval" }), c, ctx).reason).toBe("It is awaiting approval.");
    expect(planDoc(doc({ stage: "inOwnerApproval" }), c, ctx).reason).toBe("It is awaiting owner approval.");
    expect(planDoc(doc({ stage: "" }), c, ctx).reason).toBe("Its status could not be read.");
  });
  it("a working document has no lifecycle and no publish", () => {
    const p = planDoc(doc({ libType: "working", stage: "" }), [change()], ctx);
    expect(p.state).toBe("change");
    expect(p.readerFacing).toBe(false);
  });
  it("a draft is changed and marked", () => {
    const p = planDoc(doc({ stage: "draft" }), [change()], ctx);
    expect(p.state).toBe("change");
    expect(p.readerFacing).toBe(false);
    expect(p.notes).toEqual([DRAFT_NOTE]);
  });
  it("a document that already has the value is skipped; so is one whose value could not be read", () => {
    expect(planDoc(doc({ current: new Map([["Area", { values: [B], readable: true }]]) }), [change()], ctx).reason).toBe("Process area: already has the new value.");
    expect(planDoc(doc({ current: new Map([["Area", { values: [A], readable: false }]]) }), [change()], ctx).reason).toMatch(/could not be read whole/);
    expect(planDoc(doc({ carries: new Set(["Owner"]) }), [change()], ctx).reason).toBe("Process area: its library has no such property.");
  });
  it("several properties: a document takes the ones that apply to it", () => {
    const owner = change({ internal: "Owner", label: "Owner", kind: "person", multi: false, values: [t("kat@x.com", "Kat")] });
    const d = doc({ current: new Map([["Area", { values: [B], readable: true }], ["Owner", { values: [t("sam@x.com", "Sam")], readable: true }]]) });
    const p = planDoc(d, [change(), owner], ctx);
    expect(p.state).toBe("change");
    expect(p.writes.map((w) => w.change.label)).toEqual(["Owner"]);
    const none = planDoc(doc({ current: new Map([["Area", { values: [B], readable: true }], ["Owner", { values: [t("KAT@x.com", "Kat")], readable: true }]]) }), [change(), owner], ctx);
    expect(none.reason).toBe("Nothing to change: Process area: already has the new value; Owner: already has the new value.");
  });
  it("remove may empty a property unless it is required", () => {
    const rm = change({ op: "remove", values: [A, C] });
    expect(planDoc(doc(), [rm], ctx).writes[0].after).toEqual([]);
    expect(planDoc(doc({ required: new Set(["Area"]) }), [rm], ctx).reason).toBe("Process area is required here and would be left empty.");
  });
});

describe("Importance moves the review date and never the effective date", () => {
  const imp = (key: string, label: string) => change({ internal: "Importance", label: "Importance", multi: false, values: [t(key, label)] });
  const d = doc({ current: new Map([["Importance", { values: [t("low", "Low")], readable: true }]]) });
  it("counts the review date again from the effective date", () => {
    const p = planDoc(d, [imp("HIGH", "High")], ctx);
    expect(p.review).toEqual({ months: 12, from: "2027-03-31", to: "2026-03-31", due: true });
    expect(p.notes).toEqual(["Its new review date is already past: it becomes due for review at once."]);
    expect(p.doc.effectiveYmd).toBe("2025-03-31");
  });
  it("a longer cadence is not due", () => {
    const p = planDoc(doc({ current: new Map([["Importance", { values: [t("high", "High")], readable: true }]]) }), [imp("low", "Low")], ctx);
    expect(p.review).toEqual({ months: 36, from: "2027-03-31", to: "2028-03-31", due: false });
    expect(p.notes).toEqual([]);
  });
  it("an unmapped term or an unread effective date moves nothing", () => {
    expect(planDoc(d, [imp("other", "Other")], ctx).review).toBeNull();
    expect(planDoc({ ...d, effectiveYmd: "" }, [imp("high", "High")], ctx).review).toBeNull();
  });
  it("no other property touches a date", () => {
    expect(planDoc(doc(), [change()], ctx).review).toBeNull();
  });
});

describe("words", () => {
  it("says each change as the comment will", () => {
    expect(changeWords(change())).toBe("Process area set to “Casthouse General”");
    expect(changeWords(change({ op: "add", values: [C] }))).toBe("Process area: “Crane Ops” added");
    expect(changeWords(change({ op: "remove", values: [C] }))).toBe("Process area: “Crane Ops” removed");
    expect(changeWords(change({ op: "replace", from: [A] }))).toBe("Process area: “Metal Delivery General” replaced with “Casthouse General”");
  });
  it("the comment carries only what touched this document, who and why", () => {
    const p = planDoc(doc(), [change({ op: "replace", from: [A] }), change({ internal: "Owner", label: "Owner", kind: "person", multi: false, values: [t("kat@x.com", "Kat")] })], ctx);
    expect(commentFor(p, " BSL tree repair ", "O'Brien, Ben")).toBe("Bulk change by O'Brien, Ben: Process area: “Metal Delivery General” replaced with “Casthouse General”; Owner set to “Kat”. Reason: BSL tree repair");
    expect(commentFor(p, "x".repeat(2000), "Ben").length).toBe(1000);
  });
  it("counts the preview and words the time", () => {
    const plans = [planDoc(doc(), [change()], ctx), planDoc(doc({ stage: "inReview" }), [change()], ctx)];
    expect(previewLine(plans, 1)).toBe("1 of 1 document will change, 1 is skipped.");
    expect(timeWords(10, 20)).toBe("under a minute");
    expect(timeWords(40, 20)).toBe("about 2 minutes");
    expect(timeWords(4000, 20)).toBe("about 3.3 hours");
    expect(timeWords(0, 20)).toBe("");
  });
  it("the report holds each old value", () => {
    const ok = planDoc(doc(), [change({ op: "replace", from: [A] })], ctx);
    const skipped = planDoc(doc({ name: "Other.docx", checkedOutTo: "Kat" }), [change()], ctx);
    expect(reportRows([{ plan: ok, outcome: "changed", detail: "" }, { plan: skipped, outcome: "skipped", detail: "" }, { plan: ok, outcome: "failed", detail: "Check-in was refused" }])).toEqual([
      ["Procedure.docx", "Controlled standards", "Process area", "Metal Delivery General; Crane Ops", "Crane Ops; Casthouse General", "Changed", ""],
      ["Other.docx", "Controlled standards", "", "", "", "Skipped", "Checked out to Kat."],
      ["Procedure.docx", "Controlled standards", "Process area", "Metal Delivery General; Crane Ops", "Crane Ops; Casthouse General", "Failed", "Check-in was refused"],
    ]);
  });
});
