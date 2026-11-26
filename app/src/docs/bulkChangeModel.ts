// Bulk change of properties — the rules (2026-11-27, R4 of the
// 2026-11-25 round, N3). A document controller filters the register to
// a set and changes one or more properties on all of it. Pure: what a
// change does to a document's present values, which documents are
// skipped and why, the version comment, the Importance date rule and
// the report. The dialog and the writes are bulkChange.ts.
//
// Decisions made on the walk with Ben (issue-review-2026-11-25.md, R4):
//  - the filters choose the set, the preview trims it;
//  - a property that holds SEVERAL values takes four operations — set,
//    add, remove, replace one with another — because "one new value"
//    would wipe the others; a single-valued property takes set only;
//  - a value is never cleared by "set" (a blank writes nothing, as in
//    Edit properties); "remove" may empty a property that is not
//    required;
//  - Importance IS offered: cadence and review date follow as in Edit
//    properties, the effective (last reviewed) date is never written;
//  - drafts are changed and marked; documents in circulation, checked
//    out, or another site's are skipped.

import { LifecycleStage, addMonthsYmd } from "./model";

export type BulkOp = "set" | "add" | "remove" | "replace";
export type BulkKind = "taxonomy" | "person" | "choice" | "text";

/** One value of a property: a term (key = its id), a person (key = the
 *  email) or a text (key = the text itself). Keys compare lowercased
 *  for terms and people, exactly for text. */
export interface BulkValue {
  key: string;
  label: string;
}

export interface BulkChange {
  internal: string;
  label: string;
  kind: BulkKind;
  /** The column holds several values. */
  multi: boolean;
  op: BulkOp;
  /** set: the new value(s) · add: what is added · remove: what is taken
   *  off · replace: what goes IN. */
  values: BulkValue[];
  /** replace only: what comes OUT. */
  from: BulkValue[];
}

export const OP_WORDS: Record<BulkOp, string> = {
  set: "Set to",
  add: "Add",
  remove: "Remove",
  replace: "Replace one with another",
};

/** The operations a property offers. */
export function opsFor(multi: boolean): BulkOp[] {
  return multi ? ["set", "add", "remove", "replace"] : ["set"];
}

const norm = (kind: BulkKind, key: string): string => (kind === "text" || kind === "choice" ? key.trim() : key.trim().toLowerCase());
const has = (kind: BulkKind, list: BulkValue[], v: BulkValue): boolean => list.some((x) => norm(kind, x.key) === norm(kind, v.key));
const without = (kind: BulkKind, list: BulkValue[], gone: BulkValue[]): BulkValue[] => list.filter((x) => !has(kind, gone, x));
const sameSet = (kind: BulkKind, a: BulkValue[], b: BulkValue[]): boolean => a.length === b.length && a.every((x) => has(kind, b, x));

/** Why a change cannot be previewed yet; "" = it can. */
export function changeProblem(c: BulkChange): string {
  if (c.internal === "") return "Choose a property.";
  if (!opsFor(c.multi).includes(c.op)) return `${c.label}: holds one value, so it can only be set.`;
  if (c.values.length === 0) return `${c.label}: choose ${c.op === "remove" ? "what to remove" : c.op === "add" ? "what to add" : "the new value"}.`;
  if (c.op === "replace" && c.from.length === 0) return `${c.label}: choose the value to replace.`;
  if (c.op === "replace" && c.from.some((f) => has(c.kind, c.values, f))) return `${c.label}: the value to replace and its replacement are the same.`;
  if (!c.multi && c.values.length > 1) return `${c.label}: holds one value.`;
  return "";
}

/** Two changes on one property in the same run would fight. */
export function changesProblem(changes: BulkChange[]): string {
  for (const c of changes) {
    const p = changeProblem(c);
    if (p !== "") return p;
  }
  const seen = new Set<string>();
  for (const c of changes) {
    if (seen.has(c.internal)) return `${c.label} is changed twice. One change for each property.`;
    seen.add(c.internal);
  }
  return changes.length === 0 ? "Choose a property." : "";
}

export interface Applied {
  next: BulkValue[];
  changed: boolean;
  /** When not changed, the reason in a few words. */
  why: string;
}

/** What one change does to a document's present values. */
export function applyChange(c: BulkChange, current: BulkValue[]): Applied {
  const same = (why: string): Applied => ({ next: current, changed: false, why });
  switch (c.op) {
    case "set":
      return sameSet(c.kind, current, c.values) ? same("already has the new value") : { next: c.values, changed: true, why: "" };
    case "add": {
      const fresh = c.values.filter((v) => !has(c.kind, current, v));
      return fresh.length === 0 ? same("already has it") : { next: [...current, ...fresh], changed: true, why: "" };
    }
    case "remove": {
      const next = without(c.kind, current, c.values);
      return next.length === current.length ? same("does not have it") : { next, changed: true, why: "" };
    }
    case "replace": {
      if (!c.from.some((f) => has(c.kind, current, f))) return same(`does not have ${c.from.map((f) => `“${f.label}”`).join(", ")}`);
      const kept = without(c.kind, current, c.from);
      return { next: [...kept, ...c.values.filter((v) => !has(c.kind, kept, v))], changed: true, why: "" };
    }
  }
}

