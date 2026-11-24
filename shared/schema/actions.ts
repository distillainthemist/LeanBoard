// The canonical LeanToolKit action — one schema for every tool that captures
// or displays actions. Multi-assignee actions keep per-assignee done flags on
// ONE action (views render a row per assignee); overdue is always derived
// from `due`, never stored.

import { newId, todayIso } from "./id";

// "verify" (cascade/improvement P0, 2026-08-19): the assignee has finished
// but the initiative owner has not yet endorsed the completion — an
// initiative-level switch routes done → verify. Counts as NOT done for
// overdue purposes and as open work for the assignee's rollups.
export type ActionStatus = "open" | "in-progress" | "verify" | "done" | "cancelled";

/** The PDCA progression (Ben, 2026-08-31): a parallel axis to status —
 *  where the work IS in the improvement cycle. Closed mirrors status
 *  done/cancelled; new actions start at Do. */
/** "hold" (Ben, 2026-09-30): ON HOLD — paused, not abandoned. It sits
 *  beside the cycle rather than on it (a pause glyph, no quadrants): the
 *  action stays open, and while it is held it is not overdue. Listed
 *  after Closed (Ben, 2026-10-01). */
export type ActionPdca = "plan" | "do" | "check" | "act" | "hold" | "closed";

export const ACTION_PDCA: ActionPdca[] = ["plan", "do", "check", "act", "closed", "hold"];

export const PDCA_LABELS: Record<ActionPdca, string> = {
  plan: "Plan",
  do: "Do",
  check: "Check",
  act: "Act",
  hold: "On hold",
  closed: "Closed",
};

/** Quadrants filled for a state's four-quadrant disc (0–4, filling
 *  top-left → bottom-left → bottom-right → top-right). */
export const PDCA_QUARTERS: Record<ActionPdca, number> = {
  plan: 0,
  do: 1,
  check: 2,
  act: 3,
  hold: 0, // drawn as a pause glyph, not as quadrants
  closed: 4,
};

/** Paused: an open action whose PDCA state is On hold. */
export function isOnHold(a: { status: string; pdca?: string }): boolean {
  return a.pdca === "hold" && a.status !== "done" && a.status !== "cancelled";
}

/**
 * The parts and the whole agree (2026-10-06). Every assignee's part done
 * → the action is done (Closed); with `reopen`, a part undone on a done
 * or waiting action → open (Do). Returns true when the status changed.
 * The hub's "my part is done" tick only ever marked the part, so an
 * action with one assignee stayed open on every board while the hub
 * struck it through. Screens apply it where a part changes; the store
 * applies the closing half as the backstop (a reopen stays the person's
 * explicit act — the dialog's Do, the circle's second tick).
 */
export function settleFromParts(a: LtkAction, opts: { reopen: boolean }): boolean {
  if (a.assignees.length === 0 || a.status === "cancelled") return false;
  const allDone = a.assignees.every((x) => x.done);
  if (allDone && a.status !== "done" && a.status !== "verify") {
    a.status = "done";
    a.pdca = "closed";
    return true;
  }
  if (opts.reopen && !allDone && (a.status === "done" || a.status === "verify")) {
    a.status = "open";
    a.pdca = "do";
    a.verified = undefined;
    return true;
  }
  return false;
}

/** The state to DISPLAY: a done/cancelled action is closed regardless of
 *  what was stored; a stored "closed" on a live action falls back to Do
 *  (the two are kept in step by the dialog, this covers older writes). */
export function pdcaOf(a: { status: ActionStatus; pdca?: ActionPdca }): ActionPdca {
  // awaiting endorsement: the work is done — it reads Closed, with its
  // marker beside it (Ben, 2026-09-30)
  if (a.status === "done" || a.status === "cancelled" || a.status === "verify") return "closed";
  return a.pdca !== undefined && a.pdca !== "closed" ? a.pdca : "do";
}

export const ACTION_STATUSES: ActionStatus[] = [
  "open",
  "in-progress",
  "verify",
  "done",
  "cancelled",
];

/** One entry of an action's history: a due date moved out, a stop or a
 *  cancel — with the reason the brief requires (decision 6). */
