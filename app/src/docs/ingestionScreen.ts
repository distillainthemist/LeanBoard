// Document ingestion — the task screen and the task editor
// (document-ingestion-proposal-2026-10.md, built 2026-10-08).
//
// A task is a sub-folder of the site's ingestion library plus a
// destination library. Assignees drop files into the folder (SharePoint
// itself — bytes never cross the connector) and set each file's details
// here (the edit-properties dialog, "Set for selected…", "Fill blanks
// from defaults") or in SharePoint's grid view. A document controller
// then RUNS the task: per file, the probe's road — copy into the
// destination (a fresh history, lands as a draft nobody sees), the
// approve bracket (check-out → status term + the date model → MAJOR
// check-in naming the task → publish), then recycle the source. A file
// that fails stays, with its reason in the log; the task closes itself
// when its folder is empty.
//
// Loaded on demand from the register (Document-tasks panel, the
// Ingestion nav card); in the docs chunk, like everything SharePoint.

import { clear, el } from "../../../shared/ui/dom";
import { openDialog } from "../../../shared/ui/dialog";
import { markDialog, trapFocus } from "../../../shared/ui/focusTrap";
import { statusChip } from "../../../shared/ui/format";
import { paletteMap } from "../../../shared/palette";
import { appPalettes } from "../store/config";
import { currentViewer } from "../runtime";
import { searchEntra } from "../store/people";
import { appLinkUrl } from "../links";
import { DocLibrary, docsConfig } from "./docsStore";
import { DocRow, buildRenderViewXml, formatWhen } from "./rows";
import { renderListPage } from "./data";
import { RegisterCellCtx, makeNameCell } from "./registerCells";
import { Draft, applyToRows, dirtyRows, effectiveValues, savedDisplay, setCell, writesFor } from "./ingestionDraft";
import {
  AddFieldValue,
  DEFAULT_CADENCE_MONTHS,
  SpField,
  addMonthsYmd,
  cadenceForImportance,
  columnsForTypes,
  deriveTypeStates,
  dialogSections,
  emptySiteDictionary,
  fieldsFromResponse,
  formatDateForLocale,
  sanitizeFileName,
  siteKey,
  spErrorText,
  splitAddWrites,
  termForStage,
  stageOfTerm,
  todayYmd,
  validateItemErrors,
} from "./model";
import {
  cachedTermPaths,
  checkInFile,
  checkOutFile,
  connectorPatchItem,
  copyFileByPath,
  createFolder,
  fetchFields,
  fetchFileItemId,
  fetchFolderCounts,
  fetchListModeration,
  fetchListRoot,
  fetchListRules,
  fetchRegionalSettings,
  fetchTermsInSet,
  moveFileByPath,
  recycleFile,
  recycleFolder,
  validateUpdateListItem,
} from "./sp";
import { buildFieldEditors, editorKind } from "./fieldEditors";
import { POOL_ROLES } from "./accessGates";
import type { ParsedSheet, SheetColumn, SheetFile } from "./sheetRoundTrip";
import { IngestionAssignee, IngestionTask, RunLogEntry, blanksToFill, compareByFolderThenName, dirOf, duplicateNames, folderGroups, folderLabel, ingestComment, labelsOutsideRoot, latestByFile, logSummary, missingFor, subFolderOf, taskFolderName } from "./ingestionModel";

/** The most files one task lists (sub-folders included); past it the
 *  status line says to split the task. */
const FILES_CAP = 2000;
import { saveIngestionTask, deleteIngestionTask, getIngestionTask, listIngestionTasks } from "./ingestionStore";
import { listPeople } from "../store/people";
import { promptConfirm } from "../prompts";
import { DocFlag, flagKey, reviewLevelsOf } from "./docFlagsModel";
import { parseMocRecords } from "./model";

const btn = (label: string, cls = "app-btn"): HTMLButtonElement => {
  const b = el("button", cls, label) as HTMLButtonElement;
  b.type = "button";
  return b;
};
const linkBtn = (label: string, href: string, cls = "app-btn"): HTMLAnchorElement => {
  const a = el("a", cls, label) as HTMLAnchorElement;
  a.href = href;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  return a;
};
const libName = (l: DocLibrary | undefined) => (l ? l.config.title || l.name : "(library not exposed)");

/** The app's own tooltip (a title shows as a bare ? cursor in the
 *  player, Ben 2026-10-09): on hover or focus, a small panel beside the
 *  element; gone on leave, blur or Esc. */
function attachTip(target: HTMLElement, text: string): void {
  let tip: HTMLElement | null = null;
  const hide = () => {
    tip?.remove();
    tip = null;
  };
  const show = () => {
    hide();
    tip = el("div", "app-ing-tip");
    for (const line of text.split("\n")) tip.appendChild(el("div", undefined, line));
    document.body.appendChild(tip);
    const r = target.getBoundingClientRect();
    const w = tip.offsetWidth;
    tip.style.top = `${r.bottom + 6}px`;
    tip.style.left = `${Math.max(8, Math.min(r.left + r.width / 2 - w / 2, window.innerWidth - w - 8))}px`;
  };
  target.tabIndex = 0;
  target.addEventListener("mouseenter", show);
  target.addEventListener("focus", show);
  target.addEventListener("mouseleave", hide);
  target.addEventListener("blur", hide);
  target.addEventListener("click", (e) => {
    e.stopPropagation();
    if (tip) hide();
    else show();
  });
}

// ---- the site context a task needs -----------------------------------------

interface SiteCtx {
  site: string;
  origin: string;
  libraries: DocLibrary[];
  ingestionLib: DocLibrary | null;
  cellCtx: RegisterCellCtx;
  dictBy: Map<string, import("./model").SiteColumn>;
  internalForRole: (role: string) => string;
  orgSetId: string;
}

/** A task constrained to a site (Ben, 2026-10-29): the term root per
 *  column — the site's own term in the Organisation set and its root in
 *  the Process area set. {} = any site. */
async function taskTermRoots(ctx: SiteCtx, site: string): Promise<Record<string, string>> {
  if (site.trim() === "") return {};
  const { siteTermRoots } = await import("./ingestionModel");
  const orgUnit = ctx.internalForRole("orgUnit");
  const processArea = ctx.internalForRole("processArea");
  const orgNodes = orgUnit !== "" && ctx.orgSetId !== "" ? (await cachedTermPaths(ctx.site, ctx.orgSetId, 6, 6000).catch(() => ({ nodes: [] as { id: string; labels: string[] }[] }))).nodes : [];
  let processRoot = "";
  let processNodes: { id: string; labels: string[] }[] = [];
  if (processArea !== "") {
    try {
      const [{ listProcessNodes }, { buildProcessTree, siteRootOf }] = await Promise.all([import("../store/processes"), import("../processes/model")]);
      const tree = buildProcessTree(await listProcessNodes());
      processRoot = tree.byId.get(siteRootOf(tree, site))?.termId ?? "";
    } catch {
      processRoot = "";
    }
    // the set's own walk: the root by label when the node is not bound yet,
    // and the check that a stale binding still names a term of this set
    const setId = ctx.dictBy.get(processArea)?.termSetId ?? "";
    if (setId !== "") processNodes = (await cachedTermPaths(ctx.site, setId, 6, 6000).catch(() => ({ nodes: [] as { id: string; labels: string[] }[] }))).nodes;
  }
  return siteTermRoots(site, { orgUnit, processArea }, orgNodes, processRoot, processNodes);
}

async function loadSiteCtx(): Promise<SiteCtx> {
  const [{ app, libraries }, palettes] = await Promise.all([docsConfig(), appPalettes().catch(() => ({ states: [], titles: [] }))]);
  const siteDict = deriveTypeStates(app.sites[siteKey(app.siteUrl)] ?? emptySiteDictionary(), libraries);
  const dictBy = new Map(siteDict.columns.map((c) => [c.internal, c]));
  const internalForRole = (role: string) => siteDict.columns.find((c) => c.role === role)?.internal ?? "";
  const statusInternal = internalForRole("status");
  const statusCol = statusInternal !== "" ? (dictBy.get(statusInternal) ?? null) : null;
  const myEmail = (currentViewer()?.email ?? "").toLowerCase();
  return {
    site: app.siteUrl,
    origin: app.siteUrl === "" ? "" : new URL(app.siteUrl).origin,
    libraries,
    ingestionLib: libraries.find((l) => l.libType === "ingestion") ?? null,
    cellCtx: { dict: siteDict, states: paletteMap(palettes.states), labelToId: new Map(), statusCol, myEmail },
    dictBy,
    internalForRole,
    orgSetId: app.orgSetId,
  };
}

/** The status vocabulary: label → id for the chips, and the list the
 *  stage lookup reads. */
async function readStatusTerms(ctx: SiteCtx): Promise<{ id: string; label: string }[]> {
  const col = ctx.cellCtx.statusCol;
  if (col === null || col.termSetId === "") return [];
  const r = await fetchTermsInSet(ctx.site, col.termSetId);
  const rows = Array.isArray((r.data as { value?: unknown[] })?.value) ? ((r.data as { value: unknown[] }).value as Record<string, unknown>[]) : [];
  const out: { id: string; label: string }[] = [];
  for (const t of rows) {
    const names = t.labels as { name?: string; isDefault?: boolean }[] | undefined;
    const def = Array.isArray(names) ? (names.find((l) => l.isDefault) ?? names[0]) : undefined;
    const name = (def?.name ?? "").trim();
    if (name === "" || typeof t.id !== "string") continue;
    ctx.cellCtx.labelToId.set(name.toLowerCase(), t.id);
    out.push({ id: t.id, label: name });
  }
  return out;
}

// ---- one write bracket on a file in the ingestion library -------------------

/** check-out (tolerated if not needed) → the forms-engine and typed
 *  writes → a MAJOR check-in. Returns "" or the refusal. */
async function writeValues(site: string, listId: string, row: DocRow, values: AddFieldValue[], comment: string, bracket = true): Promise<string> {
  const { formValues, patch } = splitAddWrites(values);
  if (formValues.length === 0 && Object.keys(patch).length === 0) return "";
  // the ingestion library has no check-out rule, so the writes go
  // straight in (two round trips, not four — Ben, 2026-10-09: "speed
  // these up"); a "not checked out" refusal falls back to the bracket
  if (!bracket) {
    const direct = await writeDirect(site, listId, row, formValues, patch);
    if (direct === "" || !/checked out/i.test(direct)) return direct;
  }
  const out = await checkOutFile(site, row.serverUrl);
  if (!out.ok && !/already checked out|checked out to you/i.test(spErrorText(out.status))) return `check-out refused: ${spErrorText(out.status)}`;
  const err = await writeDirect(site, listId, row, formValues, patch);
  if (err !== "") return err;
  const ci = await checkInFile(site, row.serverUrl, comment, true);
  if (!ci.ok && !/not checked out/i.test(spErrorText(ci.status))) return `check-in refused: ${spErrorText(ci.status)}`;
  return "";
}

async function writeDirect(site: string, listId: string, row: DocRow, formValues: { FieldName: string; FieldValue: string }[], patch: Record<string, unknown>): Promise<string> {
  if (formValues.length > 0) {
    const r = await validateUpdateListItem(site, listId, row.id, formValues, false);
    const errs = validateItemErrors(r.data);
    if (!r.ok || errs.length > 0) return errs.map((x) => `${x.field}: ${x.message}`).join("; ") || spErrorText(r.status);
  }
  if (Object.keys(patch).length > 0) {
    const r = await connectorPatchItem(site, listId, row.id, patch);
    if (!r.ok) return spErrorText(r.status);
  }
  return "";
}

/** Run `work` over `items`, at most `limit` at a time — brackets on
 *  different files are independent. Eight in flight (Ben, 2026-10-09)
 *  keeps the SharePoint connector under its 600-calls-a-minute line
 *  for a run's eight calls a file; more would start to be throttled
 *  and lose the gain. Order of completion is not the order of items. */
const IN_FLIGHT = 8;
async function pool<T>(items: T[], limit: number, work: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  const lane = async () => {
    while (next < items.length) {
      const item = items[next++];
      await work(item);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, lane));
}

/** A progress bar with a time-remaining estimate from the files done so far. */
function progressBar(host: HTMLElement) {
  const wrap = el("div", "app-ing-progress");
  const bar = el("div", "app-ing-progressbar");
  const fill = el("div", "app-ing-progressfill");
  bar.appendChild(fill);
  const text = el("div", "app-ing-progresstext", "");
  wrap.append(bar, text);
  wrap.style.display = "none";
  host.appendChild(wrap);
  let total = 0;
  let done = 0;
  let started = 0;
  let verb = "";
  const paint = (current = "") => {
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    fill.style.width = `${pct}%`;
    let eta = "";
    if (done >= 2 && done < total) {
      const per = (performance.now() - started) / done;
      const left = Math.round((per * (total - done)) / 1000);
      eta = left < 60 ? ` · about ${Math.max(left, 1)} s left` : ` · about ${Math.round(left / 60)} min left`;
    }
    text.textContent = `${verb} ${done} of ${total}${eta}${current !== "" ? ` — ${current}` : ""}`;
  };
  return {
    start: (n: number, what: string) => {
      total = n;
      done = 0;
      verb = what;
      started = performance.now();
      wrap.style.display = "";
      paint();
    },
    working: (current: string) => paint(current),
    tick: () => {
      done++;
      paint();
    },
    finish: () => {
      wrap.style.display = "none";
    },
  };
}

