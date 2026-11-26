// "Change properties…" — bulk change for document controllers
// (2026-11-27, R4 of the 2026-11-25 round, N3). One dialog in three
// steps: say what changes, read the preview, run it. The rules are
// bulkChangeModel.ts (pure, tested); this file is the dialog, the
// reads and the writes.
//
// Each document goes through Edit properties' own road — check out,
// write, minor check-in with the comment, publish when the document is
// reader-facing on a library with content approval — and a refused
// step gives back the check-out it took (bracket.ts). Nothing is
// stored about a run: the report is a file the person downloads, and
// every document's history carries the comment.

import { clear, el } from "../../../shared/ui/dom";
import { openDialog } from "../../../shared/ui/dialog";
import { DocLibrary } from "./docsStore";
import { AddFieldValue, LifecycleStage, SiteColumn, SpField, spErrorText, splitAddWrites, todayYmd, validateItemErrors } from "./model";
import { DocRow } from "./rows";
import { BuiltEditor, buildFieldEditors, editorKind } from "./fieldEditors";
import { loadLibraryFields } from "./libraryFields";
import { savedTerms } from "./ingestionModel";
import { retryThrottled } from "./ingestionRun";
import { newBracket, refused } from "./bracket";
import { dayWords } from "./controllerCmdsModel";
import { cachedTermPaths, checkInFile, checkOutFile, connectorPatchItem, fetchListModeration, validateUpdateListItem } from "./sp";
import {
  BulkChange,
  BulkDoc,
  BulkKind,
  BulkOp,
  BulkValue,
  DocPlan,
  DocResult,
  OP_WORDS,
  REPORT_HEAD,
  changeWords,
  changesProblem,
  commentFor,
  opsFor,
  planDoc,
  previewLine,
  reportRows,
  timeWords,
} from "./bulkChangeModel";

/** Roles a bulk change never offers: the lifecycle's, the date model's,
 *  the document's identity, and the columns with editors of their own. */
const NEVER = new Set(["status", "documentId", "effectiveDate", "nextReviewDate", "reviewCadence", "linkedDocuments", "managementOfChange", "priorNames", "revisionEditors", "regulatorApproved", "regulatorPdf"]);
/** No more than this many documents are read into one preview. */
export const BULK_CAP = 2000;
/** The rate the estimate starts from, documents a minute — replaced by
 *  the run's own measured rate as soon as it has one. */
const START_RATE = 15;

export interface BulkChangeOpts {
  host: HTMLElement;
  site: string;
  actor: string;
  /** The libraries the filters reach that a bulk change may write to. */
  libs: DocLibrary[];
  dictBy: Map<string, SiteColumn>;
  /** Every document the current filters match in `libs`, each carrying
   *  the given columns; stops at `cap`. */
  gather(fields: string[], cap: number, onCount: (n: number) => void): Promise<{ rows: { row: DocRow; lib: DocLibrary }[]; capped: boolean; error: string }>;
  stageOf(row: DocRow): LifecycleStage | "";
  isMine(row: DocRow): boolean;
  siteOf(row: DocRow): "mine" | "other" | "none";
  /** The date model: the Importance column, its months by term id, and
   *  a library's own date columns ("" = not carried). */
  importanceInternal: string;
  cadence: Record<string, number>;
  datesOf(lib: DocLibrary): { effective: string; review: string; cadence: string; org: string; status: string };
  /** The properties Edit properties shows for a library — the Document
   *  Columns manager's choice for its type. A column the manager hides
   *  (SharePoint's own "Image Tags", say) is not a bulk change's to
   *  offer either (Ben, 2026-11-27: "why is there a property image
   *  tags?"). null = the site has no manager settings: every available
   *  column, as the form itself falls back to. */
  offeredFor(lib: DocLibrary): Set<string> | null;
  onDone(): void;
}

type Sp = { ok: boolean; status: string; data: unknown };

/** A date column of a fetched row as the person's calendar day. The
 *  feed's ISO twin sits under "<col>." */