export interface ActionHistoryEntry {
  kind: "rescheduled" | "cancelled" | "stopped" | "verified" | "reopened";
  whoId: string;
  who: string;
  when: string; // ISO timestamp
  from?: string; // rescheduled: previous due (yyyy-mm-dd)
  to?: string; // rescheduled: new due
  reason: string;
}

/** The initiative owner's endorsement of a completed action. */
export interface Verification {
  whoId: string;
  who: string;
  when: string; // ISO timestamp
}

export interface Assignee {
  whoId: string;
  who: string;
  done: boolean;
  /** When this person's part was done (ISO) — a shared action shows who
   *  finished and who has not (2026-11-17, issue 10). Absent while open
   *  and on parts done before then. */
  doneAt?: string;
  /** Who recorded this part as done, when it was SOMEONE ELSE (Ben,
   *  2026-11-24, programme C6): anyone who can edit the action may press
   *  another person's sign-off box in the dialog, and the press is on
   *  record. Absent when the person did it themselves, on parts done
   *  before then, and on a part closed from a board (no presser known). */
  doneBy?: { whoId: string; who: string };
}

/** Someone who SUPPORTS an action (issue 7, 2026-11-16): named on it,
 *  sees it among their own under "Supporting" and through its
 *  confidentiality — and owes no part of it. Every rule about parts,
 *  done flags, overdue and endorsement reads `assignees` alone. */
export interface Supporter {
  whoId: string;
  who: string;
}

export interface ActionComment {
  whoId: string;
  who?: string;
  when: string; // yyyy-mm-dd
  text: string;
  /** Stable id (2026-11-16) — what an edit, a delete and the store's
   *  merge address. Absent on comments written before then. */
  id?: string;
  /** The moment it was written (ISO). Absent on older comments, which
   *  carry the day alone. */
  at?: string;
  /** Set when its author changed the wording (ISO). */
  editedAt?: string;
}

/** Receiving-board sign-off on an escalated action (EscalationViewer). */
export interface Acknowledgement {
  whoId: string;
  who: string;
  when: string; // ISO timestamp
}

/** Where an action came from, for provenance and in-component placement. */
export interface ActionContext {
  source: string; // component kind, e.g. "fivewhys"
  sourceId: string; // id of the element it hangs off, e.g. a cause id
  hint?: string; // free placement/visualisation hint
}

export interface LtkAction {
  id: string;
  /** The owning card instance — the lookup key into a central actions table. */
  instanceId: string;
  issue: string;
  description: string;
  assignees: Assignee[];
  /** People supporting the action; absent = none. Never an assignee too. */
  supporters?: Supporter[];
  start: string; // yyyy-mm-dd, "" = no start date (optional; used by Gantt)
  due: string; // yyyy-mm-dd, "" = no due date
  status: ActionStatus;
  /** PDCA progression; absent on older rows (pdcaOf derives the display). */
  pdca?: ActionPdca;
  comments: ActionComment[];
  escalated: boolean;
  /** Set when the receiving board acknowledges the escalation. */
  acknowledged?: Acknowledgement;
  context: ActionContext;
  /** Reschedule / stop / cancel / verify history (P0). Absent = none. */
  history?: ActionHistoryEntry[];
  /** The owner's endorsement once status left "verify" for "done". */
  verified?: Verification;
  /** The moment the action reached done or verify (ISO) — "recently
   *  completed" reads it (2026-11-17, issue 2). Stamped by
   *  `stampCompletion` at the write; cleared on a reopen. */
  doneAt?: string;
  /** The improvement initiative this action belongs to ("" = none). */
  initiativeId?: string;
  /** Confidential (2026-09-16): seen only by its creator, its assignees,
   *  their direct managers (Office 365) and super admins. App-level
   *  confidentiality — the row itself stays readable through Dataverse. */
  confidential?: boolean;
  /** The creator's whoId (set on first save). */
  createdBy?: string;
  /** The stored visible set for a confidential action — computed at save
   *  time from creator + assignees + managers (+ escalation targets). */
  visibleTo?: string[];
}

/** Does an action belong to an initiative? By its stamped initiative id,
 *  or — for rows written before the id was stamped at the write — by
 *  living on the initiative's board (instance key "init-…:card"). */
export function actionBelongsTo(i: { id: string; boardId: string }, a: Pick<LtkAction, "initiativeId" | "instanceId">): boolean {
  if (a.initiativeId === i.id) return true;
  return i.boardId !== "" && a.instanceId.startsWith(`${i.boardId}:`);
}