// ---- messaging the assignees ---------------------------------------------------

/** One Teams chat card to the given assignees (the caller left out, Teams
 *  refuses a self-chat). Returns the honest outcome for a status line:
 *  the send returns `{ error }` and NEVER throws — the first build
 *  awaited it and read nothing, so a refused send looked like success
 *  (Ben, 2026-10-12: "it didn't team message people"). */
async function messageAssignees(task: IngestionTask, recipients: IngestionAssignee[], destName: string, note = ""): Promise<string> {
  const me = (currentViewer()?.email ?? "").toLowerCase();
  const others = recipients.filter((a) => a.email !== "" && a.email.toLowerCase() !== me);
  const selfOnly = recipients.length > 0 && others.length === 0;
  if (others.length === 0) return selfOnly ? "You are the assignee — no Teams message (Teams refuses a chat with yourself)." : "No assignee to message.";
  try {
    const { sendNotifyTeams } = await import("./notify");
    const r = await sendNotifyTeams(
      others.map((a) => ({ name: a.name, email: a.email })),
      `Document ingestion: ${task.name}`,
      `You have been asked to help ingest documents into ${destName}. Add the files to the task's folder, set each file's details, and a document controller will run the ingestion. Open LeanBoard → Documents → Ingestion tasks.`,
      appLinkUrl(),
      // the sender's own words ride the card (UAT DOC-068: "send a note")
      note !== "" ? { label: `${currentViewer()?.name || "The document controller"} wrote`, text: note } : undefined
    );
    if (r.error !== "") return `The Teams message did not go: ${r.error.slice(0, 200)}`;
    return `Teams message sent to ${others.map((a) => a.name || a.email).join(", ")}${r.how === "message" ? " (as a plain message — the card was refused)" : ""}.`;
  } catch (e) {
    return `The Teams message did not go: ${e instanceof Error ? e.message : String(e)}`;
  }
}

// ---- the task screen -----------------------------------------------------------

export interface IngestionScreenOpts {
  task: IngestionTask;
  isController: boolean;
  /** The register repaints its panel and badge. */
  onChanged: () => void;
  /** A line to show on open (the editor's Teams outcome). */
  notice?: string;
}