// ---- a document ---------------------------------------------------------------

export interface BulkDoc {
  id: number;
  listId: string;
  uid: string;
  name: string;
  serverUrl: string;
  libName: string;
  /** "standard" documents have a lifecycle; "working" ones do not. */
  libType: string;
  stage: LifecycleStage | "";
  /** Who holds the check-out ("" = nobody), and whether it is me. */
  checkedOutTo: string;
  checkedOutToMe: boolean;
  /** A site controller's documents: "other" = another site's. */
  site: "mine" | "other" | "none";
  /** The properties this document's library carries, and which of them
   *  it requires. */
  carries: Set<string>;
  required: Set<string>;
  /** Present values by property; `readable` false when they could not
   *  be read whole (a person with no address, a term with no id) — the
   *  document is then left alone rather than rewritten on a guess. */
  current: Map<string, { values: BulkValue[]; readable: boolean }>;
  /** The effective (last approved or reviewed) day and the review day,
   *  yyyy-mm-dd, "" when unread. */
  effectiveYmd: string;
  reviewYmd: string;
}

export interface DocWrite {
  change: BulkChange;
  before: BulkValue[];
  after: BulkValue[];
}

export interface ReviewMove {
  /** The new cadence in months. */
  months: number;
  from: string;
  to: string;
  /** The new review date is already past. */
  due: boolean;
}

export interface DocPlan {
  doc: BulkDoc;
  state: "change" | "skip";
  /** Why it is skipped. */
  reason: string;
  /** Said beside a document that WILL change. */
  notes: string[];
  writes: DocWrite[];
  /** An Importance change moves the review date. */
  review: ReviewMove | null;
  /** The check-in is followed by a publish (approved, superseded and
   *  obsolete documents on a library with content approval). */
  readerFacing: boolean;
}

export interface PlanContext {
  /** The Importance property ("" = not mapped) and its term → months. */
  importanceInternal: string;
  cadence: Record<string, number>;
  /** Today, yyyy-mm-dd, the person's own calendar day. */
  today: string;
}

const CIRCULATION: Partial<Record<LifecycleStage, string>> = {
  inReview: "in review",
  inApproval: "awaiting approval",
  inOwnerApproval: "awaiting owner approval",
};
const READER_FACING = new Set<LifecycleStage | "">(["approved", "superseded", "obsolete"]);

export const DRAFT_NOTE = "Being revised or not yet approved: this change is part of the draft, and is lost if the revision is cancelled.";

/** What a run does to one document. */
export function planDoc(doc: BulkDoc, changes: BulkChange[], ctx: PlanContext): DocPlan {
  const skip = (reason: string): DocPlan => ({ doc, state: "skip", reason, notes: [], writes: [], review: null, readerFacing: false });
  if (doc.site === "other") return skip("Belongs to another site.");
  if (doc.checkedOutTo !== "" || doc.checkedOutToMe) return skip(doc.checkedOutToMe ? "Checked out to you. Check it in or discard first." : `Checked out to ${doc.checkedOutTo}.`);
  if (doc.libType === "standard") {
    if (doc.stage === "") return skip("Its status could not be read.");
    const busy = CIRCULATION[doc.stage];
    if (busy !== undefined) return skip(`It is ${busy}.`);
  }
  const writes: DocWrite[] = [];
  const whys: string[] = [];
  for (const c of changes) {
    if (!doc.carries.has(c.internal)) {
      whys.push(`${c.label}: its library has no such property`);
      continue;
    }
    const cur = doc.current.get(c.internal) ?? { values: [], readable: true };
    if (!cur.readable) return skip(`${c.label}: its present value could not be read whole, so it is left alone.`);
    const a = applyChange(c, cur.values);
    if (!a.changed) {
      whys.push(`${c.label}: ${a.why}`);
      continue;
    }
    if (a.next.length === 0 && doc.required.has(c.internal)) return skip(`${c.label} is required here and would be left empty.`);
    writes.push({ change: c, before: cur.values, after: a.next });
  }
  if (writes.length === 0) return skip(whys.length === 1 ? `${whys[0].charAt(0).toUpperCase()}${whys[0].slice(1)}.` : `Nothing to change: ${whys.join("; ")}.`);

  let review: ReviewMove | null = null;
  const imp = ctx.importanceInternal === "" ? undefined : writes.find((w) => w.change.internal === ctx.importanceInternal);
  if (imp !== undefined && imp.after.length > 0) {
    const months = ctx.cadence[imp.after[0].key.trim().toLowerCase()];
    if (typeof months === "number" && months > 0 && /^\d{4}-\d{2}-\d{2}$/.test(doc.effectiveYmd)) {
      const to = addMonthsYmd(doc.effectiveYmd, months);
      review = { months, from: doc.reviewYmd, to, due: to < ctx.today };
    }
  }
  const notes: string[] = [];
  if (doc.libType === "standard" && doc.stage === "draft") notes.push(DRAFT_NOTE);
  if (review !== null && review.due) notes.push("Its new review date is already past: it becomes due for review at once.");
  return { doc, state: "change", reason: "", notes, writes, review, readerFacing: doc.libType === "standard" && READER_FACING.has(doc.stage) };
}