/** A board's own channel — where an action raised for the board as a
 *  whole (quick add, a hub relink) lives: "<boardId>:board". The board's
 *  action surface lists every action on the board, so it shows there. */
export function boardChannelKey(boardId: string): string {
  return `${boardId}:board`;
}

/** Is a viewer allowed to see this action? Non-confidential: everyone.
 *  Confidential: super admins, and anyone in the stored visible set
 *  (creator and assignees are always in it even if the set is stale). */
export function actionVisibleTo(a: LtkAction, viewerWhoId: string, isSuperAdmin: boolean): boolean {
  if (a.confidential !== true) return true;
  if (isSuperAdmin) return true;
  if (viewerWhoId === "") return false;
  if (a.createdBy === viewerWhoId) return true;
  if (a.assignees.some((x) => x.whoId === viewerWhoId)) return true;
  if (isSupporter(a, viewerWhoId)) return true;
  return (a.visibleTo ?? []).includes(viewerWhoId);
}

/** The visible set for a confidential action: creator, assignees, each
 *  assignee's manager, plus any extra ids the host adds (escalation
 *  targets). De-duplicated, no blanks. */
export function visibleSetFor(a: LtkAction, managerOf: (whoId: string) => string, extra: string[] = []): string[] {
  const out = new Set<string>();
  const add = (id: string | undefined) => {
    if (id && id.trim() !== "") out.add(id);
  };
  add(a.createdBy);
  for (const x of a.assignees) {
    add(x.whoId);
    add(managerOf(x.whoId));
  }
  // supporters see it; their leaders do not — the "leaders" rule is for
  // the people accountable (Ben, 2026-11-16)
  for (const x of a.supporters ?? []) add(x.whoId);
  for (const e of extra) add(e);
  return [...out];
}

/** Is this person supporting the action? */
export function isSupporter(a: Pick<LtkAction, "supporters">, whoId: string): boolean {
  return whoId !== "" && (a.supporters ?? []).some((x) => x.whoId === whoId);
}

/** A tidy supporters list: real people, once each, and never someone
 *  who is also assigned (assigned wins — they owe the part). */
export function cleanSupporters(raw: unknown, assignees: Assignee[]): Supporter[] {
  if (!Array.isArray(raw)) return [];
  const out: Supporter[] = [];
  const key = (x: { whoId: string; who: string }) => (x.whoId !== "" ? `id:${x.whoId}` : `n:${x.who.toLowerCase()}`);
  const taken = new Set(assignees.map(key));
  for (const x of raw) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    const p = { whoId: typeof o.whoId === "string" ? o.whoId : "", who: typeof o.who === "string" ? o.who.trim() : "" };
    if (p.who === "" && p.whoId === "") continue;
    if (taken.has(key(p))) continue;
    taken.add(key(p));
    out.push(p);
  }
  return out;
}

/** "support: A, B" for a row, "" with none. */
export function supportLabel(a: Pick<LtkAction, "supporters">): string {
  const names = (a.supporters ?? []).map((x) => x.who).filter((n) => n !== "");
  return names.length > 0 ? `support: ${names.join("; ")}` : "";
}

export function newAction(context: ActionContext): LtkAction {
  return {
    id: newId("a"),
    instanceId: "",
    issue: "",
    description: "",
    assignees: [],
    start: "",
    due: "",
    status: "open",
    pdca: "do",
    comments: [],
    escalated: false,
    context,
  };
}

function isStatus(v: unknown): v is ActionStatus {
  return (
    v === "open" ||
    v === "in-progress" ||
    v === "verify" ||
    v === "done" ||
    v === "cancelled"
  );
}

const HISTORY_KINDS = new Set(["rescheduled", "cancelled", "stopped", "verified", "reopened"]);