export function openIngestionTask(o: IngestionScreenOpts): () => void {
  const scrim = el("div", "app-docs-scrim app-docs-scrim-right");
  const sheet = el("div", "app-docs-dialog app-docs-viewer app-ing-sheet");
  markDialog(sheet, `Ingestion task ${o.task.name}`);
  scrim.appendChild(sheet);
  document.body.appendChild(scrim);
  const untrap = trapFocus(sheet);
  let dead = false;
  let running = false;
  /** Unsaved cells: the close asks before dropping them. */
  let unsavedCount = (): number => 0;
  const closeNow = () => {
    dead = true;
    untrap();
    scrim.remove();
    document.removeEventListener("keydown", onKey);
  };
  const close = () => {
    if (running) return; // a run in flight is never abandoned by a stray Esc
    const n = unsavedCount();
    if (n === 0) {
      closeNow();
      return;
    }
    void promptConfirm({ title: "Discard unsaved changes?", note: `${n} file${n === 1 ? " has" : "s have"} details you have not saved.`, confirmLabel: "Discard", danger: true }).then((ok) => {
      if (ok) closeNow();
    });
  };
  const onKey = (e: KeyboardEvent) => {
    // a popover editor or a dialog on the sheet takes Esc for itself
    if (e.key === "Escape" && !sheet.querySelector(".ltk-dialog-overlay, .app-ing-pop")) close();
  };
  document.addEventListener("keydown", onKey);

  const task = o.task;
  /** The row's current assignees, defaults and name — read before the
   *  sheet writes, so an edit made meanwhile (or in the editor the
   *  sheet reopened from) is never saved over. Status and log are the
   *  sheet's own. */
  const adoptFresh = async (): Promise<void> => {
    const fresh = await getIngestionTask(task.rowId).catch(() => null);
    if (!fresh) return;
    task.name = fresh.name;
    task.assignees = fresh.assignees;
    task.defaults = fresh.defaults;
    task.destListId = fresh.destListId;
  };
  const head = el("div", "app-docs-viewhead");
  const titleBlock = el("div", "app-docs-viewtitle");
  const titleRow = el("div", "app-ing-titlerow");
  titleRow.appendChild(el("div", "app-docs-viewdocname", task.name));
  titleBlock.append(titleRow, el("div", "app-ing-meta", "Loading…"));
  head.appendChild(titleBlock);
  const closeBtn = btn("✕", "app-btn app-docs-viewclose");
  closeBtn.title = "Close this window — the task stays open";
  closeBtn.addEventListener("click", close);
  head.appendChild(closeBtn);
  sheet.appendChild(head);
  const body = el("div", "app-ing-body");
  sheet.appendChild(body);

  void (async () => {
    const ctx = await loadSiteCtx();
    if (dead) return;
    const src = ctx.ingestionLib;
    const dest = ctx.libraries.find((l) => l.listId.toLowerCase() === task.destListId) ?? null;
    const statusTerms = await readStatusTerms(ctx);
    if (dead) return;
    const meta = titleBlock.querySelector(".app-ing-meta")!;
    meta.textContent = `→ ${libName(dest ?? undefined)}${task.site !== "" ? ` · ${task.site} only` : ""} · ${task.assignees.length} assignee${task.assignees.length === 1 ? "" : "s"} · created by ${task.createdByName || task.createdByEmail} ${task.createdAt !== "" ? formatWhen(task.createdAt) : ""}`;
    // the site's term roots narrow the organisation and process editors
    const termRoots = await taskTermRoots(ctx, task.site);
    // a root the term set cannot give yet is said, not silently widened
    if (task.site !== "") {
      const unscoped = [ctx.internalForRole("orgUnit"), ctx.internalForRole("processArea")].filter((i) => i !== "" && termRoots[i] === undefined).map((i) => ctx.dictBy.get(i)?.label || i);
      if (unscoped.length > 0) meta.textContent += ` · ${unscoped.join(" and ")} not yet in the term set${unscoped.length === 1 ? "" : "s"} for ${task.site} — the whole set is offered until the sync runs`;
    }
    // a small chip beside the name, never a stretched band (Ben, 2026-10-09)
    titleRow.appendChild(statusChip(task.status === "closed" ? "✓ Closed" : task.status === "running" ? "◐ Running" : "● Open", task.status === "closed" ? "green" : "amber"));
    clear(body);
    if (src === null || dest === null || ctx.site === "") {
      body.appendChild(el("div", "app-cp-err", src === null ? "No ingestion library is exposed for this site (Settings → Documents → Libraries)." : "This task's destination library is no longer exposed."));
      return;
    }

    // the columns a file needs: the destination's required fields (live)
    // and the roles the register leans on, by label
    // both required flags: the field's and the content type's (Ben, 2026-10-26)
    const { loadLibraryFields } = await import("./libraryFields");
    const destFields: SpField[] = (await loadLibraryFields(ctx.site, dest.listId)).fields;
    const carried = new Set(dest.config.columns.filter((c) => c.available).map((c) => c.internal));
    // "orgUnit" is the role key — "organisation" never matched, so the
    // organisation column was never required (issue 25)
    // the MoC column follows SharePoint's own required flag like any other
    // column (2026-10-21 report: it was forced required here)
    const roleInternals = ["owner", "docType", "orgUnit"].map((r) => ctx.internalForRole(r)).filter((i) => i !== "" && carried.has(i));
    const required = destFields
      .filter((f) => (f.required || roleInternals.includes(f.internal)) && carried.has(f.internal) && f.internal !== ctx.internalForRole("status"))
      .map((f) => ({ internal: f.internal, label: ctx.dictBy.get(f.internal)?.label || f.title }));
    const statusInternal = ctx.internalForRole("status");
    const docIdInternal = ctx.internalForRole("documentId");
    const effInternal = ctx.internalForRole("effectiveDate");
    const importanceInternal = ctx.internalForRole("importance");
    const reviewInternal = ctx.internalForRole("nextReviewDate");
    const cadenceInternal = ctx.internalForRole("reviewCadence");
    // the grid's columns (proposal §9): EVERY column the destination type
    // offers, in the site dictionary's order — the Edit-properties form's
    // set — minus the two derived dates. The STATUS column is in the grid
    // since issue 25 (Ben, 2026-10-19): a legacy batch lands as
    // Superseded or Obsolete with its history, a draft as a minor
    // version; blank = Approved, as before.
    const derived = new Set([reviewInternal, cadenceInternal].filter((x) => x !== ""));
    const gridFields = columnsForTypes(ctx.cellCtx.dict, [dest.libType])
      .map((i) => destFields.find((f) => f.internal === i))
      .filter((f): f is SpField => f !== undefined && carried.has(f.internal) && !derived.has(f.internal) && editorKind(f) !== null);
    const requiredSet = new Set(required.map((r) => r.internal));
    // "Name on ingestion" (Ben, 2026-10-09): a synthetic first column — the
    // file's stem; a change RENAMES the file in the folder on Save, so
    // the copy carries the new name and the grid view shows it too
    const NAME: SpField = { internal: "__name", title: "Name on ingestion", type: "Text", choices: [], isTaxonomy: false, termSetId: "", required: false };
    const stemOf = (name: string) => {
      const dot = name.lastIndexOf(".");
      return dot > 0 ? name.slice(0, dot) : name;
    };
    const extPart = (name: string) => {
      const dot = name.lastIndexOf(".");
      return dot > 0 ? name.slice(dot) : "";
    };
    const gridCols: SpField[] = [NAME, ...gridFields];
    const feedFields = Array.from(new Set([...gridFields.map((f) => f.internal), ...required.map((r) => r.internal), docIdInternal, effInternal, importanceInternal, statusInternal].filter((f) => f !== "")));

    // ---- actions row ---------------------------------------------------------
    const actions = el("div", "app-ing-actions");
    // greyed until EVERY file has its required details (Ben, 2026-10-09)
    let runBtn: HTMLButtonElement | null = null;
    const openFolder = linkBtn("Open folder ↗", `${ctx.origin}${task.folder}`, "app-btn");
    openFolder.title = "The task's folder in SharePoint — add files there";
    // (an "Edit in grid view" link landed on the same folder page as
    // Open folder — removed, Ben 2026-10-09; the note names the grid view)
    const selectedCount = el("span", "app-cp-muted app-ing-selcount", "");
    const setSel = btn("Set for selected…");
    setSel.disabled = true;
    const fillBtn = btn("Fill blanks from defaults");
    fillBtn.disabled = task.defaults.length === 0;
    fillBtn.title = task.defaults.length === 0 ? "No task defaults set (Edit task…)" : "Put each default into the files that lack it (saved with Save changes)";
    // the spreadsheet round trip (features-plan-2026-10-29, feature 2):
    // the grid out as a workbook with dropdowns, an edited workbook back
    // INTO THE DRAFT — Save changes is the one write road
    const exportBtn = btn("Export sheet");
    exportBtn.title = "Download the grid as an Excel workbook — a Files sheet to edit, a Values sheet with every valid value";
    const uploadBtn = btn("Upload sheet…");
    uploadBtn.title = "Read an edited workbook back into the grid — Save changes writes it";
    uploadBtn.disabled = task.status === "closed";
    // the folder is edited in SharePoint: a refresh re-reads it (Ben, 2026-10-09)
    const refresh = btn("↻ Refresh");
    refresh.title = "Re-read the folder's files and details";
    refresh.addEventListener("click", () => void reloadGuarded());
    // a quick filter over every cell, and a fit-to-width toggle (Ben, 2026-10-09)
    const search = el("input", "app-input app-ing-search") as HTMLInputElement;
    search.type = "search";
    search.placeholder = "Filter files…";
    search.title = "Show the files whose name or any detail contains this";
    const fitBtn = btn("Fit to width");
    fitBtn.title = "Shrink every column so the whole grid fits without sideways scrolling";
    // the draft model (proposal §9): cells change here; Save writes each
    // touched file once
    const saveBtn = btn("Save changes", "app-btn app-btn-primary app-ing-save");
    saveBtn.disabled = true;
    const discardBtn = btn("Discard", "app-link");
    discardBtn.style.display = "none";
    // Refresh, Save and Discard at the far right (Ben, 2026-10-09)
    const farRight = el("span", "app-ing-actions-right");
    farRight.append(discardBtn, refresh, saveBtn);
    actions.append(setSel, fillBtn, exportBtn, uploadBtn, search, fitBtn, selectedCount, farRight);
    // the task-level buttons live in the title row, before ✕ (Ben, 2026-10-09)
    const right = el("span", "app-ing-headactions");
    right.appendChild(openFolder); // (Ben, 2026-10-09: with the task buttons)
    if (o.isController && task.status !== "closed" && task.assignees.length > 0) {
      const msg = btn("Message assignees…");
      msg.title = "Send the task's Teams card to every assignee, with a note";
      // a dialog, not a silent send (UAT DOC-068, 2026-10-26: "nothing
      // happened" — the outcome went to a line below the empty grid)
      msg.addEventListener("click", () => {
        const me = (currentViewer()?.email ?? "").toLowerCase();
        const others = task.assignees.filter((a) => a.email !== "" && a.email.toLowerCase() !== me);
        const dlg = openDialog({
          host: sheet,
          title: "Message assignees",
          maxWidth: 520,
          buttons: [
            { label: "Cancel", kind: "secondary", onClick: () => dlg.close() },
            { label: "Send", kind: "primary", onClick: () => void send() },
          ],
        });
        const sendBtn = dlg.root.querySelector(".ltk-btn-primary") as HTMLButtonElement;
        dlg.body.appendChild(el("div", "app-field-label", "To"));
        const list = el("div", "app-ing-msgto");
        for (const a of task.assignees) {
          const isMe = a.email.toLowerCase() === me;
          list.appendChild(el("div", isMe ? "app-field-hint" : "", `${a.name || a.email}${isMe ? " — you (Teams refuses a chat with yourself)" : ""}`));
        }
        dlg.body.appendChild(list);
        dlg.body.appendChild(el("div", "app-field-label", "Note"));
        const note = el("textarea", "app-input") as HTMLTextAreaElement;
        note.rows = 4;
        note.placeholder = "What you need from them, and by when — quoted under the card";
        dlg.body.appendChild(note);
        const out = el("div", "app-docs-addstatus");
        dlg.body.appendChild(out);
        if (others.length === 0) {
          out.textContent = "No one to message: you are the only assignee.";
          out.classList.add("app-docs-addstatus-warn");
          sendBtn.disabled = true;
        }
        const send = async () => {
          sendBtn.disabled = true;
          out.classList.remove("app-docs-addstatus-warn");
          out.textContent = "Sending the Teams card…";
          const result = await messageAssignees(task, task.assignees, libName(dest), note.value.trim());
          const sent = /^Teams message sent/.test(result);
          out.textContent = result;
          out.classList.toggle("app-docs-addstatus-warn", !sent);
          if (sent) {
            status.textContent = result;
            setTimeout(() => dlg.close(), 1500);
          } else {
            sendBtn.disabled = false;
          }
        };
        note.focus();
      });
      right.appendChild(msg);
    }
    if (o.isController && task.status !== "closed") {
      const edit = btn("Edit task…");
      edit.addEventListener("click", () => {
        let cancelled = false;
        openIngestionTaskEditor({
          task,
          onCancelled: () => {
            cancelled = true;
          },
          // the sheet reopens on the SAVED task (issue 26: it reopened on
          // the pre-edit copy, and Run / Close then wrote that copy back)
          onSaved: (saved, notice) => {
            o.onChanged();
            closeNow();
            if (!cancelled) openIngestionTask({ ...o, task: saved, notice });
          },
        });
      });
      runBtn = btn("Run ingestion…", "app-btn app-btn-primary");
      runBtn.disabled = true;
      // "End task…", not "Close task…" (Ellen, 2026-10-28: close read as
      // close-the-window); not "Cancel" — it completes the task
      const closeTask = btn("End task…");
      closeTask.title = "The batch is complete: the folder goes, the task keeps its log and leaves Ingestion tasks";
      closeTask.addEventListener("click", () => void closeOut());
      right.append(edit, closeTask, runBtn);
      runBtn.addEventListener("click", () => void startRun());
    }
    head.insertBefore(right, closeBtn);
    body.appendChild(actions);
    body.appendChild(
      el("div", "app-field-hint", task.status === "closed" ? "This task is closed — its log is below." : "Add files to the folder, then set each file's details in the grid (✱ = required; Tab moves across, Enter down) — or select rows and set one column for all. Save changes writes them. A document controller then runs the ingestion; files that are refused stay here with the reason.")
    );

    // ---- the files: the editable grid (proposal §9) ------------------------
    const gridHost = el("div", "app-ing-grid");
    body.appendChild(gridHost);
    const status = el("div", "app-ing-status");
    if (o.notice) status.textContent = o.notice;
    body.appendChild(status);
    const progress = progressBar(body);
    // writes on the ingestion library skip the bracket unless it asks
    const srcRules = await fetchListRules(ctx.site, src.listId);
    const srcForcesCheckout = ((srcRules.data ?? {}) as { ForceCheckout?: unknown }).ForceCheckout === true;
    const selected = new Set<string>();
    let rows: DocRow[] = [];
    let lastLog = latestByFile(task.log);
    const draft: Draft = new Map();
    unsavedCount = () => dirtyRows(draft).length;
    const nameCell = makeNameCell(ctx.cellCtx);
    const labelOf = (f: SpField) => ctx.dictBy.get(f.internal)?.label || f.title;
    // term label → id per set, resolved lazily so a taxonomy cell can open
    // with its current term selected (the feed gives labels only)
    const termIds = new Map<string, Promise<Map<string, string>>>();
    const termIdsFor = (setId: string): Promise<Map<string, string>> => {
      let p = termIds.get(setId);
      if (!p) {
        p = cachedTermPaths(ctx.site, setId)
          .then((w) => new Map(w.nodes.map((n) => [n.labels[n.labels.length - 1].toLowerCase(), n.id])))
          .catch(() => new Map<string, string>());
        termIds.set(setId, p);
      }
      return p;
    };
    const paintSel = () => {
      selectedCount.textContent = selected.size > 0 ? `${selected.size} selected` : "";
      setSel.disabled = selected.size === 0;
    };
    const paintDirty = () => {
      const n = dirtyRows(draft).length;
      saveBtn.disabled = n === 0;
      saveBtn.textContent = n > 0 ? `Save changes (${n} file${n === 1 ? "" : "s"})` : "Save changes";
      discardBtn.style.display = n > 0 ? "" : "none";
      for (const r of rows) {
        const rowEl = gridHost.querySelector<HTMLElement>(`[data-row="${r.uniqueId}"]`);
        if (rowEl) rowEl.classList.toggle("app-ing-row-dirty", draft.has(r.uniqueId));
      }
      if (runBtn) {
        runBtn.disabled = n > 0 || !allReadySaved() || running;
        if (n > 0) runBtn.title = "Save changes first";
      }
    };
    // files sharing a name anywhere in the task (sub-folders, 2026-11-01)
    // would collide on the flat landing: not ready until one is renamed
    let dupes = new Set<string>();
    const isReady = (r: DocRow) => missingFor(r.values, required).length === 0 && !dupes.has(r.uniqueId);
    const allReadySaved = () => rows.length > 0 && rows.every(isReady);
    /** A glyph at the end of the frozen Document cell (Ben, 2026-10-09:
     *  a right-frozen column was clunky): ✓ ready, ⚠ with what is missing
     *  and the last refusal in the tooltip. */
    const readyMark = (row: DocRow): HTMLElement => {
      const missing = missingFor(effectiveValues(row.values, draft.get(row.uniqueId)), required);
      if (dupes.has(row.uniqueId)) missing.push("a unique name — another file in this task has the same name; rename one with Name on ingestion");
      const last = lastLog.get(row.name);
      const refused = last && last.outcome === "refused" ? `\nLast run: ${last.detail}` : "";
      const mark = el("span", "app-ing-readymark " + (missing.length === 0 ? "app-ing-readymark-ok" : "app-ing-readymark-warn"), missing.length === 0 ? "✓" : "⚠");
      const text = (missing.length === 0 ? "Ready to ingest" : `Missing: ${missing.join(", ")}`) + refused;
      mark.setAttribute("aria-label", text);
      attachTip(mark, text);
      return mark;
    };
    /** Open flags on the files in this task (issue 23), keyed list:item
     *  — a ⚑ at the end of the Document cell raises one, lit when the
     *  file already carries some; a flag follows the file when it lands. */
    let fileFlags = new Map<string, DocFlag[]>();
    const reloadFileFlags = async () => {
      try {
        const { listOpenFlags } = await import("./docFlags");
        const all = await listOpenFlags(ctx.site);
        fileFlags = new Map();
        for (const f of all) {
          if (f.listId !== src.listId.toLowerCase()) continue;
          const k = flagKey(f.listId, f.itemId);
          fileFlags.set(k, [...(fileFlags.get(k) ?? []), f]);
        }
      } catch {
        /* unreadable = no flags shown */
      }
    };
    const flagCell = (row: DocRow): HTMLElement => {
      const open = fileFlags.get(flagKey(src.listId, row.id)) ?? [];
      const c = el("div", "app-ing-cell app-ing-cell-flag");
      for (const f of open) {
        const pill = statusChip(`⚑ ${f.level}`, "amber");
        pill.title = `${f.flaggerName || f.flaggerEmail}${f.comment !== "" ? ` — ${f.comment}` : ""}`;
        c.appendChild(pill);
      }
      const b = btn(open.length === 0 ? "⚑ Flag…" : "＋", "app-btn app-ing-flagbtn");
      const text = open.length === 0 ? "Flag this file for review — ingest it as is, the flag follows it" : "Add another flag";
      b.title = text;
      b.setAttribute("aria-label", text);
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        void (async () => {
          const [{ openFlagDialog }, { controllerMembers }, { docsConfig: readCfg }] = await Promise.all([import("./flagDialog"), import("./accessGates"), import("./docsStore")]);
          const me = (currentViewer()?.email ?? "").toLowerCase();
          const ctl = await controllerMembers().catch(() => []);
          const cfg = await readCfg();
          openFlagDialog({
            host: sheet,
            doc: { site: ctx.site, listId: src.listId, itemId: row.id, uid: row.uniqueId, name: row.name, version: "" },
            levels: reviewLevelsOf(cfg.app),
            source: "ingestion",
            recipients: ctl.filter((m) => m.email !== "" && m.email.toLowerCase() !== me).map((m) => ({ name: m.name, email: m.email })),
            recipientsLabel: "The document controllers",
            link: appLinkUrl(),
            onRaised: () => {
              status.textContent = `“${row.name}” flagged for review — the flag follows the file into ${libName(dest ?? undefined)}.`;
              void reloadFileFlags().then(() => paintGrid());
            },
          });
        })();
      });
      c.appendChild(b);
      return c;
    };
    const repaintReady = (row: DocRow) => {
      const old = gridHost.querySelector<HTMLElement>(`[data-row="${row.uniqueId}"] .app-ing-readymark`);
      if (old) old.replaceWith(readyMark(row));
    };
    /** A blank typed over a saved value is a CLEAR (features-plan-
     *  2026-10-29, Ben: "clear the value"); over a blank it is nothing.
     *  The name column never clears — a file keeps a name. */
    const typed = (row: DocRow, f: SpField, kind: AddFieldValue["kind"], text: string): AddFieldValue =>
      text.trim() === "" && f !== NAME && savedDisplay(row.values, f.internal, kind) !== "" ? { internal: f.internal, kind, clear: true } : { internal: f.internal, kind, text };
    const commit = (row: DocRow, v: AddFieldValue) => {
      setCell(draft, row.uniqueId, row.values, v);
      const cellEl = gridHost.querySelector<HTMLElement>(`[data-row="${row.uniqueId}"] [data-col="${v.internal}"]`);
      if (cellEl) cellEl.classList.toggle("app-ing-cell-dirty", draft.get(row.uniqueId)?.has(v.internal) === true);
      repaintReady(row);
      paintDirty();
    };
    /** Enter moves to the same column one row down (the values grid's
     *  grammar); Esc puts the cell back as it reads now. */
    const keyNav = (ctl: HTMLElement, row: DocRow, f: SpField, revert: () => void) => {
      ctl.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !(ctl instanceof HTMLTextAreaElement)) {
          e.preventDefault();
          (ctl as HTMLInputElement).blur();
          const i = shown.findIndex((r) => r.uniqueId === row.uniqueId);
          const next = shown[i + 1];
          if (next) gridHost.querySelector<HTMLElement>(`[data-row="${next.uniqueId}"] [data-col="${f.internal}"] input, [data-row="${next.uniqueId}"] [data-col="${f.internal}"] select, [data-row="${next.uniqueId}"] [data-col="${f.internal}"] button`)?.focus();
        } else if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          revert();
          (ctl as HTMLInputElement).blur();
        }
      });
    };
    /** The cell's value as something the forms could WRITE: the draft's,
     *  else the saved value lifted — terms through the set's walk, people
     *  from the feed's email twin. Null when it reads blank. */
    const valueOf = async (row: DocRow, f: SpField): Promise<AddFieldValue | null> => {
      const d = draft.get(row.uniqueId)?.get(f.internal);
      if (d) return d;
      const kind = editorKind(f) ?? "text";
      if (kind === "taxonomy") {
        if (f.termSetId === "") return null;
        const ids = await termIdsFor(f.termSetId);
        const terms = (row.values[f.internal] ?? "").split(";").map((x) => x.trim()).filter((x) => x !== "").map((l) => ({ label: l, termId: ids.get(l.toLowerCase()) ?? "" })).filter((t) => t.termId !== "");
        if (terms.length === 0) return null;
        return f.type === "TaxonomyFieldTypeMulti" ? { internal: f.internal, kind, multi: true, terms, label: terms[0].label, termId: terms[0].termId } : { internal: f.internal, kind, label: terms[0].label, termId: terms[0].termId };
      }
      if (kind === "person") {
        const names = (row.values[f.internal] ?? "").split(";").map((x) => x.trim());
        const emails = (row.values[`${f.internal}#email`] ?? "").split(";").map((x) => x.trim().toLowerCase());
        const people = emails.map((email, i) => ({ email, name: names[i] ?? email })).filter((p) => p.email !== "");
        return people.length === 0 ? null : { internal: f.internal, kind, people };
      }
      const text = savedDisplay(row.values, f.internal, kind);
      return text === "" ? null : { internal: f.internal, kind, text };
    };
    /** Excel's fill handle (Ben, 2026-10-09): drag the corner of a cell
     *  down and the rows passed over take its value, in the draft. */
    const startFill = (e: PointerEvent, row: DocRow, f: SpField) => {
      e.preventDefault();
      e.stopPropagation();
      const from = shown.findIndex((r) => r.uniqueId === row.uniqueId);
      let to = from;
      const mark = () => {
        gridHost.querySelectorAll<HTMLElement>(".app-ing-fillmark").forEach((c) => c.classList.remove("app-ing-fillmark"));
        for (let i = Math.min(from, to); i <= Math.max(from, to); i++) {
          gridHost.querySelector<HTMLElement>(`[data-row="${shown[i].uniqueId}"] [data-col="${f.internal}"]`)?.classList.add("app-ing-fillmark");
        }
      };
      const move = (ev: PointerEvent) => {
        const hit = document.elementFromPoint(ev.clientX, ev.clientY)?.closest<HTMLElement>("[data-row]");
        if (!hit) return;
        const i = shown.findIndex((r) => r.uniqueId === hit.dataset.row);
        if (i >= 0 && i !== to) {
          to = i;
          mark();
        }
      };
      const up = () => {
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", up);
        gridHost.querySelectorAll<HTMLElement>(".app-ing-fillmark").forEach((c) => c.classList.remove("app-ing-fillmark"));
        if (to === from) return;
        void valueOf(row, f).then((v) => {
          if (!v) return;
          for (let i = Math.min(from, to); i <= Math.max(from, to); i++) {
            const target = shown[i];
            if (target.uniqueId === row.uniqueId) continue;
            commit(target, { ...v, internal: f.internal });
            const cellEl = gridHost.querySelector<HTMLElement>(`[data-row="${target.uniqueId}"] [data-col="${f.internal}"]`);
            if (cellEl) paintCell(cellEl, target, f);
          }
        });
      };
      mark();
      document.addEventListener("pointermove", move);
      document.addEventListener("pointerup", up);
    };
    /** The cell's current reading: the draft's, else the saved value. */
    const current = (row: DocRow, f: SpField): string => {
      const d = draft.get(row.uniqueId)?.get(f.internal);
      const kind = editorKind(f) ?? "text";
      return d ? (kind === "date" ? (d.text ?? "") : effectiveValues(row.values, draft.get(row.uniqueId))[f.internal] ?? "") : savedDisplay(row.values, f.internal, kind);
    };
    /** A popover with the FORM editor for one field, anchored to the cell —
     *  taxonomy, people, notes: the pickers already know these kinds. */
    const openCellPopover = async (anchor: HTMLElement, row: DocRow, f: SpField) => {
      document.querySelectorAll(".app-ing-pop").forEach((p) => p.remove());
      const pop = el("div", "app-cp-menu app-ing-pop");
      const box = el("div", "app-ing-popbody");
      const bar = el("div", "app-ing-popbar");
      const set = btn("Set", "app-btn app-btn-primary");
      const cancel = btn("Cancel", "app-link");
      bar.append(cancel, set);
      // a cell with a value offers Clear (features-plan-2026-10-29) — it
      // lands in the draft like any edit and writes an empty value on Save
      if (current(row, f) !== "" && f !== NAME) {
        const clr = btn("Clear", "app-link");
        clr.title = `Clear ${labelOf(f)} on this file`;
        clr.addEventListener("click", () => {
          closePop();
          commit(row, { internal: f.internal, kind: editorKind(f) ?? "text", clear: true });
          const cellEl = gridHost.querySelector<HTMLElement>(`[data-row="${row.uniqueId}"] [data-col="${f.internal}"]`);
          if (cellEl) paintCell(cellEl, row, f);
        });
        bar.prepend(clr);
      }
      pop.append(box, bar);
      // the current value as the editor's starting point
      const initial = new Map<string, { text?: string; people?: { email: string; name: string }[]; term?: { label: string; termId: string }; terms?: { label: string; termId: string }[] }>();
      const v = await valueOf(row, f);
      if (v) {
        if (v.kind === "taxonomy") initial.set(f.internal, v.multi === true && v.terms ? { terms: v.terms } : v.label && v.termId ? { term: { label: v.label, termId: v.termId } } : {});
        else if (v.kind === "person") initial.set(f.internal, { people: v.people ?? [] });
        else initial.set(f.internal, { text: v.text ?? "" });
      }
      // includeStatus: ingestion is the one place a status is set by hand —
      // the documents arrive with their history (issue 25; regression
      // from v0.79's status-out-of-forms rule, 2026-10-28 reports 4 and 5)
      const editors = buildFieldEditors({ site: ctx.site, box, fields: [f], columns: [{ internal: f.internal, available: true }], dictBy: ctx.dictBy, onChange: () => undefined, initial, includeSystemDates: true, includeStatus: true, termRoots });
      const closePop = () => {
        pop.remove();
        document.removeEventListener("pointerdown", off, true);
        document.removeEventListener("keydown", onPopKey, true);
      };
      const off = (e: PointerEvent) => {
        if (!pop.contains(e.target as Node)) closePop();
      };
      const onPopKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          closePop();
        }
      };
      cancel.addEventListener("click", closePop);
      set.addEventListener("click", () => {
        const v = editors[0]?.read();
        closePop();
        if (v) {
          commit(row, v);
          const cellEl = gridHost.querySelector<HTMLElement>(`[data-row="${row.uniqueId}"] [data-col="${f.internal}"]`);
          if (cellEl) paintCell(cellEl, row, f);
        }
      });
      const r = anchor.getBoundingClientRect();
      pop.style.top = `${Math.min(r.bottom + 4, window.innerHeight - 380)}px`;
      pop.style.left = `${Math.min(r.left, window.innerWidth - 400)}px`;
      document.body.appendChild(pop);
      setTimeout(() => {
        document.addEventListener("pointerdown", off, true);
        document.addEventListener("keydown", onPopKey, true);
        box.querySelector<HTMLElement>("input, select, textarea")?.focus();
      }, 0);
    };
    /** One cell: a control in place for the simple kinds, a button
     *  opening the popover for the rest. */
    const paintCell = (cellEl: HTMLElement, row: DocRow, f: SpField) => {
      clear(cellEl);
      const kind = editorKind(f) ?? "text";
      const value = current(row, f);
      if (ctx.dictBy.get(f.internal)?.role === "managementOfChange") {
        // change records (issue 10): never the raw JSON — a count, and the
        // records editor in a dialog (2026-10-21 report)
        const recs = parseMocRecords(value) ?? [];
        const b = btn(recs.length === 0 ? "—" : recs.map((r) => r.ref || "link").slice(0, 3).join(", ") + (recs.length > 3 ? ` +${recs.length - 3}` : ""), "app-ing-cellbtn" + (recs.length === 0 ? " app-ing-cellbtn-empty" : ""));
        b.title = recs.length === 0 ? `Add change records` : `${recs.length} change record${recs.length === 1 ? "" : "s"} — click to edit`;
        b.addEventListener("click", () => {
          void import("./mocEditor").then(({ buildMocEditor }) => {
            const dlg = openDialog({
              host: sheet,
              title: `${labelOf(f)} — ${row.name}`,
              maxWidth: 640,
              buttons: [
                { label: "Cancel", kind: "secondary", onClick: () => dlg.close() },
                {
                  label: "Set",
                  kind: "primary",
                  onClick: () => {
                    commit(row, { internal: f.internal, kind: "text", text: editor.read() });
                    dlg.close();
                    paintCell(cellEl, row, f);
                  },
                },
              ],
            });
            const editor = buildMocEditor({ initialRaw: value, onChange: () => undefined });
            dlg.body.appendChild(editor.root);
          });
        });
        cellEl.appendChild(b);
      } else if (kind === "choice") {
        const sel = el("select", "app-input app-ing-ctl") as HTMLSelectElement;
        const ph = el("option", "", "—") as HTMLOptionElement;
        ph.value = "";
        sel.appendChild(ph);
        for (const c of f.choices) {
          const o = el("option", "", c) as HTMLOptionElement;
          o.value = c;
          sel.appendChild(o);
        }
        if (f.choices.includes(value)) sel.value = value;
        sel.addEventListener("change", () => commit(row, typed(row, f, "choice", sel.value)));
        keyNav(sel, row, f, () => (sel.value = current(row, f)));
        cellEl.appendChild(sel);
      } else if (kind === "date") {
        const inp = el("input", "app-input app-ing-ctl") as HTMLInputElement;
        inp.type = "date";
        inp.value = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
        inp.addEventListener("change", () => commit(row, typed(row, f, "date", inp.value)));
        keyNav(inp, row, f, () => (inp.value = current(row, f)));
        cellEl.appendChild(inp);
      } else if (kind === "text" && f.type !== "Note") {
        const inp = el("input", "app-input app-ing-ctl") as HTMLInputElement;
        inp.value = value;
        inp.addEventListener("change", () => commit(row, typed(row, f, "text", inp.value)));
        keyNav(inp, row, f, () => (inp.value = current(row, f)));
        cellEl.appendChild(inp);
      } else {
        const b = btn(value !== "" ? value : "—", "app-ing-cellbtn" + (value === "" ? " app-ing-cellbtn-empty" : ""));
        b.title = value !== "" ? `${value} — click to change` : `Set ${labelOf(f)}`;
        b.addEventListener("click", () => void openCellPopover(b, row, f));
        cellEl.appendChild(b);
      }
      if (f !== NAME) {
        const handle = el("span", "app-ing-fillhandle");
        handle.title = "Drag down to fill";
        handle.addEventListener("pointerdown", (e) => startFill(e, row, f));
        cellEl.appendChild(handle);
      }
    };
    // the VIEW: the rows after the filter and the sort — what the grid
    // paints and what Enter-down and the fill handle walk
    let filterText = "";
    let sortKey = "__name";
    let sortAsc = true;
    let fit = false;
    let shown: DocRow[] = [];
    const cellText = (row: DocRow, internal: string): string => effectiveValues(row.values, draft.get(row.uniqueId))[internal] ?? "";
    const computeView = () => {
      const q = filterText.trim().toLowerCase();
      const keys = gridCols.map((f) => f.internal);
      let v = q === "" ? [...rows] : rows.filter((r) => r.name.toLowerCase().includes(q) || keys.some((k) => cellText(r, k).toLowerCase().includes(q)));
      const col = gridCols.find((f) => f.internal === sortKey);
      const isDate = col ? editorKind(col) === "date" : false;
      const num = (s: string) => (s !== "" && !Number.isNaN(Number(s)) ? Number(s) : null);
      v = v.sort((a, b) => {
        // the name sort reads the tree: folder first, then the name
        if (sortKey === "__name") {
          const c = compareByFolderThenName(a, b, task.folder);
          return sortAsc ? c : -c;
        }
        const x = isDate ? savedDisplay(effectiveValues(a.values, draft.get(a.uniqueId)), sortKey, "date") : cellText(a, sortKey);
        const y = isDate ? savedDisplay(effectiveValues(b.values, draft.get(b.uniqueId)), sortKey, "date") : cellText(b, sortKey);
        // blanks last either way; numbers as numbers; otherwise natural text
        if (x === "" && y !== "") return 1;
        if (y === "" && x !== "") return -1;
        const nx = num(x);
        const ny = num(y);
        const c = nx !== null && ny !== null ? nx - ny : x.localeCompare(y, undefined, { numeric: true, sensitivity: "base" });
        return sortAsc ? c : -c;
      });
      shown = v;
    };
    search.addEventListener("input", () => {
      filterText = search.value;
      paintGrid();
    });
    fitBtn.addEventListener("click", () => {
      fit = !fit;
      fitBtn.textContent = fit ? "Normal width" : "Fit to width";
      fitBtn.title = fit ? "Back to full-width columns with sideways scrolling" : "Shrink every column so the whole grid fits without sideways scrolling";
      gridHost.classList.toggle("app-ing-grid-fit", fit);
      paintGrid();
    });
    // Document · Name on ingestion · Flag for review (Ben, 2026-10-19: a
    // glyph in the Document cell was too obscure) · the configured columns
    // every row is ITS OWN grid (the header too), so a proportional track
    // resolves against each row's own width and the rows drift apart
    // (2026-10-21 report: headers not matching cells, widths differing
    // between rows) — the normal layout uses FIXED tracks, the fitted one
    // shares the pane's width equally
    const template = () => (fit ? `minmax(200px, 1.6fr) minmax(0, 1.2fr) minmax(0, 0.9fr) ${gridFields.map(() => "minmax(0, 1fr)").join(" ")}` : `320px 260px 170px ${gridFields.map(() => "190px").join(" ")}`);
    const paintGrid = () => {
      computeView();
      clear(gridHost);
      const head = el("div", "app-ing-gridrow app-ing-gridhead");
      head.style.gridTemplateColumns = template();
      const docHead = el("div", "app-ing-cell app-ing-cell-doc", "");
      const all = el("input", "app-docs-libcheck") as HTMLInputElement;
      all.type = "checkbox";
      all.title = "Select all";
      all.checked = shown.length > 0 && shown.every((r) => selected.has(r.uniqueId));
      all.title = filterText.trim() !== "" ? "Select the files shown" : "Select all";
      all.addEventListener("change", () => {
        for (const r of shown) {
          if (all.checked) selected.add(r.uniqueId);
          else selected.delete(r.uniqueId);
        }
        paintSel();
        paintGrid();
      });
      docHead.append(all, el("span", undefined, "Document"));
      head.appendChild(docHead);
      for (const f of gridCols) {
        const h = el("div", "app-ing-cell app-ing-sorthead");
        const b = btn(labelOf(f) + (requiredSet.has(f.internal) ? " ✱" : "") + (sortKey === f.internal ? (sortAsc ? " ▲" : " ▼") : ""), "app-link app-ing-sortbtn");
        b.title = (f === NAME ? "The document's name once ingested — change it here; the extension stays. Sorted by folder, then name. " : requiredSet.has(f.internal) ? "Required before the file can move. " : "") + "Click to sort";
        b.addEventListener("click", () => {
          if (sortKey === f.internal) sortAsc = !sortAsc;
          else {
            sortKey = f.internal;
            sortAsc = true;
          }
          paintGrid();
        });
        h.appendChild(b);
        head.appendChild(h);
        if (f === NAME) {
          const fh = el("div", "app-ing-cell", "Flag for review");
          fh.title = "Ingest the file as is and flag it for review — the flag follows the file into the destination library";
          head.appendChild(fh);
        }
      }
      gridHost.appendChild(head);
      if (rows.length === 0) {
        gridHost.appendChild(el("div", "app-ing-empty", task.status === "closed" ? "Every file has moved." : "No files yet — open the folder and add them, then Refresh."));
        return;
      }
      if (shown.length === 0) {
        gridHost.appendChild(el("div", "app-ing-empty", `No file matches "${filterText.trim()}".`));
        return;
      }
      const paintRow = (row: DocRow) => {
        const rowEl = el("div", "app-ing-gridrow" + (draft.has(row.uniqueId) ? " app-ing-row-dirty" : ""));
        rowEl.dataset.row = row.uniqueId;
        rowEl.style.gridTemplateColumns = template();
        const doc = el("div", "app-ing-cell app-ing-cell-doc");
        const box = el("input", "app-docs-libcheck") as HTMLInputElement;
        box.type = "checkbox";
        box.checked = selected.has(row.uniqueId);
        box.addEventListener("change", () => {
          if (box.checked) selected.add(row.uniqueId);
          else selected.delete(row.uniqueId);
          paintSel();
        });
        const nameWrap = el("div", "app-ing-namewrap");
        nameWrap.appendChild(nameCell(row));
        const sub = row.values.__folder ?? "";
        if (sub !== "") {
          const pathEl = el("div", "app-ing-path", folderLabel(sub));
          pathEl.title = `In the task folder under ${sub} — the file lands flat in the destination`;
          nameWrap.appendChild(pathEl);
        }
        doc.append(box, el("span", "app-ing-dirtydot", "●"), nameWrap, readyMark(row));
        rowEl.appendChild(doc);
        for (const f of gridCols) {
          const c = el("div", "app-ing-cell app-ing-cell-edit" + (draft.get(row.uniqueId)?.has(f.internal) ? " app-ing-cell-dirty" : ""));
          c.dataset.col = f.internal;
          paintCell(c, row, f);
          rowEl.appendChild(c);
          if (f === NAME) rowEl.appendChild(flagCell(row));
        }
        gridHost.appendChild(rowEl);
      };
      // a tree reads as a tree (Ben, 2026-11-01): in the name order a
      // group row per sub-folder — its path, count, a checkbox selecting
      // every file in it (then Set for selected…), Open ↗ to the folder
      const grouped = sortKey === "__name" && rows.some((r) => (r.values.__folder ?? "") !== "");
      if (!grouped) {
        for (const row of shown) paintRow(row);
        return;
      }
      for (const g of folderGroups(shown, task.folder)) {
        // the row spans the grid's width on the rows' own template (the
        // tint runs edge to edge); its content sits sticky at the left
        const gr = el("div", "app-ing-gridrow app-ing-group");
        gr.style.gridTemplateColumns = template();
        const inner = el("div", "app-ing-group-inner");
        gr.appendChild(inner);
        const gbox = el("input", "app-docs-libcheck") as HTMLInputElement;
        gbox.type = "checkbox";
        gbox.checked = g.items.every((r) => selected.has(r.uniqueId));
        gbox.title = `Select every file in ${g.label}`;
        gbox.addEventListener("change", () => {
          for (const r of g.items) {
            if (gbox.checked) selected.add(r.uniqueId);
            else selected.delete(r.uniqueId);
          }
          paintSel();
          paintGrid();
        });
        inner.appendChild(gbox);
        inner.appendChild(el("span", "app-ing-group-label", g.label));
        inner.appendChild(el("span", "app-ing-group-count", `${g.items.length} file${g.items.length === 1 ? "" : "s"}`));
        const open = linkBtn("Open ↗", `${ctx.origin}${task.folder}${g.path === "" ? "" : `/${g.path}`}`, "app-link app-ing-group-open");
        open.title = "This folder in SharePoint";
        inner.appendChild(open);
        gridHost.appendChild(gr);
        for (const row of g.items) paintRow(row);
      }
    };
    const reload = async (): Promise<void> => {
      status.textContent = "Reading the folder…";
      // every file under the task folder, sub-folders included (Ben,
      // 2026-11-01): one recursive feed, followed page by page to the cap
      const got: DocRow[] = [];
      let next = "";
      let capped = false;
      for (;;) {
        const page = await renderListPage(ctx.site, src.listId, buildRenderViewXml({ fields: feedFields, rowLimit: 500, sortName: true, asc: true, scope: "recursive" }), next, task.folder);
        if (dead) return;
        if (page.error !== "") {
          status.textContent = `Could not read the folder: ${page.error}`;
          return;
        }
        got.push(...page.rows);
        if (page.next === "") break;
        if (got.length >= FILES_CAP) {
          capped = true;
          break;
        }
        next = page.next;
      }
      rows = got;
      await reloadFileFlags();
      if (dead) return;
      for (const r of rows) {
        r.values.__name = stemOf(r.name);
        r.values.__folder = subFolderOf(r.serverUrl, task.folder);
      }
      dupes = duplicateNames(rows);
      const subFolders = new Set(rows.map((r) => r.values.__folder ?? "").filter((f) => f !== "")).size;
      for (const id of [...selected]) if (!rows.some((r) => r.uniqueId === id)) selected.delete(id);
      for (const id of [...draft.keys()]) if (!rows.some((r) => r.uniqueId === id)) draft.delete(id);
      paintGrid();
      paintSel();
      const ready = rows.filter(isReady).length;
      status.textContent = rows.length === 0 ? "" : `${rows.length} file${rows.length === 1 ? "" : "s"}${subFolders > 0 ? ` in ${subFolders} sub-folder${subFolders === 1 ? "" : "s"}` : ""}${capped ? ` (the first ${FILES_CAP} — split the task)` : ""} · ${ready} ready${dupes.size > 0 ? ` · ${dupes.size} share a name` : ""}${task.log.length > 0 ? ` · log: ${logSummary(task.log)}` : ""}`;
      if (runBtn) {
        const allReady = rows.length > 0 && ready === rows.length;
        runBtn.disabled = !allReady || running || dirtyRows(draft).length > 0;
        runBtn.title = rows.length === 0 ? "No files in the folder yet" : allReady ? "Copy every file into the destination as approved version 1" : `${rows.length - ready} file${rows.length - ready === 1 ? " is" : "s are"} not ready — missing details or a shared name; see the ⚠ marks`;
      }
      paintDirty();
    };
    /** A refresh with drafts asks first — SharePoint's reading would
     *  replace what is typed here. */
    const reloadGuarded = async (): Promise<void> => {
      const n = dirtyRows(draft).length;
      if (n > 0) {
        const ok = await promptConfirm({ title: "Discard unsaved changes?", note: `Refreshing re-reads the folder; ${n} file${n === 1 ? " has" : "s have"} details you have not saved.`, confirmLabel: "Discard and refresh", danger: true });
        if (!ok) return;
        draft.clear();
      }
      await reload();
    };
    await reload();

    // ---- save / discard ------------------------------------------------------
    saveBtn.addEventListener("click", () => {
      void (async () => {
        const ids = dirtyRows(draft);
        if (ids.length === 0) return;
        saveBtn.disabled = true;
        const refused: string[] = [];
        progress.start(ids.length, "Saving");
        status.textContent = "";
        const saveOne = async (id: string): Promise<void> => {
          const row = rows.find((r) => r.uniqueId === id);
          if (!row) return;
          progress.working(row.name);
          const all = writesFor(draft, id);
          const nameV = all.find((v) => v.internal === NAME.internal);
          let target = row;
          if (nameV) {
            const stem = sanitizeFileName(nameV.text ?? "");
            if (stem === "") {
              refused.push(`${row.name}: the new name leaves nothing usable`);
              return;
            }
            const newName = `${stem}${extPart(row.name)}`;
            const newUrl = `${dirOf(row.serverUrl) || task.folder}/${newName}`;
            const mv = await moveFileByPath(ctx.site, `${ctx.origin}${row.serverUrl}`, `${ctx.origin}${newUrl}`);
            if (!mv.ok) {
              const text = spErrorText(mv.status);
              refused.push(`${row.name}: rename refused — ${/already exists/i.test(text) ? `"${newName}" is already in the folder` : text}`);
              return;
            }
            target = { ...row, name: newName, serverUrl: newUrl };
            draft.get(id)?.delete(NAME.internal);
          }
          const err = await writeValues(ctx.site, src.listId, target, all.filter((v) => v.internal !== NAME.internal), "Details set", srcForcesCheckout);
          if (err === "") draft.delete(id);
          else refused.push(`${target.name}: ${err}`);
        };
        await pool(ids, IN_FLIGHT, async (id) => {
          await saveOne(id);
          progress.tick();
        });
        progress.finish();
        await reload();
        if (refused.length > 0) status.textContent = `${ids.length - refused.length} saved; refused — ${refused.join("; ")}`.slice(0, 600);
      })();
    });
    discardBtn.addEventListener("click", () => {
      void promptConfirm({ title: "Discard unsaved changes?", note: `${dirtyRows(draft).length} file${dirtyRows(draft).length === 1 ? " has" : "s have"} details you have not saved.`, confirmLabel: "Discard", danger: true }).then((ok) => {
        if (!ok) return;
        draft.clear();
        paintGrid();
        paintDirty();
      });
    });

    // ---- bulk set (into the draft) ------------------------------------------
    setSel.addEventListener("click", () => {
      const targets = rows.filter((r) => selected.has(r.uniqueId));
      if (targets.length === 0) return;
      const dlg = openDialog({
        host: sheet,
        title: `Set one detail for ${targets.length} file${targets.length === 1 ? "" : "s"}`,
        maxWidth: 520,
        buttons: [
          { label: "Cancel", kind: "secondary", onClick: () => dlg.close() },
          { label: "Set for selected", kind: "primary", onClick: () => apply() },
        ],
      });
      const pick = el("select", "app-input") as HTMLSelectElement;
      for (const f of gridFields) {
        const opt = el("option", "", labelOf(f)) as HTMLOptionElement;
        opt.value = f.internal;
        pick.appendChild(opt);
      }
      const box = el("div", "app-ing-onefield");
      const note = el("div", "app-field-hint", "The value lands in the grid; Save changes writes it.");
      dlg.body.append(el("div", "app-field-label", "Column"), pick, box, note);
      let editors: ReturnType<typeof buildFieldEditors> = [];
      const paint = () => {
        editors = buildFieldEditors({ site: ctx.site, box, fields: gridFields.filter((f) => f.internal === pick.value), columns: [{ internal: pick.value, available: true }], dictBy: ctx.dictBy, onChange: () => undefined, includeSystemDates: true, includeStatus: true, termRoots });
      };
      pick.addEventListener("change", paint);
      paint();
      const apply = () => {
        const values = editors.filter((e) => !e.isEmpty()).map((e) => e.read());
        if (values.length === 0) {
          note.textContent = "Pick a value first.";
          return;
        }
        const touched = applyToRows(draft, targets, values, false);
        dlg.close();
        selected.clear();
        paintGrid();
        paintSel();
        paintDirty();
        status.textContent = `${touched} file${touched === 1 ? "" : "s"} changed in the grid — Save changes writes them.`;
      };
    });

    // ---- fill blanks from defaults (into the draft) ---------------------------
    fillBtn.addEventListener("click", () => {
      const touched = applyToRows(draft, rows, task.defaults, true);
      paintGrid();
      paintDirty();
      status.textContent = touched === 0 ? "Nothing to fill — no file lacks a default's column." : `${touched} file${touched === 1 ? "" : "s"} filled in the grid — Save changes writes them.`;
    });

    // ---- the spreadsheet round trip (features-plan-2026-10-29, feature 2) ----
    /** The grid's columns as the sheet knows them, with each listed
     *  column's valid values: term paths, choices, the pool for the
     *  owner / approver columns (reviewers may be anyone). The MoC
     *  records column stays out — JSON in a cell invites corruption. */
    const sheetColumns = async (): Promise<SheetColumn[]> => {
      const { PATH_SEP, personText } = await import("./sheetRoundTrip");
      const out: SheetColumn[] = [];
      let pool: { email: string; name: string }[] | null = null;
      for (const f of gridFields) {
        const kind = editorKind(f);
        if (kind === null) continue;
        const role = ctx.dictBy.get(f.internal)?.role ?? "";
        if (role === "managementOfChange") continue;
        const col: SheetColumn = {
          internal: f.internal,
          label: labelOf(f),
          kind,
          multi: f.type === "TaxonomyFieldTypeMulti" || f.type === "UserMulti",
          options: [],
          poolBound: kind === "person" && POOL_ROLES.has(role) && role !== "reviewers",
          required: requiredSet.has(f.internal),
        };
        if (kind === "taxonomy") {
          const setId = ctx.dictBy.get(f.internal)?.termSetId || f.termSetId;
          if (setId !== "") {
            const walk = await cachedTermPaths(ctx.site, setId).catch(() => ({ nodes: [] as { id: string; labels: string[] }[] }));
            // a site-constrained task lists the site's branch only
            const { subtreeUnder } = await import("./ingestionModel");
            const scoped = termRoots[f.internal] !== undefined ? subtreeUnder(walk.nodes, termRoots[f.internal]) : walk.nodes;
            col.options = scoped.map((n) => ({ text: n.labels.join(PATH_SEP), label: n.labels[n.labels.length - 1], termId: n.id }));
          }
        } else if (kind === "choice") {
          col.options = f.choices.map((c) => ({ text: c }));
        } else if (col.poolBound) {
          if (pool === null) {
            const { poolState } = await import("./accessGates");
            const st = await poolState().catch(() => ({ configured: false, members: null }));
            pool = (st.members ?? []).map((m) => ({ email: m.email.toLowerCase(), name: m.name })).filter((m) => m.email !== "");
          }
          col.options = pool.map((m) => ({ text: personText(m.name, m.email), email: m.email, name: m.name }));
        }
        out.push(col);
      }
      return out;
    };
    /** Every file as the sheet shows it (saved values only). */
    const sheetFiles = async (cols: SheetColumn[]): Promise<SheetFile[]> => {
      const { exportCell, NAME_INTERNAL } = await import("./sheetRoundTrip");
      return [...rows]
        .sort((a, b) => compareByFolderThenName(a, b, task.folder))
        .map((r) => ({
          uniqueId: r.uniqueId,
          name: r.name,
          folder: subFolderOf(r.serverUrl, task.folder),
          cells: Object.fromEntries([[NAME_INTERNAL, stemOf(r.name)], ...cols.map((c) => [c.internal, exportCell(c, r.values)])]),
        }));
    };
    exportBtn.addEventListener("click", () => {
      void (async () => {
        // saved values only (Ben, 2026-10-29): a sheet built over a draft
        // would carry values SharePoint does not hold yet
        if (dirtyRows(draft).length > 0) {
          status.textContent = "Save or discard your changes first — the sheet carries saved values only.";
          return;
        }
        if (rows.length === 0) {
          status.textContent = "No files in the folder yet — nothing to export.";
          return;
        }
        exportBtn.disabled = true;
        status.textContent = "Building the sheet…";
        try {
          const [{ buildSheets }, { writeXlsx }] = await Promise.all([import("./sheetRoundTrip"), import("./xlsx")]);
          const cols = await sheetColumns();
          const files = await sheetFiles(cols);
          const when = new Date();
          const bytes = writeXlsx(buildSheets(cols, files, { task: task.name, library: libName(dest ?? undefined), exportedAt: when.toISOString().replace("T", " ").slice(0, 16) + " UTC" }));
          const a = el("a", "") as HTMLAnchorElement;
          a.href = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
          a.download = `ingestion-${taskFolderName(task.name)}-${when.toISOString().slice(0, 10)}.xlsx`;
          a.click();
          URL.revokeObjectURL(a.href);
          status.textContent = `${rows.length} file${rows.length === 1 ? "" : "s"} exported — edit the Files sheet in Excel, then Upload sheet… brings it back into the grid.`;
        } catch (err) {
          status.textContent = `Could not build the sheet: ${err instanceof Error ? err.message : String(err)}`;
        } finally {
          exportBtn.disabled = false;
        }
      })();
    });
    uploadBtn.addEventListener("click", () => {
      void (async () => {
        const [{ parseSheet, parseSummary, FILES_SHEET }, { readXlsx, browserInflate }, { buildFilePicker }] = await Promise.all([import("./sheetRoundTrip"), import("./xlsx"), import("./filePicker")]);
        const dlg = openDialog({
          host: sheet,
          title: "Upload an edited sheet",
          maxWidth: 680,
          buttons: [
            { label: "Cancel", kind: "secondary", onClick: () => dlg.close() },
            { label: "Apply to grid", kind: "primary", onClick: () => apply() },
          ],
        });
        const applyBtn = dlg.root.querySelector(".ltk-btn-primary") as HTMLButtonElement;
        applyBtn.disabled = true;
        const hint = el("div", "app-field-hint", "The workbook exported from this task, edited in Excel. A cell equal to what was exported is left alone; an emptied cell clears the value; a value that cannot be read is listed here and left unchanged. Nothing is written until Save changes.");
        const report = el("div", "app-ing-sheetreport");
        let parsed: ParsedSheet | null = null;
        const paintReport = (p: ParsedSheet) => {
          clear(report);
          report.appendChild(el("div", p.error !== "" ? "app-docs-health app-docs-health-warn" : "app-field-label", parseSummary(p)));
          if (p.unknownFiles.length > 0) report.appendChild(el("div", "app-field-hint", `Not in the folder any more (skipped): ${p.unknownFiles.join(", ")}`));
          if (p.problems.length > 0) {
            const list = el("div", "app-ing-sheetprobs");
            for (const pr of p.problems) {
              const line = el("div", "app-ing-sheetprob");
              line.appendChild(el("b", "", `Row ${pr.row} · ${pr.file} · ${pr.column}`));
              line.appendChild(el("span", "", ` “${pr.value}” — ${pr.reason}`));
              list.appendChild(line);
            }
            report.appendChild(list);
          }
          applyBtn.disabled = p.changes.length === 0;
        };
        const picker = buildFilePicker({
          accept: ".xlsx",
          invite: "Drop the workbook here, or",
          onPick: (file) => {
            clear(report);
            parsed = null;
            applyBtn.disabled = true;
            if (file === null) return;
            void (async () => {
              picker.note("Reading the workbook…");
              try {
                const sheets = await readXlsx(new Uint8Array(await file.arrayBuffer()), browserInflate);
                const filesSheet = sheets.find((x) => x.name === FILES_SHEET) ?? sheets[0];
                if (!filesSheet) throw new Error("the workbook has no sheets");
                const cols = await sheetColumns();
                const files = await sheetFiles(cols);
                const resolver = async (q: string) => (await searchEntra(q)).map((h) => ({ email: (h.mail ?? "").toLowerCase(), name: h.displayName })).filter((x) => x.email !== "");
                parsed = await parseSheet(filesSheet.rows, cols, files, resolver);
                picker.note("");
                paintReport(parsed);
              } catch (err) {
                picker.note(`Could not read the workbook: ${err instanceof Error ? err.message : String(err)}`, true);
              }
            })();
          },
        });
        dlg.body.append(hint, picker.root, report);
        const apply = () => {
          if (!parsed || parsed.changes.length === 0) return;
          const touched = new Set<string>();
          for (const c of parsed.changes) {
            const row = rows.find((r) => r.uniqueId === c.uniqueId);
            if (!row) continue;
            setCell(draft, row.uniqueId, row.values, c.value);
            touched.add(row.uniqueId);
          }
          const probs = parsed.problems.length;
          dlg.close();
          paintGrid();
          paintDirty();
          status.textContent = `${touched.size} file${touched.size === 1 ? "" : "s"} changed in the grid from the sheet — Save changes writes them.${probs > 0 ? ` ${probs} problem cell${probs === 1 ? "" : "s"} left unchanged.` : ""}`;
        };
      })();
    });

    // ---- the run ----------------------------------------------------------------
    const startRun = async (): Promise<void> => {
      if (running || dirtyRows(draft).length > 0) return;
      const approved = statusInternal !== "" ? termForStage(ctx.cellCtx.dict, "approved", statusTerms) : null;
      if (statusInternal !== "" && approved === null) {
        status.textContent = "No status term is mapped to the Approved stage (Settings → Documents → Lifecycle) — the run cannot publish.";
        return;
      }
      await reload();
      const ready = rows.filter(isReady);
      /** The status a file lands with: its grid value, else Approved;
       *  approved / superseded / obsolete publish as a major version,
       *  any other stage (draft, in review) lands as a minor, unpublished. */
      const landing = (row: DocRow): { term: { id: string; label: string } | null; publish: boolean; stage: string } => {
        if (statusInternal === "" || approved === null) return { term: null, publish: true, stage: "approved" };
        const chosen = (row.values[statusInternal] ?? "").split(";")[0].trim().toLowerCase();
        const term = chosen === "" ? approved : (statusTerms.find((t) => t.label.trim().toLowerCase() === chosen) ?? approved);
        const stage = stageOfTerm(ctx.cellCtx.dict, term.id) || (term.id === approved.id ? "approved" : "");
        const publish = stage === "approved" || stage === "superseded" || stage === "obsolete";
        return { term, publish, stage: stage || term.label };
      };
      const byStage = new Map<string, number>();
      for (const r of ready) {
        const l = landing(r);
        byStage.set(l.stage, (byStage.get(l.stage) ?? 0) + 1);
      }
      const stageNote = [...byStage.entries()].map(([s, n]) => `${n} as ${s}`).join(", ");
      const notReady = rows.length - ready.length;
      const ok = await promptConfirm({
        title: "Run the ingestion?",
        note: `${ready.length} file${ready.length === 1 ? "" : "s"} will be copied into ${libName(dest)} (${stageNote}; approved, superseded and obsolete publish as version 1, a draft lands as a minor version) and removed from the folder.${notReady > 0 ? ` ${notReady} with missing details stay${notReady === 1 ? "s" : ""} here.` : ""} Keep this window open until it finishes.`,
        confirmLabel: "Run",
      });
      if (!ok || dead) return;
      running = true;
      closeBtn.disabled = true;
      await adoptFresh();
      task.status = "running";
      await saveIngestionTask(task).catch(() => undefined);
      const by = currentViewer()?.name ?? "";
      const [moderation, regional, destRootRes] = await Promise.all([fetchListModeration(ctx.site, dest.listId), fetchRegionalSettings(ctx.site), fetchListRoot(ctx.site, dest.listId)]);
      const moderated = ((moderation.data ?? {}) as { EnableModeration?: unknown }).EnableModeration === true;
      const localeId = Number(((regional.data ?? {}) as { LocaleId?: unknown }).LocaleId ?? 0) || 1033;
      const destRoot = String(((destRootRes.data ?? {}) as { ServerRelativeUrl?: unknown }).ServerRelativeUrl ?? "");
      const reviewInternal = ctx.internalForRole("nextReviewDate");
      const cadenceInternal = ctx.internalForRole("reviewCadence");
      const impSet = importanceInternal !== "" ? (ctx.dictBy.get(importanceInternal)?.termSetId ?? "") : "";
      const log = (file: string, outcome: RunLogEntry["outcome"], detail: string) => {
        task.log.push({ file, outcome, detail, at: new Date().toISOString(), by });
      };
      // files in flight eight at a time (Ben, 2026-10-09: speed); the
      // task row is saved through one chain so the writes never race
      let saveChain: Promise<unknown> = Promise.resolve();
      progress.start(ready.length, "Ingesting");
      status.textContent = "";
      const ingestOne = async (row: DocRow): Promise<void> => {
        if (dead) return;
        progress.working(row.name);
        const refuse = (why: string) => log(row.name, "refused", why);
        // document-ID collision: the app's own check (decision 4)
        const docId = docIdInternal !== "" ? (row.values[docIdInternal] ?? "").trim() : "";
        if (docId !== "" && carried.has(docIdInternal)) {
          const dup = await renderListPage(ctx.site, dest.listId, buildRenderViewXml({ textEquals: [{ col: docIdInternal, value: docId }], fields: [docIdInternal], rowLimit: 2 }));
          if (dup.rows.length > 0) {
            refuse(`Document ID "${docId}" is already used by "${dup.rows[0].name}"`);
            return;
          }
        }
        // a site-constrained task refuses a file tagged outside the site
        // (set from SharePoint's own grid view, say) — the reason names
        // the column and the value
        for (const [internal, rootId] of Object.entries(termRoots)) {
          const setId = ctx.dictBy.get(internal)?.termSetId ?? "";
          if (setId === "" || (row.values[internal] ?? "").trim() === "") continue;
          const walk = await cachedTermPaths(ctx.site, setId, 6, 6000).catch(() => ({ nodes: [] as { id: string; labels: string[] }[] }));
          const outside = labelsOutsideRoot(row.values[internal] ?? "", walk.nodes, rootId);
          if (outside.length > 0) {
            refuse(`${ctx.dictBy.get(internal)?.label || internal} "${outside.join("; ")}" is outside this task's site (${task.site})`);
            return;
          }
        }
        if (destRoot === "") {
          refuse("The destination library's folder could not be read");
          return;
        }
        const destUrl = `${destRoot}/${row.name}`;
        const copied = await copyFileByPath(ctx.site, `${ctx.origin}${row.serverUrl}`, `${ctx.origin}${destUrl}`);
        if (!copied.ok) {
          const text = spErrorText(copied.status);
          refuse(/already exists/i.test(text) ? `A file named "${row.name}" already exists in ${libName(dest)}` : `Copy refused: ${text}`);
          return;
        }
        // the bracket on the copy: check-out → status + dates → major → publish
        const idRes = await fetchFileItemId(ctx.site, destUrl);
        const itemId = Number(((idRes.data ?? {}) as { Id?: unknown }).Id ?? 0);
        if (itemId === 0) {
          refuse("Copied, but the copy's item could not be read — check the destination by hand");
          return;
        }
        // a flag raised on the file in this task follows it (issue 23)
        if ((fileFlags.get(flagKey(src.listId, row.id)) ?? []).length > 0) {
          const guid = String(((idRes.data ?? {}) as { GUID?: unknown }).GUID ?? "");
          await import("./docFlags")
            .then((m) => m.repointFlags(ctx.site, { listId: src.listId, itemId: row.id }, { listId: dest.listId, itemId, uid: guid, name: row.name }))
            .catch(() => 0);
        }
        const out = await checkOutFile(ctx.site, destUrl);
        if (!out.ok && !/already checked out/i.test(spErrorText(out.status))) {
          refuse(`Copied, but check-out was refused: ${spErrorText(out.status)}`);
          return;
        }
        let bracketErr = "";
        const land = landing(row);
        if (land.term !== null) {
          const r = await connectorPatchItem(ctx.site, dest.listId, itemId, { [statusInternal]: { Value: land.term.label, TermGuid: land.term.id, WssId: -1 } });
          if (!r.ok) bracketErr = `status: ${spErrorText(r.status)}`;
        }
        if (bracketErr === "" && (effInternal !== "" || reviewInternal !== "")) {
          // effective = the typed date, else today; review = effective + cadence
          const typed = (row.values[`${effInternal}.`] ?? row.values[effInternal] ?? "").slice(0, 10);
          const effYmd = /^\d{4}-\d{2}-\d{2}$/.test(typed) ? typed : todayYmd();
          let months: number | null = null;
          const impLabel = (row.values[importanceInternal] ?? "").split(";")[0].trim();
          if (impLabel !== "" && impSet !== "") {
            try {
              const walk = await cachedTermPaths(ctx.site, impSet);
              const node = walk.nodes.find((x) => x.labels[x.labels.length - 1].toLowerCase() === impLabel.toLowerCase());
              if (node !== undefined) months = cadenceForImportance(ctx.cellCtx.dict, node.id);
            } catch {
              /* unmapped = default */
            }
          }
          const m = months ?? DEFAULT_CADENCE_MONTHS;
          const stamps: { FieldName: string; FieldValue: string }[] = [];
          if (effInternal !== "" && carried.has(effInternal)) stamps.push({ FieldName: effInternal, FieldValue: formatDateForLocale(effYmd, localeId) });
          if (reviewInternal !== "" && carried.has(reviewInternal)) stamps.push({ FieldName: reviewInternal, FieldValue: formatDateForLocale(addMonthsYmd(effYmd, m), localeId) });
          if (cadenceInternal !== "" && carried.has(cadenceInternal)) stamps.push({ FieldName: cadenceInternal, FieldValue: String(m) });
          if (stamps.length > 0) {
            const r = await validateUpdateListItem(ctx.site, dest.listId, itemId, stamps, false);
            const errs = validateItemErrors(r.data);
            if (!r.ok || errs.length > 0) bracketErr = `dates: ${errs.map((x) => `${x.field}: ${x.message}`).join("; ") || spErrorText(r.status)}`;
          }
        }
        if (bracketErr !== "") {
          // the copy stays checked out as a draft in the destination; say so
          refuse(`Copied, but ${bracketErr} — the draft is checked out in ${libName(dest)}; finish or discard it there`);
          return;
        }
        const ci = await checkInFile(ctx.site, destUrl, ingestComment(task.name, by), land.publish);
        if (!ci.ok) {
          refuse(`Copied, but the ${land.publish ? "major" : "minor"} check-in was refused: ${spErrorText(ci.status)}`);
          return;
        }
        if (moderated && land.publish) {
          const pub = await validateUpdateListItem(ctx.site, dest.listId, itemId, [{ FieldName: "_ModerationStatus", FieldValue: "0" }], false);
          if (!pub.ok || validateItemErrors(pub.data).length > 0) {
            refuse(`Moved, but the publish was refused — it is PENDING in ${libName(dest)}: approve it in SharePoint`);
            await recycleFile(ctx.site, row.serverUrl);
            return;
          }
        }
        const gone = await recycleFile(ctx.site, row.serverUrl);
        log(row.name, "moved", gone.ok ? destUrl : `${destUrl} (the source copy could not be recycled: ${spErrorText(gone.status)})`);
        saveChain = saveChain.then(() => saveIngestionTask(task)).catch(() => undefined);
      };
      await pool(ready, IN_FLIGHT, async (row) => {
        await ingestOne(row);
        progress.tick();
      });
      await saveChain;
      progress.finish();
      // the task stays open: a batch may follow (Ben, 2026-10-09 — an
      // explicit close-out replaces decision 6's self-close)
      task.status = "open";
      await saveIngestionTask(task).catch(() => undefined);
      running = false;
      closeBtn.disabled = false;
      lastLog = latestByFile(task.log);
      o.onChanged();
      await reload();
      const thisRun = task.log.slice(-ready.length);
      status.textContent = `Run finished — ${logSummary(thisRun)}.${rows.length === 0 ? " Every file has moved — End task when the batch is complete." : " Refused files stay here with the reason on the glyph."}`;
    };
    /** The explicit close-out: the folder (with anything left in it) goes
     *  to the recycle bin, the task reads closed and keeps its log. */
    const closeOut = async (): Promise<void> => {
      if (running || dirtyRows(draft).length > 0) return;
      // files, not items: a sub-folder counted as ONE item before
      // 2026-11-01, so forty nested files read as "1 file"
      await reload();
      if (dead) return;
      const n = rows.length;
      const subs = new Set(rows.map((r) => r.values.__folder ?? "").filter((f) => f !== "")).size;
      const ok = await promptConfirm({
        title: `End the task "${task.name}"?`,
        note: n > 0 ? `${n} file${n === 1 ? " has" : "s have"}${subs > 0 ? ` (in ${subs} sub-folder${subs === 1 ? "" : "s"})` : ""} NOT been ingested; the folder and everything in it go to the site's recycle bin. The task keeps its log and leaves Ingestion tasks.` : "The empty folder is removed; the task keeps its log and leaves Ingestion tasks.",
        confirmLabel: "End task",
        danger: n > 0,
      });
      if (!ok || dead) return;
      const r = await recycleFolder(ctx.site, task.folder);
      if (!r.ok && !/not exist|not found|404/i.test(r.status)) {
        status.textContent = `The folder could not be recycled: ${spErrorText(r.status)}`;
        return;
      }
      await adoptFresh();
      task.status = "closed";
      task.closedAt = new Date().toISOString();
      await saveIngestionTask(task);
      o.onChanged();
      closeNow();
      openIngestionTask(o);
    };

    // ---- the log, on a closed task ---------------------------------------
    if (task.status === "closed" && task.log.length > 0) {
      const logBox = el("div", "app-ing-log");
      logBox.appendChild(el("div", "app-field-label", `Run log · ${logSummary(task.log)}`));
      for (const e of task.log) {
        logBox.appendChild(el("div", "app-ing-logrow", `${e.outcome === "moved" ? "✓" : "⚠"} ${e.file} — ${e.detail} (${e.by}, ${formatWhen(e.at)})`));
      }
      body.appendChild(logBox);
    }
  })().catch((e) => {
    clear(body);
    body.appendChild(el("div", "app-cp-err", `Could not open the task: ${e instanceof Error ? e.message : String(e)}`));
  });
  return close;
}