function ymdOf(row: DocRow, col: string): string {
  if (col === "") return "";
  const iso = row.values[`${col}.`] ?? "";
  const t = Date.parse(iso);
  if (iso === "" || Number.isNaN(t)) return "";
  const d = new Date(t);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const toValues = (v: AddFieldValue): BulkValue[] => {
  if (v.kind === "taxonomy") {
    const list = v.terms !== undefined ? v.terms : (v.termId ?? "") !== "" ? [{ label: v.label ?? "", termId: v.termId ?? "" }] : [];
    return list.filter((t) => t.termId !== "").map((t) => ({ key: t.termId, label: t.label }));
  }
  if (v.kind === "person") return (v.people ?? []).filter((p) => p.email.trim() !== "").map((p) => ({ key: p.email.trim().toLowerCase(), label: p.name.trim() || p.email }));
  const text = (v.text ?? "").trim();
  return text === "" ? [] : [{ key: text, label: text }];
};

const toWrite = (c: BulkChange, after: BulkValue[]): AddFieldValue => {
  if (after.length === 0) return { internal: c.internal, kind: c.kind, clear: true };
  if (c.kind === "taxonomy") {
    const terms = after.map((v) => ({ label: v.label, termId: v.key }));
    return { internal: c.internal, kind: "taxonomy", multi: c.multi, terms, label: terms[0].label, termId: terms[0].termId };
  }
  if (c.kind === "person") return { internal: c.internal, kind: "person", people: after.map((v) => ({ email: v.key, name: v.label })) };
  return { internal: c.internal, kind: c.kind, text: after[0].key };
};

const STAGE_WORDS: Record<string, string> = {
  draft: "Draft",
  inReview: "In review",
  inApproval: "Awaiting approval",
  inOwnerApproval: "Awaiting owner approval",
  approved: "Approved",
  superseded: "Superseded",
  obsolete: "Obsolete",
};

export function openBulkChange(opts: BulkChangeOpts): void {
  const { site } = opts;
  type Phase = "define" | "reading" | "preview" | "running" | "done";
  let phase: Phase = "define";
  let stop = false;
  let plans: DocPlan[] = [];
  let capped = false;
  const ticked = new Set<DocPlan>();
  const results = new Map<DocPlan, DocResult>();
  /** property → its live field in the first library that carries it. */
  const fieldOf = new Map<string, SpField>();
  const libFields = new Map<string, SpField[]>();
  /** library → the properties its Edit properties form shows (null = all). */
  const offered = new Map<string, Set<string> | null>();

  const dlg = openDialog({
    host: opts.host,
    title: "Change properties",
    maxWidth: 1040,
    buttons: [
      { label: "Close", kind: "secondary", onClick: () => onSecondary() },
      { label: "Preview", kind: "primary", onClick: () => void onPrimary() },
    ],
  });
  dlg.body.classList.add("app-bulk-body");
  const primary = dlg.root.querySelector(".ltk-btn-primary") as HTMLButtonElement;
  const secondary = dlg.root.querySelector(".ltk-btn-secondary") as HTMLButtonElement;

  const scope = el("div", "app-bulk-scope", `Every document the current filters match in ${opts.libs.map((l) => l.config.title || l.name).join(", ")}.`);
  const defineBox = el("div", "app-bulk-define");
  const changesBox = el("div", "app-bulk-changes");
  const another = el("button", "app-link", "＋ Another property") as HTMLButtonElement;
  another.type = "button";
  const reasonLabel = el("div", "app-field-label", "Reason");
  const reason = el("textarea", "app-input app-bulk-reason") as HTMLTextAreaElement;
  reason.rows = 2;
  reason.placeholder = "Why this change is being made. It goes on every document's history.";
  defineBox.append(changesBox, another, reasonLabel, reason);
  const tally = el("div", "app-bulk-tally");
  const list = el("div", "app-bulk-list");
  const status = el("div", "app-docs-addstatus");
  dlg.body.append(scope, defineBox, tally, list, status);

  const say = (text: string, warn = false) => {
    status.textContent = text;
    status.classList.toggle("app-docs-addstatus-warn", warn);
  };

  // ---- step 1: what changes ----------------------------------------------------
  interface Row {
    wrap: HTMLElement;
    prop: HTMLSelectElement;
    op: HTMLSelectElement;
    fromBox: HTMLElement;
    toBox: HTMLElement;
    from: BuiltEditor | null;
    to: BuiltEditor | null;
  }
  const rows: Row[] = [];
  const offerable: { internal: string; label: string; kind: BulkKind; multi: boolean }[] = [];

  const editorIn = (box: HTMLElement, f: SpField): BuiltEditor | null => {
    const built = buildFieldEditors({
      site,
      box,
      fields: [f],
      columns: [{ internal: f.internal, available: true }],
      dictBy: opts.dictBy,
      onChange: () => paintFoot(),
      sections: [{ heading: "", columns: [f.internal] }],
    });
    // the row has its own caption; the editor's label would say the
    // property's name a second time
    box.querySelector(".app-field-label")?.remove();
    return built[0] ?? null;
  };

  const paintRow = (r: Row) => {
    const o = offerable.find((x) => x.internal === r.prop.value);
    clear(r.op);
    clear(r.fromBox);
    clear(r.toBox);
    r.from = r.to = null;
    if (o === undefined) {
      r.op.style.display = "none";
      return;
    }
    const ops = opsFor(o.multi);
    for (const k of ops) {
      const opt = el("option", "", OP_WORDS[k]) as HTMLOptionElement;
      opt.value = k;
      r.op.appendChild(opt);
    }
    const was = r.op.dataset.picked ?? "";
    r.op.value = ops.includes(was as BulkOp) ? was : ops[0];
    r.op.style.display = ops.length > 1 ? "" : "none";
    const f = fieldOf.get(o.internal);
    if (f === undefined) return;
    if (r.op.value === "replace") {
      r.fromBox.appendChild(el("div", "app-bulk-cap", "Replace"));
      const a = el("div", "");
      r.fromBox.appendChild(a);
      r.from = editorIn(a, f);
      r.toBox.appendChild(el("div", "app-bulk-cap", "With"));
    } else if (ops.length === 1) {
      r.toBox.appendChild(el("div", "app-bulk-cap", OP_WORDS.set));
    }
    const b = el("div", "");
    r.toBox.appendChild(b);
    r.to = editorIn(b, f);
    paintFoot();
  };

  const addRow = () => {
    const wrap = el("div", "app-bulk-change");
    const prop = el("select", "app-input app-bulk-prop") as HTMLSelectElement;
    const none = el("option", "", "Choose a property…") as HTMLOptionElement;
    none.value = "";
    prop.appendChild(none);
    for (const o of offerable) {
      const opt = el("option", "", o.label) as HTMLOptionElement;
      opt.value = o.internal;
      prop.appendChild(opt);
    }
    const op = el("select", "app-input app-bulk-op") as HTMLSelectElement;
    op.style.display = "none";
    const fromBox = el("div", "app-bulk-value");
    const toBox = el("div", "app-bulk-value");
    const drop = el("button", "app-link app-bulk-drop", "Remove") as HTMLButtonElement;
    drop.type = "button";
    wrap.append(prop, op, fromBox, toBox, drop);
    const r: Row = { wrap, prop, op, fromBox, toBox, from: null, to: null };
    prop.addEventListener("change", () => paintRow(r));
    op.addEventListener("change", () => {
      op.dataset.picked = op.value;
      paintRow(r);
    });
    drop.addEventListener("click", () => {
      rows.splice(rows.indexOf(r), 1);
      wrap.remove();
      if (rows.length === 0) addRow();
      paintFoot();
    });
    rows.push(r);
    changesBox.appendChild(wrap);
    paintFoot();
  };
  another.addEventListener("click", addRow);
  reason.addEventListener("input", () => paintFoot());

  const readChanges = (): BulkChange[] =>
    rows
      .filter((r) => r.prop.value !== "")
      .map((r) => {
        const o = offerable.find((x) => x.internal === r.prop.value)!;
        return {
          internal: o.internal,
          label: o.label,
          kind: o.kind,
          multi: o.multi,
          op: (r.op.value || "set") as BulkOp,
          values: r.to === null ? [] : toValues(r.to.read()),
          from: r.from === null ? [] : toValues(r.from.read()),
        };
      });

  const defineProblem = (): string => {
    const p = changesProblem(readChanges());
    if (p !== "") return p;
    return reason.value.trim() === "" ? "Give the reason for the change." : "";
  };

  // ---- the foot: one primary button for the step in hand ---------------------------
  const paintFoot = () => {
    defineBox.style.display = phase === "define" ? "" : "none";
    primary.style.display = phase === "reading" || phase === "running" ? "none" : "";
    if (phase === "define") {
      const p = defineProblem();
      primary.textContent = "Preview";
      primary.disabled = p !== "";
      primary.title = p;
      secondary.textContent = "Close";
    } else if (phase === "reading") {
      secondary.textContent = "Close";
    } else if (phase === "preview") {
      const n = ticked.size;
      primary.textContent = `Change ${n} document${n === 1 ? "" : "s"}`;
      primary.disabled = n === 0;
      primary.title = "";
      secondary.textContent = "Back";
      tally.textContent = `${previewLine(plans, n)}${n > 0 ? ` ${timeWords(n, START_RATE).replace(/^./, (c) => c.toUpperCase())} at a first estimate; the tab has to stay open.` : ""}${capped ? ` Only the first ${BULK_CAP} documents were read: narrow the filters, or run it again afterwards.` : ""}`;
    } else if (phase === "running") {
      secondary.textContent = "Stop";
    } else {
      primary.textContent = "Download report";
      primary.disabled = false;
      primary.title = "A CSV: each document, the old value, the new value and the result";
      secondary.textContent = "Close";
    }
  };

  const onSecondary = () => {
    if (phase === "running") {
      stop = true;
      say("Stopping after this document…");
      return;
    }
    if (phase === "preview") {
      phase = "define";
      clear(list);
      tally.textContent = "";
      say("");
      paintFoot();
      return;
    }
    const ran = phase === "done";
    dlg.close();
    if (ran) opts.onDone();
  };
  const onPrimary = async () => {
    if (phase === "define") await preview();
    else if (phase === "preview") await run();
    else if (phase === "done") download();
  };

  // ---- step 2: the preview -------------------------------------------------------------
  const preview = async () => {
    if (defineProblem() !== "") return;
    const changes = readChanges();
    phase = "reading";
    paintFoot();
    clear(list);
    ticked.clear();
    results.clear();
    say("Reading the documents…");
    try {
      const wanted = new Set<string>(["CheckoutUser", ...changes.map((c) => c.internal)]);
      if (opts.importanceInternal !== "") wanted.add(opts.importanceInternal);
      for (const lib of opts.libs) {
        const d = opts.datesOf(lib);
        for (const f of [d.effective, d.review, d.org, d.status]) if (f !== "") wanted.add(f);
      }
      const got = await opts.gather([...wanted], BULK_CAP, (n) => say(`Reading the documents… ${n}`));
      if (got.error !== "") {
        phase = "define";
        paintFoot();
        say(`The documents could not be read: ${spErrorText(got.error).slice(0, 240)}`, true);
        return;
      }
      capped = got.capped;
      // every term set a changed property reads from, walked once
      const walks = new Map<string, { id: string; labels: string[] }[]>();
      for (const c of changes) {
        if (c.kind !== "taxonomy") continue;
        const setId = opts.dictBy.get(c.internal)?.termSetId || fieldOf.get(c.internal)?.termSetId || "";
        if (setId === "" || walks.has(c.internal)) continue;
        const walk = await cachedTermPaths(site, setId).catch(() => null);
        walks.set(c.internal, walk === null ? [] : walk.nodes);
      }
      const ctx = { importanceInternal: opts.importanceInternal, cadence: opts.cadence, today: todayYmd() };
      plans = got.rows.map(({ row, lib }) => {
        const fields = libFields.get(lib.listId) ?? [];
        const have = new Set(fields.map((f) => f.internal));
        const d = opts.datesOf(lib);
        const current = new Map<string, { values: BulkValue[]; readable: boolean }>();
        for (const c of changes) {
          const text = row.values[c.internal] ?? "";
          if (c.kind === "taxonomy") {
            const read = savedTerms(text, row.values[`${c.internal}#termid`] ?? "", walks.get(c.internal) ?? []);
            current.set(c.internal, { values: read.terms.map((t) => ({ key: t.termId, label: t.label })), readable: read.unsure.length === 0 });
          } else if (c.kind === "person") {
            const shown = text.split(";").map((s) => s.trim()).filter((s) => s !== "");
            const emails = (row.values[`${c.internal}#email`] ?? "").split(";").map((s) => s.trim()).filter((s) => s !== "");
            current.set(c.internal, { values: emails.map((e, i) => ({ key: e, label: shown[i] ?? e })), readable: emails.length === shown.length });
          } else {
            current.set(c.internal, { values: text.trim() === "" ? [] : [{ key: text.trim(), label: text.trim() }], readable: true });
          }
        }
        const doc: BulkDoc = {
          id: row.id,
          listId: row.listId,
          uid: row.uniqueId,
          name: row.name,
          serverUrl: row.serverUrl,
          libName: lib.config.title || lib.name,
          libType: lib.libType,
          stage: lib.libType === "standard" ? opts.stageOf(row) : "",
          checkedOutTo: row.checkoutName ?? "",
          checkedOutToMe: (row.checkoutName ?? "") !== "" && opts.isMine(row),
          site: opts.siteOf(row),
          carries: new Set(lib.config.columns.filter((c) => c.available && have.has(c.internal) && (offered.get(lib.listId)?.has(c.internal) ?? true)).map((c) => c.internal)),
          required: new Set(fields.filter((f) => f.required).map((f) => f.internal)),
          current,
          effectiveYmd: ymdOf(row, d.effective),
          reviewYmd: ymdOf(row, d.review),
        };
        return planDoc(doc, changes, ctx);
      });
      for (const p of plans) if (p.state === "change") ticked.add(p);
      phase = "preview";
      paintList();
      paintFoot();
      say(plans.length === 0 ? "The filters match no documents in these libraries." : "", plans.length === 0);
    } catch (e) {
      phase = "define";
      paintFoot();
      say(`The preview could not be made: ${e instanceof Error ? e.message : String(e)}`, true);
    }
  };

  const plain = (vals: BulkValue[]): string => (vals.length === 0 ? "nothing" : vals.map((v) => v.label).join(", "));
  const rowEls = new Map<DocPlan, { result: HTMLElement; check: HTMLInputElement | null }>();
  const paintList = () => {
    clear(list);
    rowEls.clear();
    const can = plans.filter((p) => p.state === "change");
    const skipped = plans.filter((p) => p.state === "skip");
    for (const p of can) {
      const row = el("div", "app-bulk-row");
      const check = el("input", "app-bulk-check") as HTMLInputElement;
      check.type = "checkbox";
      check.checked = ticked.has(p);
      check.addEventListener("change", () => {
        if (check.checked) ticked.add(p);
        else ticked.delete(p);
        paintFoot();
      });
      const what = el("div", "app-bulk-what");
      what.append(el("div", "app-bulk-name", p.doc.name), el("div", "app-bulk-meta", [p.doc.libName, STAGE_WORDS[p.doc.stage] ?? ""].filter((s) => s !== "").join(" · ")));
      const diff = el("div", "app-bulk-diff");
      for (const w of p.writes) {
        const line = el("div", "app-bulk-line");
        line.append(el("span", "app-bulk-prop", `${w.change.label}: `), el("span", "app-bulk-before", plain(w.before)), el("span", "app-bulk-arrow", " → "), el("span", "app-bulk-after", plain(w.after)));
        diff.appendChild(line);
      }
      if (p.review !== null) {
        const line = el("div", "app-bulk-line");
        line.append(el("span", "app-bulk-prop", "Review date: "), el("span", "app-bulk-before", p.review.from !== "" ? dayWords(p.review.from) : "none"), el("span", "app-bulk-arrow", " → "), el("span", "app-bulk-after", dayWords(p.review.to)));
        diff.appendChild(line);
      }
      for (const n of p.notes) diff.appendChild(el("div", "app-bulk-note", n));
      const result = el("div", "app-bulk-result", "");
      row.append(check, what, diff, result);
      list.appendChild(row);
      rowEls.set(p, { result, check });
    }
    if (skipped.length > 0) {
      const fold = el("details", "app-bulk-skipped") as HTMLDetailsElement;
      fold.open = can.length === 0;
      fold.appendChild(el("summary", "", `Skipped (${skipped.length})`));
      for (const p of skipped) {
        const row = el("div", "app-bulk-row app-bulk-row-skip");
        const what = el("div", "app-bulk-what");
        what.append(el("div", "app-bulk-name", p.doc.name), el("div", "app-bulk-meta", [p.doc.libName, STAGE_WORDS[p.doc.stage] ?? ""].filter((s) => s !== "").join(" · ")));
        row.append(el("span", ""), what, el("div", "app-bulk-diff app-bulk-note", p.reason), el("div", ""));
        fold.appendChild(row);
      }
      list.appendChild(fold);
    }
  };

  // ---- step 3: the run ---------------------------------------------------------------------
  const moderated = new Map<string, boolean>();
  const isModerated = async (listId: string): Promise<boolean> => {
    const known = moderated.get(listId);
    if (known !== undefined) return known;
    const mod = await fetchListModeration(site, listId).catch(() => ({ ok: false, status: "", data: null }));
    const yes = mod.ok && ((mod.data ?? {}) as { EnableModeration?: unknown }).EnableModeration === true;
    moderated.set(listId, yes);
    return yes;
  };
  let waiting = false;
  const rt = <T extends Sp>(call: () => Promise<T>): Promise<T> => retryThrottled(call, () => (waiting = true));

  /** One document: "" when it landed, else what was refused (the
   *  check-out it took already given back). `warn` = it landed, with
   *  something to know. */
  const changeOne = async (p: DocPlan, comment: string): Promise<{ error: string; warn: string }> => {
    const d = p.doc;
    const b = newBracket(site, d.serverUrl);
    const out = await rt(() => checkOutFile(site, d.serverUrl));
    if (!out.ok) return { error: await refused(b, "Could not check out", out.status, false), warn: "" };
    b.took = true;
    const { formValues, patch } = splitAddWrites(p.writes.map((w) => toWrite(w.change, w.after)));
    if (p.review !== null) {
      const lib = opts.libs.find((l) => l.listId.toLowerCase() === d.listId.toLowerCase());
      const cols = lib === undefined ? null : opts.datesOf(lib);
      if (cols !== null && cols.cadence !== "") formValues.push({ FieldName: cols.cadence, FieldValue: String(p.review.months) });
      if (cols !== null && cols.review !== "") patch[cols.review] = p.review.to;
    }
    if (formValues.length > 0) {
      const res = await rt(() => validateUpdateListItem(site, d.listId, d.id, formValues, false));
      const errs = validateItemErrors(res.data);
      if (!res.ok || errs.length > 0) return { error: await refused(b, "Some properties were refused", errs.map((x) => `${x.field}: ${x.message}`).join("; ") || res.status), warn: "" };
    }
    if (Object.keys(patch).length > 0) {
      const res = await rt(() => connectorPatchItem(site, d.listId, d.id, patch));
      if (!res.ok) return { error: await refused(b, "The term write was refused", res.status), warn: "" };
    }
    let cin = await rt(() => checkInFile(site, d.serverUrl, comment, false));
    // a library with major versions only refuses a minor check-in; the
    // same check-in as a major is what it means there
    if (!cin.ok && /minor/i.test(spErrorText(cin.status))) cin = await rt(() => checkInFile(site, d.serverUrl, comment, true));
    if (!cin.ok && !/not checked out/i.test(spErrorText(cin.status))) return { error: await refused(b, "Check-in was refused", cin.status), warn: "" };
    b.took = false;
    if (p.readerFacing && (await isModerated(d.listId))) {
      const { publishReaderFacing } = await import("./publish");
      const pub = await publishReaderFacing(site, d.listId, d.id, d.serverUrl, comment);
      if (!pub.ok) return { error: "", warn: "Saved, but content approval is still pending: readers see the old value until a controller approves it in SharePoint." };
    }
    return { error: "", warn: "" };
  };

  const run = async () => {
    const todo = plans.filter((p) => ticked.has(p));
    if (todo.length === 0) return;
    phase = "running";
    stop = false;
    for (const r of rowEls.values()) if (r.check !== null) r.check.disabled = true;
    paintFoot();
    const started = Date.now();
    let done = 0;
    let ok = 0;
    let bad = 0;
    for (const p of todo) {
      if (stop) break;
      const rate = done >= 3 ? done / ((Date.now() - started) / 60000) : START_RATE;
      say(`Changing ${done + 1} of ${todo.length}${waiting ? " · SharePoint asked the app to slow down" : ""} · ${timeWords(todo.length - done, rate)} left`);
      waiting = false;
      const cell = rowEls.get(p)?.result;
      if (cell) cell.textContent = "Changing…";
      let res: { error: string; warn: string };
      try {
        res = await changeOne(p, commentFor(p, reason.value, opts.actor));
      } catch (e) {
        res = { error: e instanceof Error ? e.message : String(e), warn: "" };
      }
      done++;
      if (res.error === "") {
        ok++;
        results.set(p, { plan: p, outcome: "changed", detail: res.warn });
        if (cell) {
          cell.textContent = res.warn !== "" ? `Changed. ${res.warn}` : "Changed ✓";
          cell.className = `app-bulk-result ${res.warn !== "" ? "app-bulk-result-warn" : "app-bulk-result-ok"}`;
        }
      } else {
        bad++;
        results.set(p, { plan: p, outcome: "failed", detail: res.error });
        if (cell) {
          cell.textContent = res.error;
          cell.className = "app-bulk-result app-bulk-result-bad";
        }
      }
    }
    const minutes = (Date.now() - started) / 60000;
    const left = todo.length - done;
    phase = "done";
    paintFoot();
    const rateLine = done >= 3 && minutes > 0 ? ` ${Math.round(done / minutes)} documents a minute.` : "";
    say(`${ok} changed${bad > 0 ? `, ${bad} failed` : ""}${left > 0 ? `, stopped with ${left} not run` : ""}.${rateLine}${bad > 0 || left > 0 ? " Run the same change again to pick up the rest: documents that already have the new value are skipped." : ""}`, bad > 0);
  };

  // ---- the report -------------------------------------------------------------------------------
  const download = () => {
    const all: DocResult[] = plans.map((p) => results.get(p) ?? { plan: p, outcome: p.state === "skip" ? "skipped" : "left", detail: p.state === "skip" ? "" : ticked.has(p) ? "The run was stopped before this document." : "Unticked in the preview." });
    const cell = (v: string) => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const head = [`Bulk change by ${opts.actor} on ${todayYmd()}: ${readChanges().map(changeWords).join("; ")}. Reason: ${reason.value.trim()}`];
    const text = [head, REPORT_HEAD, ...reportRows(all)].map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
    const blob = new Blob(["﻿", text], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `bulk-change-${todayYmd()}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  // ---- open: the properties these libraries can change -------------------------------------------------
  say("Reading the libraries' properties…");
  primary.disabled = true;
  void (async () => {
    for (const lib of opts.libs) {
      const r = await loadLibraryFields(site, lib.listId).catch(() => ({ ok: false, status: "", fields: [] as SpField[] }));
      libFields.set(lib.listId, r.fields);
      offered.set(lib.listId, opts.offeredFor(lib));
    }
    for (const [internal, col] of opts.dictBy) {
      if (NEVER.has(col.role)) continue;
      for (const lib of opts.libs) {
        if (!lib.config.columns.some((c) => c.internal === internal && c.available)) continue;
        // only what the form shows for this library's type
        if (offered.get(lib.listId)?.has(internal) === false) continue;
        const f = (libFields.get(lib.listId) ?? []).find((x) => x.internal === internal);
        if (f === undefined) continue;
        const kind = editorKind(f);
        if (kind === null || kind === "date") continue;
        if (kind === "taxonomy" && (col.termSetId || f.termSetId) === "") continue;
        fieldOf.set(internal, f);
        offerable.push({ internal, label: col.label !== "" ? col.label : f.title, kind, multi: f.type === "TaxonomyFieldTypeMulti" || f.type === "UserMulti" });
        break;
      }
    }
    offerable.sort((a, b) => a.label.localeCompare(b.label));
    if (offerable.length === 0) {
      say("These libraries have no property a bulk change can set.", true);
      return;
    }
    say("");
    addRow();
  })();
  paintFoot();
}