function sanitizeHistory(raw: unknown): ActionHistoryEntry[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: ActionHistoryEntry[] = [];
  for (const h of raw) {
    if (!h || typeof h !== "object") continue;
    const o = h as Partial<ActionHistoryEntry>;
    if (typeof o.kind !== "string" || !HISTORY_KINDS.has(o.kind)) continue;
    if (typeof o.when !== "string" || o.when === "") continue;
    out.push({
      kind: o.kind as ActionHistoryEntry["kind"],
      whoId: typeof o.whoId === "string" ? o.whoId : "",
      who: typeof o.who === "string" ? o.who : "",
      when: o.when,
      from: typeof o.from === "string" ? o.from : undefined,
      to: typeof o.to === "string" ? o.to : undefined,
      reason: typeof o.reason === "string" ? o.reason : "",
    });
  }
  return out.length > 0 ? out : undefined;
}

export function sanitizeAction(a: Partial<LtkAction>): LtkAction {
  const assignees: Assignee[] = Array.isArray(a.assignees)
    ? a.assignees
        .filter((x) => x && typeof x === "object")
        .map((x) => ({
          whoId: typeof x.whoId === "string" ? x.whoId : "",
          who: typeof x.who === "string" ? x.who : "",
          done: x.done === true,
          ...(x.done === true && typeof x.doneAt === "string" && x.doneAt !== "" ? { doneAt: x.doneAt } : {}),
          ...(x.done === true && x.doneBy && typeof x.doneBy === "object" && typeof x.doneBy.who === "string" && x.doneBy.who !== ""
            ? { doneBy: { whoId: typeof x.doneBy.whoId === "string" ? x.doneBy.whoId : "", who: x.doneBy.who } }
            : {}),
        }))
        .filter((x) => x.who !== "" || x.whoId !== "")
    : [];
  const supporters = cleanSupporters(a.supporters, assignees);
  const comments: ActionComment[] = Array.isArray(a.comments)
    ? a.comments
        .filter((c) => c && typeof c === "object")
        .map((c) => ({
          whoId: typeof c.whoId === "string" ? c.whoId : "",
          who: typeof c.who === "string" ? c.who : undefined,
          when: typeof c.when === "string" ? c.when : "",
          text: typeof c.text === "string" ? c.text : "",
          ...(typeof c.id === "string" && c.id !== "" ? { id: c.id } : {}),
          ...(typeof c.at === "string" && c.at !== "" ? { at: c.at } : {}),
          ...(typeof c.editedAt === "string" && c.editedAt !== "" ? { editedAt: c.editedAt } : {}),
        }))
        .filter((c) => c.text !== "")
    : [];
  const ackRaw = (a.acknowledged ?? null) as Partial<Acknowledgement> | null;
  const acknowledged: Acknowledgement | undefined =
    ackRaw && typeof ackRaw === "object" && typeof ackRaw.when === "string" && ackRaw.when !== ""
      ? {
          whoId: typeof ackRaw.whoId === "string" ? ackRaw.whoId : "",
          who: typeof ackRaw.who === "string" ? ackRaw.who : "",
          when: ackRaw.when,
        }
      : undefined;
  const ctx = (a.context ?? {}) as Partial<ActionContext>;
  const verRaw = (a.verified ?? null) as Partial<Verification> | null;
  const verified: Verification | undefined =
    verRaw && typeof verRaw === "object" && typeof verRaw.when === "string" && verRaw.when !== ""
      ? {
          whoId: typeof verRaw.whoId === "string" ? verRaw.whoId : "",
          who: typeof verRaw.who === "string" ? verRaw.who : "",
          when: verRaw.when,
        }
      : undefined;
  const history = sanitizeHistory(a.history);
  const initiativeId =
    typeof a.initiativeId === "string" && a.initiativeId !== "" ? a.initiativeId : undefined;
  return {
    id: typeof a.id === "string" && a.id !== "" ? a.id : newId("a"),
    instanceId: typeof a.instanceId === "string" ? a.instanceId : "",
    issue: typeof a.issue === "string" ? a.issue : "",
    description: typeof a.description === "string" ? a.description : "",
    assignees,
    start: typeof a.start === "string" ? a.start : "",
    due: typeof a.due === "string" ? a.due : "",
    status: isStatus(a.status) ? a.status : "open",
    ...(ACTION_PDCA.includes(a.pdca as ActionPdca) ? { pdca: a.pdca as ActionPdca } : {}),
    comments,
    escalated: a.escalated === true,
    acknowledged,
    context: {
      source: typeof ctx.source === "string" ? ctx.source : "",
      sourceId: typeof ctx.sourceId === "string" ? ctx.sourceId : "",
      hint: typeof ctx.hint === "string" ? ctx.hint : undefined,
    },
    ...(history ? { history } : {}),
    ...(verified ? { verified } : {}),
    ...(typeof a.doneAt === "string" && a.doneAt !== "" ? { doneAt: a.doneAt } : {}),
    ...(initiativeId ? { initiativeId } : {}),
    // supporters (2026-11-16) — the whitelist must let them through
    ...(supporters.length > 0 ? { supporters } : {}),
    // confidential actions (2026-09-16) — the whitelist must let them through
    ...(a.confidential === true ? { confidential: true } : {}),
    ...(typeof a.createdBy === "string" && a.createdBy !== "" ? { createdBy: a.createdBy } : {}),
    ...(Array.isArray(a.visibleTo) ? { visibleTo: a.visibleTo.filter((x): x is string => typeof x === "string" && x !== "") } : {}),
  };
}

