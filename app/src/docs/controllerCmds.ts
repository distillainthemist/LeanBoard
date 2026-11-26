// Rename, and the correction of the effective date — two commands in a
// document's menu for document controllers (2026-11-27, R4 of the
// 2026-11-25 round, report 28). The rules and the history's words are
// controllerCmdsModel.ts (pure, tested); this file is the two dialogs
// and their writes.
//
// RENAME is a move onto the new name in the same folder — the road the
// ingestion grid renames by, and measured against the controlled
// library on 2026-10-08 (sharepoint-writes.md: a move carries the
// item, its versions and its approval). The item, its id and the app's
// links are untouched. A bracket then records it: check out, the
// Title and Prior names where they apply, a minor check-in with the
// comment, and a publish when the document is reader-facing. If the
// bracket is refused the rename has still happened, and the dialog
// says so.
//
// THE DATE is written the way Approve stamps it (the forms engine, in
// the site's own date format), inside the same bracket.

import { clear, el } from "../../../shared/ui/dom";
import { openDialog } from "../../../shared/ui/dialog";
import { requiredMark, stillNeeded } from "./fieldEditors";
import { formatDateForLocale, spErrorText, todayYmd, validateItemErrors } from "./model";
import { DocRow } from "./rows";
import { newBracket, refused } from "./bracket";
import { checkInFile, checkOutFile, fetchListItem, fetchListModeration, fetchRegionalSettings, moveFileByPath, validateUpdateListItem } from "./sp";
import { dateComment, dateOutcome, dateProblem, dayWords, priorNamesAfter, renameComment, renameProblem, splitName, titleAfter } from "./controllerCmdsModel";

type Sp = { ok: boolean; status: string; data: unknown };
const timed = async (p: Promise<Sp>, what: string): Promise<Sp> => {
  let clock = 0;
  const timeout = new Promise<Sp>((resolve) => {
    clock = window.setTimeout(() => resolve({ ok: false, status: `${what} did not answer within 25 seconds`, data: null }), 25_000);
  });
  const r = await Promise.race([p, timeout]);
  window.clearTimeout(clock);
  return r;
};

const dirOf = (serverUrl: string): string => serverUrl.slice(0, Math.max(0, serverUrl.lastIndexOf("/")));

/** The bracket both commands end in: check out, write, minor check-in
 *  with the comment, publish when reader-facing on a moderated
 *  library. "" = landed; `pending` = landed but content approval is
 *  still pending. */
async function recordVersion(o: {
  site: string;
  listId: string;
  itemId: number;
  serverUrl: string;
  formValues: { FieldName: string; FieldValue: string }[];
  comment: string;
  readerFacing: boolean;
  say: (text: string) => void;
}): Promise<{ error: string; pending: boolean }> {
  const b = newBracket(o.site, o.serverUrl);
  o.say("Taking the check-out…");
  const out = await timed(checkOutFile(o.site, o.serverUrl), "Check-out");
  if (!out.ok) return { error: await refused(b, "Could not check out", out.status, false), pending: false };
  b.took = true;
  if (o.formValues.length > 0) {
    o.say("Writing…");
    const res = await timed(validateUpdateListItem(o.site, o.listId, o.itemId, o.formValues, false), "The write");
    const errs = validateItemErrors(res.data);
    if (!res.ok || errs.length > 0) return { error: await refused(b, "The write was refused", errs.map((x) => `${x.field}: ${x.message}`).join("; ") || res.status), pending: false };
  }
  o.say("Checking in…");
  let cin = await timed(checkInFile(o.site, o.serverUrl, o.comment, false), "Check-in");
  if (!cin.ok && /minor/i.test(spErrorText(cin.status))) cin = await timed(checkInFile(o.site, o.serverUrl, o.comment, true), "Check-in");
  if (!cin.ok && !/not checked out/i.test(spErrorText(cin.status))) return { error: await refused(b, "Check-in was refused", cin.status), pending: false };
  b.took = false;
  if (o.readerFacing) {
    const mod = await timed(fetchListModeration(o.site, o.listId), "The moderation read");
    if (mod.ok && ((mod.data ?? {}) as { EnableModeration?: unknown }).EnableModeration === true) {
      o.say("Publishing (content approval)…");
      const { publishReaderFacing } = await import("./publish");
      const pub = await publishReaderFacing(o.site, o.listId, o.itemId, o.serverUrl, o.comment);
      if (!pub.ok) return { error: "", pending: true };
    }
  }
  return { error: "", pending: false };
}