// ---- the task editor (create / edit) -----------------------------------------

export interface IngestionEditorOpts {
  /** Absent = a new task. */
  task?: IngestionTask;
  onSaved: (task: IngestionTask, notice?: string) => void;
  /** The task was cancelled (removed) — the sheet behind closes. */
  onCancelled?: () => void;
}

export function openIngestionTaskEditor(o: IngestionEditorOpts): void {
  const isNew = o.task === undefined;
  const viewer = currentViewer();
  const t: IngestionTask = o.task
    ? { ...o.task, assignees: o.task.assignees.map((a) => ({ ...a })), defaults: o.task.defaults.map((d) => ({ ...d })), log: [...o.task.log] }
    : {
        rowId: "",
        name: "",
        siteUrl: "",
        sourceListId: "",
        folder: "",
        destListId: "",
        status: "open",
        assignees: [],
        defaults: [],
        log: [],
        createdByEmail: (viewer?.email ?? "").toLowerCase(),
        createdByName: viewer?.name ?? "",
        createdAt: new Date().toISOString(),
        closedAt: "",
        site: "",
      };
  const before = new Set(t.assignees.map((a) => a.email));
  const dlg = openDialog({
    host: document.body,
    title: isNew ? "New ingestion task" : "Edit ingestion task",
    maxWidth: 640,
    buttons: [
      // a controller may cancel a task (Ben, 2026-10-09): the row goes;
      // files already in the folder stay in the ingestion library
      ...(isNew ? [] : [{ label: "Cancel task…", kind: "danger" as const, onClick: () => void cancelTask() }]),
      { label: "Cancel", kind: "secondary" as const, onClick: () => dlg.close() },
      { label: isNew ? "Create task" : "Save task", kind: "primary" as const, onClick: () => void save() },
    ],
  });
  const cancelTask = async () => {
    const left = await folderItemCount(t);
    const ok = await promptConfirm({
      title: `Cancel the task "${t.name}"?`,
      note:
        left > 0
          ? `The task and its folder are removed, with the ${left} file${left === 1 ? "" : "s"} in it — they go to the site's recycle bin, where a document controller can restore them. Nothing is ingested.`
          : "The task and its empty folder are removed. Nothing is ingested.",
      confirmLabel: "Cancel task",
      danger: true,
    });
    if (!ok) return;
    try {
      await removeIngestionTask(t, left);
      dlg.close();
      // cancelled BEFORE saved: the sheet behind closes and must not
      // reopen a task that no longer exists
      o.onCancelled?.();
      o.onSaved(t);
    } catch (e) {
      err.textContent = e instanceof Error ? e.message : String(e);
    }
  };
  const body = dlg.body;
  body.classList.add("app-ing-editor"); // fields take the dialog's width
  body.appendChild(el("div", "app-settings-note", "Loading…"));
  const err = el("div", "app-cp-err", "");
  let editors: ReturnType<typeof buildFieldEditors> = [];
  let ctx: SiteCtx | null = null;
  let destSel: HTMLSelectElement | null = null;
  let siteSel: HTMLSelectElement | null = null;
  let nameIn: HTMLInputElement | null = null;

  void (async () => {
    ctx = await loadSiteCtx();
    clear(body);
    if (ctx.ingestionLib === null) {
      body.appendChild(el("div", "app-cp-err", "No ingestion library is exposed for this site. Settings → Documents → Libraries: expose the bulk-drop library with the type \"Ingestion\"."));
      return;
    }
    const field = (label: string, control: HTMLElement, hint?: string) => {
      const f = el("div", "app-field");
      f.append(el("span", "app-field-label", label), control);
      if (hint) f.appendChild(el("span", "app-field-hint", hint));
      body.appendChild(f);
    };
    nameIn = el("input", "app-input") as HTMLInputElement;
    nameIn.value = t.name;
    nameIn.placeholder = "e.g. Legacy SOPs — Packaging";
    nameIn.disabled = !isNew; // the folder carries the name
    field("Task name", nameIn, isNew ? "Becomes the folder's name in the ingestion library." : "The folder carries the name; it cannot change.");
    destSel = el("select", "app-input") as HTMLSelectElement;
    for (const l of ctx.libraries.filter((l) => l.libType === "standard" || l.libType === "record" || l.libType === "working")) {
      const opt = el("option", "", `${libName(l)} (${l.libType})`) as HTMLOptionElement;
      opt.value = l.listId;
      if (l.listId.toLowerCase() === t.destListId) opt.selected = true;
      destSel.appendChild(opt);
    }
    destSel.disabled = !isNew;
    field("Destination library", destSel, isNew ? "Where the files land as approved version 1." : undefined);

    // the site (Ben, 2026-10-29): optional, the creator's own site by
    // default on a new task; narrows the organisation and process
    // editors to that site's branches and the run refuses files outside
    const [{ orgJson, archivedSites }, { parseOrgTree }, { viewerPerson }] = await Promise.all([import("../store/config"), import("../../../shared/schema/meeting"), import("../store/people")]);
    const [orgRaw, archived] = await Promise.all([orgJson(true), archivedSites()]);
    const orgSites = parseOrgTree(orgRaw).map((x) => x.site).filter((x) => x !== "" && !archived.includes(x));
    if (isNew && t.site === "" && viewer) {
      const me = await viewerPerson(viewer.objectId).catch(() => null);
      if (me && orgSites.includes(me.site)) t.site = me.site;
    }
    siteSel = el("select", "app-input") as HTMLSelectElement;
    const anyOpt = el("option", "", "Any site") as HTMLOptionElement;
    anyOpt.value = "";
    siteSel.appendChild(anyOpt);
    for (const x of orgSites) {
      const opt = el("option", "", x) as HTMLOptionElement;
      opt.value = x;
      if (x === t.site) opt.selected = true;
      siteSel.appendChild(opt);
    }
    if (t.site !== "" && !orgSites.includes(t.site)) {
      const opt = el("option", "", `${t.site} (not on the Organisation page)`) as HTMLOptionElement;
      opt.value = t.site;
      opt.selected = true;
      siteSel.appendChild(opt);
    }
    field("Site", siteSel, "Optional. With a site, the Organisation unit and Process area pickers offer that site's branches only, and the run refuses a file tagged outside them.");

    // assignees: chips + a directory search
    const peopleBox = el("div", "app-im-links");
    const paintPeople = () => {
      clear(peopleBox);
      for (const a of t.assignees) {
        const chip = el("span", "app-im-link");
        chip.appendChild(el("span", undefined, a.name || a.email));
        const x = btn("×", "app-im-link-x");
        x.title = "Remove";
        x.addEventListener("click", () => {
          t.assignees = t.assignees.filter((p) => p.email !== a.email);
          paintPeople();
        });
        chip.appendChild(x);
        peopleBox.appendChild(chip);
      }
    };
    paintPeople();
    const search = el("input", "app-input") as HTMLInputElement;
    search.placeholder = "Add a person — the app's people first, then the directory…";
    const hits = el("div", "app-ing-hits");
    let timer: ReturnType<typeof setTimeout> | null = null;
    // the picker says what it is doing (issue 26: a failed or slow search
    // showed nothing, and an older search could land over a newer one)
    let gen = 0;
    const rosterP = listPeople().catch(() => []);
    const offer = (people: { email: string; name: string; tag: string }[]) => {
      let shown = 0;
      for (const h of people) {
        if (h.email === "" || t.assignees.some((a) => a.email === h.email)) continue;
        const b = btn(`＋ ${h.name}`, "app-link");
        if (h.tag !== "") b.appendChild(el("span", "app-field-hint", ` · ${h.tag}`));
        b.addEventListener("click", () => {
          t.assignees.push({ email: h.email, name: h.name });
          paintPeople();
          clear(hits);
          search.value = "";
        });
        hits.appendChild(b);
        if (++shown >= 10) break;
      }
      return shown;
    };
    search.addEventListener("input", () => {
      if (timer) clearTimeout(timer);
      const q = search.value.trim().toLowerCase();
      const mine = ++gen;
      clear(hits);
      if (q.length < 2) return;
      hits.appendChild(el("div", "app-field-hint", "Searching…"));
      timer = setTimeout(() => {
        void (async () => {
          const roster = (await rosterP).filter((p) => p.active && (p.who.toLowerCase().includes(q) || p.email.toLowerCase().includes(q))).map((p) => ({ email: p.email.toLowerCase(), name: p.who, tag: p.site }));
          let directory: { email: string; name: string; tag: string }[] = [];
          let failed = "";
          try {
            const known = new Set(roster.map((r) => r.email));
            directory = (await searchEntra(search.value)).map((h) => ({ email: (h.mail ?? "").toLowerCase(), name: h.displayName, tag: "directory" })).filter((h) => !known.has(h.email));
          } catch (e) {
            failed = e instanceof Error ? e.message : String(e);
          }
          if (mine !== gen) return; // a newer search is on its way
          clear(hits);
          const shown = offer([...roster, ...directory]);
          if (shown === 0) hits.appendChild(el("div", "app-field-hint", failed !== "" ? `The directory search failed: ${failed.slice(0, 120)}` : "No match — try another spelling, or the person's email."));
          else if (failed !== "") hits.appendChild(el("div", "app-field-hint", `The directory search failed: ${failed.slice(0, 120)}`));
        })();
      }, 250);
    });
    const assigneesWrap = el("div", "app-ing-people");
    assigneesWrap.append(peopleBox, search, hits);
    field("Assignees", assigneesWrap, "They see the task in Document tasks and get a Teams message. The folder is open to everyone; assignment is who is asked.");

    // task defaults: the destination's columns as editors
    const defaultsBox = el("div", "app-ing-defaults");
    const paintDefaults = async () => {
      const destId = destSel?.value ?? "";
      const dest = ctx!.libraries.find((l) => l.listId === destId);
      clear(defaultsBox);
      if (!dest) return;
      const fr = await fetchFields(ctx!.site, ctx!.ingestionLib!.listId);
      const fields = fr.ok ? fieldsFromResponse(fr.data) : [];
      const initial = new Map<string, { text?: string; people?: { email: string; name: string }[]; term?: { label: string; termId: string }; terms?: { label: string; termId: string }[] }>();
      for (const d of t.defaults) {
        if (d.kind === "taxonomy") initial.set(d.internal, d.multi === true && d.terms ? { terms: d.terms } : d.label && d.termId ? { term: { label: d.label, termId: d.termId } } : {});
        else if (d.kind === "person") initial.set(d.internal, { people: d.people ?? [] });
        else initial.set(d.internal, { text: d.text ?? "" });
      }
      // the status rides the defaults too (issue 25): a legacy batch
      // can default to Superseded and the grid shows it per file
      const termRoots = await taskTermRoots(ctx!, siteSel?.value ?? t.site);
      editors = buildFieldEditors({
        site: ctx!.site,
        box: defaultsBox,
        fields,
        columns: dest.config.columns,
        dictBy: ctx!.dictBy,
        onChange: () => undefined,
        initial,
        termRoots,
        // the destination type's sections and order — the same form the
        // edit-properties dialog shows for that library
        sections: dialogSections(ctx!.cellCtx.dict, dest.libType),
        includeSystemDates: true,
        includeStatus: true,
      });
    };
    destSel.addEventListener("change", () => void paintDefaults());
    siteSel.addEventListener("change", () => {
      // the defaults already picked stay in the editors; a value outside
      // the new site simply will not be offered again
      t.defaults = editors.filter((e) => !e.isEmpty()).map((e) => e.read());
      void paintDefaults();
    });
    await paintDefaults();
    field("Task defaults", defaultsBox, "Values every file in this task shares — \"Fill blanks from defaults\" writes them into the files that lack them. Leave a column empty to set it per file.");
    body.appendChild(err);
  })().catch((e) => {
    clear(body);
    body.appendChild(el("div", "app-cp-err", e instanceof Error ? e.message : String(e)));
  });

  const save = async () => {
    if (ctx === null || ctx.ingestionLib === null || destSel === null || nameIn === null) return;
    const name = nameIn.value.trim();
    if (name === "") {
      err.textContent = "A task name is needed.";
      return;
    }
    if (destSel.value === "") {
      err.textContent = "Pick a destination library.";
      return;
    }
    err.textContent = "";
    try {
      t.defaults = editors.filter((e) => !e.isEmpty()).map((e) => e.read());
      t.site = siteSel?.value ?? t.site;
      if (isNew) {
        // one task per name and per folder: a second task on the same
        // folder would leave two rows over one batch (issue 26)
        const open = (await listIngestionTasks().catch(() => [])).filter((x) => x.status !== "closed");
        const clash = open.find((x) => x.name.trim().toLowerCase() === name.trim().toLowerCase() || taskFolderName(x.name) === taskFolderName(name));
        if (clash) throw new Error(`An open task "${clash.name}" already uses that name — open it from Ingestion tasks, or choose another name.`);
        const rootRes = await fetchListRoot(ctx.site, ctx.ingestionLib.listId);
        const root = String(((rootRes.data ?? {}) as { ServerRelativeUrl?: unknown }).ServerRelativeUrl ?? "");
        if (root === "") throw new Error(`The ingestion library's folder could not be read: ${spErrorText(rootRes.status)}`);
        const folderName = taskFolderName(name);
        if (folderName === "") throw new Error("The task name leaves nothing usable as a folder name.");
        const made = await createFolder(ctx.site, `${root}/${folderName}`);
        if (!made.ok) throw new Error(`The folder could not be created: ${spErrorText(made.status)}`);
        t.name = name;
        t.siteUrl = ctx.site;
        t.sourceListId = ctx.ingestionLib.listId.toLowerCase();
        t.folder = `${root}/${folderName}`;
        t.destListId = destSel.value.toLowerCase();
      }
      await saveIngestionTask(t);
      // a Teams message to each NEW assignee (decision 7); the outcome
      // travels to the sheet's status line, never swallowed
      const fresh = t.assignees.filter((a) => !before.has(a.email));
      let notice = "";
      if (fresh.length > 0) {
        const dest = ctx.libraries.find((l) => l.listId.toLowerCase() === t.destListId);
        notice = await messageAssignees(t, fresh, libName(dest));
      }
      dlg.close();
      o.onSaved(t, notice);
    } catch (e) {
      err.textContent = e instanceof Error ? e.message : String(e);
    }
  };
}