/** Parse an actions array defensively; never throws. */
export function parseActions(data: unknown): LtkAction[] {
  if (!Array.isArray(data)) return [];
  return data
    .filter((a) => a && typeof a === "object")
    .map((a) => sanitizeAction(a as Partial<LtkAction>));
}

/** Parse an actionsInputJSON string defensively; never throws. */
export function parseActionsJson(raw: string | null | undefined): LtkAction[] {
  const t = (raw ?? "").trim();
  if (t === "") return [];
  try {
    return parseActions(JSON.parse(t));
  } catch {
    return [];
  }
}

/**
 * Serialize the actions channel. When a non-empty instanceId is given, every
 * action is stamped with it, so the app can upsert into the central table
 * keyed by (instanceId, action id).
 */
export function serializeActions(
  actions: LtkAction[],
  instanceId?: string
): string {
  const out =
    instanceId !== undefined && instanceId !== ""
      ? actions.map((a) => ({ ...a, instanceId }))
      : actions;
  return JSON.stringify(out);
}

/** Overdue is derived: due in the past and the action still open. */
/** A comment as it is written now (2026-09-30): who, and the day — and
 *  since 2026-11-16 an id and the moment, so its author can put it right. */
export function newComment(viewer: { whoId: string; who: string }, text: string, today = todayIso(), nowIso = new Date().toISOString()): ActionComment {
  return { whoId: viewer.whoId, who: viewer.who !== "" ? viewer.who : undefined, when: today, text: text.trim(), id: newId("c"), at: nowIso };
}

/** How long a comment's author may edit or delete it (Ben, 2026-11-16):
 *  a day to fix a slip, then it is the record. */
export const COMMENT_EDIT_HOURS = 24;

/** May this viewer change this comment? Its author, inside the window.
 *  A comment written before comments carried a time has only its day:
 *  it can be changed on that day. */
export function canEditComment(c: ActionComment, viewerId: string, nowMs = Date.now(), today = todayIso()): boolean {
  if (viewerId === "" || c.whoId !== viewerId) return false;
  if (c.at) {
    const t = Date.parse(c.at);
    return Number.isFinite(t) && nowMs - t < COMMENT_EDIT_HOURS * 3600000 && nowMs >= t - 60000;
  }
  return c.when === today;
}

/** The wording changed: stamped, and given an id if it had none. */
export function editComment(c: ActionComment, text: string, nowIso = new Date().toISOString()): ActionComment {
  return { ...c, text: text.trim(), id: c.id ?? newId("c"), editedAt: nowIso };
}

const commentKey = (c: ActionComment): string => c.id ?? `${c.whoId}|${c.when}|${c.text}`;

/** The comments to WRITE: this screen's copy laid over what the row holds
 *  now. A save used to write its own array whole, so two people saving
 *  the same action lost one side's comments — and an edit made here must
 *  not undo someone else's.
 *  - a comment on both sides: the later edit wins;
 *  - on the row only: kept, unless it is the viewer's own and still
 *    inside its edit window (then this screen removed or replaced it);
 *  - here only: added when the viewer wrote it (anyone else's was
 *    removed by its author since this screen loaded). */