const PENDING = "SharePoint content approval is still PENDING: readers see the previous version until a document controller approves it in SharePoint.";

/** A labelled field with the red asterisk every required field wears. */
function field(label: string, control: HTMLElement): HTMLElement {
  const wrap = el("div", "app-docs-addfield");
  const lab = el("div", "app-field-label", label);
  lab.appendChild(requiredMark());
  wrap.append(lab, control);
  return wrap;
}

export interface RenameOpts {
  host: HTMLElement;
  site: string;
  row: DocRow;
  actor: string;
  /** Approved, superseded or obsolete: the version is published. */
  readerFacing: boolean;
  /** The library's Prior names column ("" = it has none), and whether
   *  it is a single line of text (255 characters). */
  priorNames: { internal: string; singleLine: boolean };
  onDone: (newName: string) => void;
}

export function openRename(opts: RenameOpts): void {
  const { site, row } = opts;
  const { stem, ext } = splitName(row.name);
  let running = false;
  let landed = false;
  const dlg = openDialog({
    host: opts.host,
    title: `Rename “${row.name}”`,
    maxWidth: 480,
    buttons: [
      {
        label: "Cancel",
        kind: "secondary",
        onClick: () => {
          if (running) return;
          dlg.close();
          if (landed) opts.onDone(next());
        },
      },
      { label: "Rename", kind: "primary", onClick: () => void go() },
    ],
  });
  const btn = dlg.root.querySelector(".ltk-btn-primary") as HTMLButtonElement;
  const cancel = dlg.root.querySelector(".ltk-btn-secondary") as HTMLButtonElement;
  const nameRow = el("div", "app-ctl-namerow");
  const name = el("input", "app-input") as HTMLInputElement;
  name.value = stem;
  name.maxLength = 250;
  nameRow.append(name, el("span", "app-ctl-ext", ext));
  const reason = el("textarea", "app-input") as HTMLTextAreaElement;
  reason.rows = 2;
  const status = el("div", "app-docs-addstatus");
  dlg.body.append(field("New name", nameRow), field("Reason", reason), status);
  const next = () => `${name.value}${ext}`;
  const problem = () => renameProblem(name.value, row.name) || (reason.value.trim() === "" ? stillNeeded(["Reason"]) : "");
  const sync = () => {
    const p = problem();
    btn.disabled = running || p !== "";
    btn.title = p;
  };
  name.addEventListener("input", sync);
  reason.addEventListener("input", sync);
  sync();
  name.select();
  const say = (text: string, warn = false) => {
    status.textContent = text;
    status.classList.toggle("app-docs-addstatus-warn", warn);
  };
  const done = (text: string, warn: boolean) => {
    landed = true;
    running = false;
    say(text, warn);
    btn.style.display = "none";
    cancel.textContent = "Close";
    name.disabled = reason.disabled = true;
  };

  const go = async () => {
    if (running || problem() !== "") return;
    running = true;
    sync();
    const newName = next();
    const origin = new URL(site).origin;
    const newUrl = `${dirOf(row.serverUrl)}/${newName}`;
    // what the item holds now: its Title and its Prior names
    say("Reading the document…");
    const item = await timed(fetchListItem(site, row.listId, row.id), "The read");
    const data = (item.data ?? {}) as Record<string, unknown>;
    const str = (k: string): string => (typeof data[k] === "string" ? (data[k] as string) : "");
    say("Renaming…");
    const mv = await timed(moveFileByPath(site, `${origin}${row.serverUrl}`, `${origin}${newUrl}`), "The rename");
    if (!mv.ok) {
      running = false;
      sync();
      const text = spErrorText(mv.status);
      say(/already exists/i.test(text) ? `Nothing was changed. “${newName}” is already in this folder.` : `Nothing was changed. The rename was refused: ${text.slice(0, 300)}`, true);
      return;
    }
    const formValues: { FieldName: string; FieldValue: string }[] = [];
    const title = item.ok ? titleAfter(str("Title"), row.name, newName) : "";
    if (title !== "") formValues.push({ FieldName: "Title", FieldValue: title });
    if (opts.priorNames.internal !== "" && item.ok) {
      formValues.push({ FieldName: opts.priorNames.internal, FieldValue: priorNamesAfter(str(opts.priorNames.internal), row.name, opts.priorNames.singleLine ? 255 : 0) });
    }
    const rec = await recordVersion({
      site,
      listId: row.listId,
      itemId: row.id,
      serverUrl: newUrl,
      formValues,
      comment: renameComment(row.name, newName, opts.actor, reason.value),
      readerFacing: opts.readerFacing,
      say,
    });
    if (rec.error !== "") {
      done(`Renamed to “${newName}”. The version that records it was not written: ${rec.error}`, true);
      return;
    }
    if (rec.pending) {
      done(`Renamed to “${newName}”. ${PENDING}`, true);
      return;
    }
    dlg.close();
    opts.onDone(newName);
  };
}