// ---- words ---------------------------------------------------------------------

const names = (list: BulkValue[]): string => (list.length === 0 ? "nothing" : list.map((v) => `“${v.label}”`).join(", "));

/** "Process area: “A” replaced with “B”" — one change, as the version
 *  comment and the preview say it. */
export function changeWords(c: BulkChange): string {
  switch (c.op) {
    case "set":
      return `${c.label} set to ${names(c.values)}`;
    case "add":
      return `${c.label}: ${names(c.values)} added`;
    case "remove":
      return `${c.label}: ${names(c.values)} removed`;
    case "replace":
      return `${c.label}: ${names(c.from)} replaced with ${names(c.values)}`;
  }
}

/** SharePoint holds 1,023 characters in a version comment. */
export const COMMENT_MAX = 1000;

/** The version comment of one document: only the changes that touched
 *  IT, who ran them and why. */
export function commentFor(plan: DocPlan, reason: string, actor: string): string {
  const what = plan.writes.map((w) => changeWords(w.change)).join("; ");
  const moved = plan.review !== null ? ` Review date now ${plan.review.to}.` : "";
  const text = `Bulk change${actor.trim() !== "" ? ` by ${actor.trim()}` : ""}: ${what}.${moved} Reason: ${reason.trim()}`;
  return text.length <= COMMENT_MAX ? text : `${text.slice(0, COMMENT_MAX - 1)}…`;
}

/** "37 documents will change, 5 are skipped." */
export function previewLine(plans: DocPlan[], ticked: number): string {
  const skipped = plans.filter((p) => p.state === "skip").length;
  const can = plans.length - skipped;
  const parts = [`${ticked} of ${can} document${can === 1 ? "" : "s"} will change`];
  if (skipped > 0) parts.push(`${skipped} ${skipped === 1 ? "is" : "are"} skipped`);
  return `${parts.join(", ")}.`;
}

/** "about 2 minutes" from a rate in documents a minute. */
export function timeWords(docs: number, perMinute: number): string {
  if (docs <= 0 || perMinute <= 0) return "";
  const minutes = docs / perMinute;
  if (minutes < 1) return "under a minute";
  if (minutes < 90) return `about ${Math.round(minutes)} minute${Math.round(minutes) === 1 ? "" : "s"}`;
  return `about ${(minutes / 60).toFixed(1)} hours`;
}

// ---- the report ------------------------------------------------------------------

export interface DocResult {
  plan: DocPlan;
  /** changed · failed · skipped (by the preview) · left (unticked, or the
   *  run was stopped before it). */
  outcome: "changed" | "failed" | "skipped" | "left";
  detail: string;
}

export const REPORT_HEAD = ["Document", "Library", "Property", "Before", "After", "Result", "Detail"];

/** One line per document and property changed; one line for a document
 *  nothing was written to. The old value is what makes a careful
 *  reversal possible. */
export function reportRows(results: DocResult[]): string[][] {
  const plain = (list: BulkValue[]) => list.map((v) => v.label).join("; ");
  const word: Record<DocResult["outcome"], string> = { changed: "Changed", failed: "Failed", skipped: "Skipped", left: "Not run" };
  const out: string[][] = [];
  for (const r of results) {
    const d = r.plan.doc;
    const detail = r.outcome === "skipped" ? r.plan.reason : r.detail;
    if (r.plan.writes.length === 0) {
      out.push([d.name, d.libName, "", "", "", word[r.outcome], detail]);
      continue;
    }
    for (const w of r.plan.writes) out.push([d.name, d.libName, w.change.label, plain(w.before), plain(w.after), word[r.outcome], detail]);
    if (r.plan.review !== null) out.push([d.name, d.libName, "Review date", r.plan.review.from, r.plan.review.to, word[r.outcome], detail]);
  }
  return out;
}