export function mergeComments(stored: ActionComment[], mine: ActionComment[], viewerId: string, nowMs = Date.now(), today = todayIso()): ActionComment[] {
  if (viewerId === "") return mine;
  const here = new Map(mine.map((c) => [commentKey(c), c]));
  const matched = new Set<string>();
  const out: ActionComment[] = [];
  for (const s of stored) {
    const k = commentKey(s);
    const m = here.get(k);
    if (m) {
      matched.add(k);
      out.push((s.editedAt ?? "") > (m.editedAt ?? "") ? s : m);
    } else if (!canEditComment(s, viewerId, nowMs, today)) {
      out.push(s);
    }
  }
  for (const m of mine) if (!matched.has(commentKey(m)) && m.whoId === viewerId) out.push(m);
  return out;
}

// ---- completion stamps, and "recently completed" (2026-11-17) -------------------

/** Keep the completion moments honest — called at the write (one write
 *  path): a done / verify action carries when it got there, each done
 *  part when it was ticked; an open action or part carries none. Returns
 *  true when anything changed. Pure but for `nowIso`. */
export function stampCompletion(a: LtkAction, nowIso = new Date().toISOString()): boolean {
  let changed = false;
  const closed = a.status === "done" || a.status === "verify";
  if (closed && (a.doneAt ?? "") === "") {
    a.doneAt = nowIso;
    changed = true;
  } else if (!closed && a.doneAt !== undefined) {
    delete a.doneAt;
    changed = true;
  }
  for (const x of a.assignees) {
    if (x.done && (x.doneAt ?? "") === "") {
      x.doneAt = nowIso;
      changed = true;
    } else if (!x.done && x.doneAt !== undefined) {
      delete x.doneAt;
      changed = true;
    }
    // an open part has no presser
    if (!x.done && x.doneBy !== undefined) {
      delete x.doneBy;
      changed = true;
    }
  }
  return changed;
}

const dayNumber = (iso: string): number => {
  const t = Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);
  return Number.isFinite(t) ? Math.round(t / 86_400_000) : NaN;
};

/** The local calendar day of an ISO moment (yyyy-mm-dd). */
function localDay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Completed within the last `days` days (today counts as day 0)? An
 *  action with no completion moment is not recent — it predates the
 *  stamp. `days` ≤ 0 = nothing is recent. */
export function recentlyDone(a: Pick<LtkAction, "status" | "doneAt">, days: number, today = todayIso()): boolean {
  if (a.status !== "done" || days <= 0 || (a.doneAt ?? "") === "") return false;
  const at = /T/.test(a.doneAt as string) ? localDay(a.doneAt as string) : (a.doneAt as string);
  const diff = dayNumber(today) - dayNumber(at);
  return Number.isFinite(diff) && diff >= 0 && diff < days;
}

/** How long a completed action stays in view by default. */
export const RECENT_DONE_DAYS = 7;

// ---- shared actions: several people, a part each (issue 10) ---------------------

/** The most people one shared action carries. */
export const MAX_ASSIGNEES = 500;

/** Parts done out of parts owed; null for an action that is not shared
 *  (nobody or one person). */
export function partsProgress(a: Pick<LtkAction, "assignees">): { done: number; total: number } | null {
  if (a.assignees.length < 2) return null;
  return { done: a.assignees.filter((x) => x.done).length, total: a.assignees.length };
}

/** Several people share it — a part each. */
export function isShared(a: Pick<LtkAction, "assignees">): boolean {
  return a.assignees.length >= 2;
}

/** Parts still to do on a shared action; 0 on one that is not shared. */
export function partsOutstanding(a: Pick<LtkAction, "assignees">): number {
  return isShared(a) ? a.assignees.filter((x) => !x.done).length : 0;
}

/**
 * A shared action closes ONLY when every person has done their part
 * (Ben, 2026-11-17 — until then Closed, a board's tick or a drop into
 * Done closed it for everyone). A road that closed it over outstanding
 * parts is put back: open, in Do. Applied where an action is saved (the
 * dialog) and at the store's write as the backstop. Returns true when it
 * reopened the action.
 */
export function holdOpenUntilAllParts(a: LtkAction): boolean {
  if (partsOutstanding(a) === 0) return false;
  if (a.status !== "done" && a.status !== "verify") return false;
  a.status = "open";
  if (a.pdca === undefined || a.pdca === "closed") a.pdca = "do";
  a.verified = undefined;
  return true;
}