export interface CorrectDateOpts {
  host: HTMLElement;
  site: string;
  row: DocRow;
  actor: string;
  /** The column's own title, as the library shows it. */
  label: string;
  effectiveInternal: string;
  /** "" = the library carries no review date column. */
  reviewInternal: string;
  /** The date it holds now, yyyy-mm-dd ("" = none). */
  presentYmd: string;
  /** The document's cadence in months. */
  months: number;
  onDone: () => void;
}

export function openCorrectDate(opts: CorrectDateOpts): void {
  const { site, row } = opts;
  const today = todayYmd();
  let running = false;
  let landed = false;
  const lower = opts.label.charAt(0).toLowerCase() + opts.label.slice(1);
  const dlg = openDialog({
    host: opts.host,
    title: `Correct ${lower} — ${row.name}`,
    maxWidth: 480,
    buttons: [
      {
        label: "Cancel",
        kind: "secondary",
        onClick: () => {
          if (running) return;
          dlg.close();
          if (landed) opts.onDone();
        },
      },
      { label: "Correct the date", kind: "primary", onClick: () => void go() },
    ],
  });
  const btn = dlg.root.querySelector(".ltk-btn-primary") as HTMLButtonElement;
  const cancel = dlg.root.querySelector(".ltk-btn-secondary") as HTMLButtonElement;
  const present = el("div", "app-ctl-present", `${opts.label} now: ${opts.presentYmd !== "" ? dayWords(opts.presentYmd) : "none"}`);
  const date = el("input", "app-input") as HTMLInputElement;
  date.type = "date";
  date.max = today;
  const outcome = el("div", "app-ctl-outcome");
  const reason = el("textarea", "app-input") as HTMLTextAreaElement;
  reason.rows = 2;
  const status = el("div", "app-docs-addstatus");
  dlg.body.append(present, field(`Correct ${lower}`, date), outcome, field("Reason", reason), status);
  const problem = () => dateProblem(date.value, opts.presentYmd, today) || (reason.value.trim() === "" ? stillNeeded(["Reason"]) : "");
  const sync = () => {
    const p = problem();
    btn.disabled = running || p !== "";
    btn.title = p;
    clear(outcome);
    if (opts.reviewInternal === "" || dateProblem(date.value, opts.presentYmd, today) !== "") return;
    const o = dateOutcome(date.value, opts.months, today);
    outcome.appendChild(el("div", "", `Review date will be ${dayWords(o.review)}.`));
    if (o.due) outcome.appendChild(el("div", "app-ctl-due", "That is already past: the document will be due for review at once."));
  };
  date.addEventListener("input", sync);
  reason.addEventListener("input", sync);
  sync();
  const say = (text: string, warn = false) => {
    status.textContent = text;
    status.classList.toggle("app-docs-addstatus-warn", warn);
  };

  const go = async () => {
    if (running || problem() !== "") return;
    running = true;
    sync();
    const ymd = date.value;
    const review = opts.reviewInternal !== "" ? dateOutcome(ymd, opts.months, today).review : "";
    say("Reading the site's date format…");
    const regional = await timed(fetchRegionalSettings(site), "The regional settings read");
    const localeId = Number(((regional.data ?? {}) as { LocaleId?: unknown }).LocaleId ?? 0) || 1033;
    const formValues = [{ FieldName: opts.effectiveInternal, FieldValue: formatDateForLocale(ymd, localeId) }];
    if (review !== "") formValues.push({ FieldName: opts.reviewInternal, FieldValue: formatDateForLocale(review, localeId) });
    const rec = await recordVersion({
      site,
      listId: row.listId,
      itemId: row.id,
      serverUrl: row.serverUrl,
      formValues,
      comment: dateComment(opts.label, opts.presentYmd, ymd, review, opts.actor, reason.value),
      // only offered on approved, superseded and obsolete documents
      readerFacing: true,
      say,
    });
    running = false;
    if (rec.error !== "") {
      sync();
      say(rec.error, true);
      return;
    }
    if (rec.pending) {
      landed = true;
      say(`Corrected. ${PENDING}`, true);
      btn.style.display = "none";
      cancel.textContent = "Close";
      return;
    }
    dlg.close();
    opts.onDone();
  };
}