/** How many FILES the task's folder holds, sub-folders included (the
 *  folder's own item count counts a sub-folder as one); 0 when unreadable. */
async function folderItemCount(task: IngestionTask): Promise<number> {
  if (task.folder === "") return 0;
  const ctx = await loadSiteCtx();
  let n = 0;
  let next = "";
  for (;;) {
    const page = await renderListPage(ctx.site, task.sourceListId, buildRenderViewXml({ rowLimit: 500, scope: "recursive" }), next, task.folder);
    if (page.error !== "") {
      const counts = await fetchFolderCounts(ctx.site, task.folder);
      const left = Number(((counts.data ?? {}) as { ItemCount?: unknown }).ItemCount ?? NaN);
      return counts.ok && Number.isFinite(left) ? Math.max(n, left) : n;
    }
    n += page.rows.length;
    if (page.next === "" || n >= FILES_CAP) return n;
    next = page.next;
  }
}

/** Cancel a task (controllers): the folder goes to the recycle bin WITH
 *  whatever it holds (Ben, 2026-10-09 — restorable there), then the row. */
export async function removeIngestionTask(task: IngestionTask, itemsLeft: number): Promise<void> {
  if (task.folder !== "") {
    const ctx = await loadSiteCtx();
    const r = await recycleFolder(ctx.site, task.folder);
    if (!r.ok && !/not exist|not found|404/i.test(r.status)) throw new Error(`The folder (${itemsLeft} item${itemsLeft === 1 ? "" : "s"}) could not be recycled: ${spErrorText(r.status)}`);
  }
  if (task.rowId !== "") await deleteIngestionTask(task.rowId);
}

export type { IngestionAssignee };