/**
 * The tick on a shared action records ONE person's part — theirs — and
 * nothing else; the parts then settle the whole (all done closes it, a
 * part undone reopens it). "none" when `whoId` holds no part: someone
 * who is not on the action cannot tick it.
 */
export function tickPart(a: LtkAction, whoId: string, nowIso = new Date().toISOString()): "none" | "done" | "undone" {
  const mine = whoId !== "" ? a.assignees.find((x) => x.whoId === whoId) : undefined;
  if (mine === undefined || a.status === "cancelled") return "none";
  mine.done = !mine.done;
  if (mine.done) mine.doneAt = nowIso;
  else delete mine.doneAt;
  // their own tick: nobody pressed it for them
  delete mine.doneBy;
  settleFromParts(a, { reopen: true });
  return mine.done ? "done" : "undone";
}

/** "Jukes, Emily +11" — the first name and how many more; "" for nobody. */
export function assigneesLabel(a: Pick<LtkAction, "assignees">, unassigned = ""): string {
  const names = a.assignees.map((x) => x.who || "Unnamed");
  if (names.length === 0) return unassigned;
  return names.length === 1 ? names[0] : `${names[0]} +${names.length - 1}`;
}

/** "3 / 12 done" for a shared action; "" otherwise. */
export function partsLabel(a: Pick<LtkAction, "assignees">): string {
  const p = partsProgress(a);
  return p === null ? "" : `${p.done} / ${p.total} done`;
}

/** Who has done their part and who has not — a tooltip's two lines. */
export function partsTitle(a: Pick<LtkAction, "assignees">): string {
  const done = a.assignees.filter((x) => x.done).map((x) => x.who || "Unnamed");
  const todo = a.assignees.filter((x) => !x.done).map((x) => x.who || "Unnamed");
  const cap = (list: string[]) => (list.length > 12 ? `${list.slice(0, 12).join("; ")}; +${list.length - 12} more` : list.join("; "));
  return [todo.length > 0 ? `Still to do: ${cap(todo)}` : "", done.length > 0 ? `Done: ${cap(done)}` : ""].filter((l) => l !== "").join("\n");
}

const samePerson = (a: { whoId: string; who: string }, b: { whoId: string; who: string }): boolean =>
  a.whoId !== "" && b.whoId !== "" ? a.whoId === b.whoId : a.who.toLowerCase() === b.who.toLowerCase();

/**
 * The assignees an edit leaves (issue 10): the people picked, each
 * keeping the part they had — the dialog used to replace the list with
 * ONE person and drop the rest. `closed`: the action is done / waiting
 * now → every part is done; `wasClosed` and no longer → every part
 * reopens; otherwise a part is what `staged` says, else what it was,
 * else not done. Order: as they were, newcomers after. Pure.
 */
export function mergeAssignees(
  previous: Assignee[],
  picked: { whoId: string; who: string }[],
  opts: {
    closed: boolean;
    wasClosed: boolean;
    staged?: (p: { whoId: string; who: string }) => boolean | undefined;
    nowIso?: string;
    /** Who is saving: a part that becomes done here for SOMEONE ELSE
     *  records them (`doneBy`, programme C6). */
    by?: { whoId: string; who: string };
  }
): Assignee[] {
  const seen: { whoId: string; who: string }[] = [];
  const unique = picked.filter((p) => {
    if (seen.some((q) => samePerson(q, p))) return false;
    seen.push(p);
    return true;
  });
  const kept = previous.filter((x) => unique.some((p) => samePerson(p, x)));
  const added = unique.filter((p) => !previous.some((x) => samePerson(p, x)));
  const now = opts.nowIso ?? new Date().toISOString();
  const part = (p: { whoId: string; who: string }, was: Assignee | undefined): Assignee => {
    const done = opts.closed ? true : opts.wasClosed ? false : (opts.staged?.(p) ?? was?.done ?? false);
    const wasDone = was?.done === true;
    const doneAt = done ? (wasDone && was.doneAt ? was.doneAt : now) : undefined;
    // a part already done keeps whoever recorded it; one done HERE by
    // someone other than its person records the presser
    const doneBy = !done ? undefined : wasDone ? was.doneBy : opts.by && opts.by.who !== "" && !samePerson(opts.by, p) ? { whoId: opts.by.whoId, who: opts.by.who } : undefined;
    return { whoId: p.whoId, who: p.who, done, ...(doneAt ? { doneAt } : {}), ...(doneBy ? { doneBy } : {}) };
  };
  return [...kept.map((x) => part(unique.find((p) => samePerson(p, x)) ?? x, x)), ...added.map((p) => part(p, undefined))].slice(0, MAX_ASSIGNEES);
}

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Signed off by Ben for Kat, 24 Nov" — a part someone else recorded
 *  as done (programme C6). "" when the person did it themselves, or
 *  nobody is on record. The date is the local day of `doneAt`. */
export function signedOffWords(part: Pick<Assignee, "who" | "done" | "doneAt" | "doneBy">): string {
  if (!part.done || part.doneBy === undefined || part.doneBy.who === "") return "";
  const at = part.doneAt ?? "";
  const day = at === "" ? "" : /T/.test(at) ? localDay(at) : at;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(day);
  const when = m ? `, ${Number(m[3])} ${SHORT_MONTHS[Number(m[2]) - 1] ?? ""}`.trimEnd() : "";
  return `Signed off by ${part.doneBy.who} for ${part.who}${when}`;
}

/**
 * Lay this screen's parts over the row AS IT STANDS NOW (the store's
 * write, issue 10): on a shared action several people tick their own
 * part from their own screens, and each save used to write the whole
 * list — the last one in un-ticked everyone who had ticked since it
 * loaded. `baseline` is the list this screen was handed; a part or a
 * membership this screen did not change takes the row's value.
 *   · a person here whose part is as it was loaded → the row's part
 *   · a person here whose part this screen changed, or added → this one
 *   · a person this screen removed → gone
 *   · a person someone else added since → kept
 * No baseline (a new action, a row never read here) → this screen's list.
 */
export function mergeParts(rowNow: Assignee[], mine: Assignee[], baseline: Assignee[] | undefined): Assignee[] {
  if (baseline === undefined) return mine;
  const find = (list: Assignee[], p: Assignee) => list.find((x) => samePerson(x, p));
  const out: Assignee[] = [];
  for (const m of mine) {
    const base = find(baseline, m);
    const now = find(rowNow, m);
    out.push(base !== undefined && base.done === m.done && now !== undefined ? { ...now } : m);
  }
  for (const n of rowNow) {
    if (find(baseline, n) === undefined && find(mine, n) === undefined) out.push({ ...n });
  }
  return out;
}

// ---- duplicate (issue 11) ---------------------------------------------------------

/** A new action made from an existing one: what it is, who, when and
 *  where it is linked — not its life (comments, history, parts done,
 *  endorsement, completion). A closed source duplicates as Do. */
export function duplicateAction(src: LtkAction): LtkAction {
  const open = src.pdca !== undefined && src.pdca !== "closed" && src.status !== "done" && src.status !== "verify" && src.status !== "cancelled";
  return {
    id: newId("a"),
    instanceId: src.instanceId,
    issue: src.issue,
    description: src.description,
    assignees: src.assignees.map((x) => ({ whoId: x.whoId, who: x.who, done: false })),
    ...(src.supporters && src.supporters.length > 0 ? { supporters: src.supporters.map((x) => ({ ...x })) } : {}),
    start: src.start,
    due: src.due,
    status: "open",
    pdca: open ? src.pdca : "do",
    comments: [],
    escalated: src.escalated,
    context: { ...src.context },
    ...(src.initiativeId ? { initiativeId: src.initiativeId } : {}),
    ...(src.confidential === true ? { confidential: true } : {}),
  };
}

export function isOverdue(a: LtkAction, today = todayIso()): boolean {
  // "verify" is finished work awaiting endorsement — the assignee's part is
  // done, so it is not overdue (it is the owner's queue, not theirs)
  return (
    a.due !== "" &&
    a.due < today &&
    a.status !== "done" &&
    a.status !== "verify" &&
    a.status !== "cancelled" &&
    // on hold is paused by decision — not late
    !isOnHold(a)
  );
}

/** Action fully done when every assignee has ticked off (or status says so). */
export function isComplete(a: LtkAction): boolean {
  if (a.status === "done") return true;
  return a.assignees.length > 0 && a.assignees.every((x) => x.done);
}
