// Cascaded priorities — the PURE model (docs/leanboard-cascade-improvement-
// plan.md, P0). Org references, pillars, priorities, assignments, events,
// the period model, the R/A/G tally + roll-up rules, and the permission
// checks. No IO here (store/priorities.ts executes); everything is unit
// tested. Screens (P1+) read through these types only.

// ---- org references (the boards' org dictionary, by NAME) ----------------

/** An org node: company → site → department → area, blank levels = a
 *  higher node. Names, not ids — the app's org dictionary is name-keyed
 *  (site settings rows), and renames cascade by name. */
import { DEFAULT_STATUS_SETTINGS, parseStatusSettings, StatusSettings } from "../improvement/status";

export interface OrgRef {
  company: string;
  site: string;
  department: string;
  area: string;
}

export type OrgLevel = "company" | "site" | "department" | "area";

export function orgRef(
  company = "",
  site = "",
  department = "",
  area = ""
): OrgRef {
  return { company, site, department, area };
}

export function orgLevel(o: OrgRef): OrgLevel {
  if (o.area !== "") return "area";
  if (o.department !== "") return "department";
  if (o.site !== "") return "site";
  return "company";
}

/** A stable string key for maps/sets ("company|site|dept|area"). */
export function orgKey(o: OrgRef): string {
  return [o.company, o.site, o.department, o.area].join("|");
}

export function orgFromKey(key: string): OrgRef {
  const [company = "", site = "", department = "", area = ""] = key.split("|");
  return { company, site, department, area };
}

/** The node's own name (the deepest non-blank level). */
export function orgName(o: OrgRef): string {
  return o.area || o.department || o.site || o.company;
}

export function orgParent(o: OrgRef): OrgRef | null {
  switch (orgLevel(o)) {
    case "area":
      return { ...o, area: "" };
    case "department":
      return { ...o, department: "" };
    case "site":
      return { ...o, site: "" };
    default:
      return null;
  }
}

export function sameOrg(a: OrgRef, b: OrgRef): boolean {
  return orgKey(a) === orgKey(b);
}

/** True when `node` sits under `ancestor` (strictly). */
export function isDescendant(node: OrgRef, ancestor: OrgRef): boolean {
  if (sameOrg(node, ancestor)) return false;
  const lv = orgLevel(ancestor);
  if (node.company !== ancestor.company) return false;
  if (lv === "company") return true;
  if (node.site !== ancestor.site) return false;
  if (lv === "site") return true;
  if (node.department !== ancestor.department) return false;
  return lv === "department";
}

/** Breadcrumb path from the company down to the node. */
export function orgPath(o: OrgRef): OrgRef[] {
  const path: OrgRef[] = [orgRef(o.company)];
  if (o.site !== "") path.push(orgRef(o.company, o.site));
  if (o.department !== "") path.push(orgRef(o.company, o.site, o.department));
  if (o.area !== "") path.push(o);
  return path;
}

/** The link picker's shape (Ben, 2026-08-29): priorities grouped by the
 *  org level they belong to, ordered top-down (company → the
 *  initiative's own org), statements sorted within each group. */
export function groupPrioritiesForPicker<T extends { org: OrgRef; statement: string }>(
  priorities: T[],
  at: OrgRef
): { label: string; items: T[] }[] {
  const chain = orgPath(at);
  const out: { label: string; items: T[] }[] = [];
  for (const node of chain) {
    const items = priorities
      .filter((p) => sameOrg(p.org, node))
      .sort((a, b) => a.statement.localeCompare(b.statement));
    if (items.length > 0) {
      out.push({ label: orgName(node) + (orgLevel(node) === "company" ? " (company)" : ""), items });
    }
  }
  return out;
}

/**
 * The link picker's two sections (Ben, 2026-10-31: "it is listing all
 * priorities for the current org and its parents — default to the
 * current organisational context, and make it searchable"): `here` is
 * the priorities AT the initiative's org, `above` the parents' in chain
 * order. `query` narrows both by statement, case-blind.
 */
export function pickerSections<T extends { org: OrgRef; statement: string }>(
  priorities: T[],
  at: OrgRef,
  query = ""
): { here: { label: string; items: T[] }[]; above: { label: string; items: T[] }[] } {
  const q = query.trim().toLowerCase();
  const hit = (p: T) => q === "" || p.statement.toLowerCase().includes(q);
  const groups = groupPrioritiesForPicker(priorities.filter(hit), at);
  const hereLabel = orgName(at) + (orgLevel(at) === "company" ? " (company)" : "");
  return {
    here: groups.filter((g) => g.label === hereLabel),
    above: groups.filter((g) => g.label !== hereLabel),
  };
}

// ---- pillars -----------------------------------------------------------------

export interface Pillar {
  /** Dataverse row GUID — set by the store, absent on fresh objects. */
  rowId?: string;
  id: string;
  name: string;
  /** 1 = pillar (filter chips above the matrix), 2 = sub-pillar (the
   *  matrix columns). The wall template calls these "medium-term
   *  strategy" and "strategic objectives"; the app says pillar /
   *  sub-pillar (Ben, 2026-08-19). */
  level: 1 | 2;
  parentId: string; // "" for level 1
  color: string;
  order: number;
  active: boolean;
  company: string;
  /** The span the pillar is in force (2026-10-02): "" = open at that end.
   *  The year picker shows the pillars live in the viewed year. */
  fromPeriod: string;
  toPeriod: string;
  /** The pillar row this one FOLLOWS (issue 4, 2026-11-16): a pillar
   *  renamed or re-parented "from a year" ends, and a successor starts
   *  that names it. "" = none. Priorities follow the chain into the year
   *  being viewed, so nothing is rewritten per priority. */
  succeedsId?: string;
}

/** Level-2 pillars in display order, optionally under one L1. */
/** Sub-pillar columns in the order Settings shows them: pillar by pillar,
 *  then each pillar's sub-pillars by their own order. Sub-pillars whose
 *  pillar is retired or missing trail at the end (still columns — their
 *  priorities must not vanish). */
export function objectiveColumns(pillars: Pillar[], l1: string | string[] | null): Pillar[] {
  const byOrder = (a: Pillar, b: Pillar) => a.order - b.order || a.name.localeCompare(b.name);
  // a focus SET (rotation focus, P4): pillar ids keep all their sub-pillars,
  // sub-pillar ids keep just themselves
  const focus = Array.isArray(l1) ? new Set(l1) : null;
  const inFocus = (p: Pillar) =>
    focus === null ? l1 === null || p.parentId === l1 : focus.has(p.parentId) || focus.has(p.id);
  const subs = pillars.filter((p) => p.level === 2 && p.active && inFocus(p));
  const out: Pillar[] = [];
  for (const top of strategyChips(pillars)) {
    out.push(...subs.filter((s) => s.parentId === top.id).sort(byOrder));
  }
  const placed = new Set(out.map((s) => s.id));
  out.push(...subs.filter((s) => !placed.has(s.id)).sort(byOrder));
  return out;
}

/** The pillar row over the columns: one span per pillar covering its
 *  consecutive sub-pillar columns; orphan sub-pillars share a "—" span. */
export function pillarSpans(pillars: Pillar[], columns: Pillar[]): { pillar: Pillar | null; span: number }[] {
  const out: { pillar: Pillar | null; span: number }[] = [];
  const tops = new Map(strategyChips(pillars).map((p) => [p.id, p]));
  for (const col of columns) {
    const top = tops.get(col.parentId) ?? null;
    const last = out[out.length - 1];
    if (last && last.pillar?.id === top?.id && (last.pillar !== null || top === null)) last.span += 1;
    else out.push({ pillar: top, span: 1 });
  }
  return out;
}

export function strategyChips(pillars: Pillar[]): Pillar[] {
  return pillars
    .filter((p) => p.level === 1 && p.active)
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}

// ---- priorities ---------------------------------------------------------------

/** "proposed" (issue 13, 2026-11-16): added by someone who may add but
 *  not approve — it waits, off the board's rows and out of every tally,
 *  for the org's owner or an admin to accept or decline. */
export type PriorityStatus = "active" | "completed" | "archived" | "retired" | "proposed";

export interface Priority {
  rowId?: string;
  id: string;
  statement: string;
  org: OrgRef;
  pillarId: string;
  ownerId: string;
  ownerName: string;
  /** The span's START (2026-10-02; was the one period a priority belonged to). */
  period: string;
  /** Stamped at close from the closing date; "" while it runs. Old closed
   *  rows have none — `effectiveEnd` reads them as ending in their start. */
  toPeriod: string;
  /** Optional: past it while still open = the review flag. */
  plannedEnd: string;
  status: PriorityStatus;
  statusReason: string;
  parentId: string; // "" = originated here
  primaryInitiativeId: string;
  order: number;
  notes: string;
  /** With no primary initiative: the metrics picked from the linked
   *  initiatives as this priority's objectives (issue 8, 2026-11-16). */
  objectives: PriorityObjective[];
  /** The sub-pillars it sat under in EARLIER years (issue 4, 2026-11-16);
   *  `pillarId` stays its current home. Oldest first. */
  placements: PriorityPlacement[];
}

/** One picked objective: a metric of a linked initiative. */
export interface PriorityObjective {
  initiativeId: string;
  metricKey: string;
}

/** "Up to and including `to`, it sat under `pillarId`." */
export interface PriorityPlacement {
  pillarId: string;
  to: string;
}

export function parseObjectives(raw: unknown): PriorityObjective[] {
  let v: unknown = raw;
  if (typeof v === "string") {
    try {
      v = JSON.parse(v || "[]");
    } catch {
      return [];
    }
  }
  if (!Array.isArray(v)) return [];
  const out: PriorityObjective[] = [];
  for (const x of v) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    if (typeof o.initiativeId !== "string" || typeof o.metricKey !== "string" || o.initiativeId === "" || o.metricKey === "") continue;
    if (out.some((y) => y.initiativeId === o.initiativeId && y.metricKey === o.metricKey)) continue;
    out.push({ initiativeId: o.initiativeId, metricKey: o.metricKey });
  }
  return out;
}

export function parsePlacements(raw: unknown): PriorityPlacement[] {
  let v: unknown = raw;
  if (typeof v === "string") {
    try {
      v = JSON.parse(v || "[]");
    } catch {
      return [];
    }
  }
  if (!Array.isArray(v)) return [];
  const out: PriorityPlacement[] = [];
  for (const x of v) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    if (typeof o.pillarId !== "string" || typeof o.to !== "string" || o.pillarId === "" || o.to === "") continue;
    out.push({ pillarId: o.pillarId, to: o.to });
  }
  return out;
}

// ---- the primary initiative, as it counts now (issues 1 and 8) ---------------

/** What the rule needs to know of an initiative. */
export interface PrimaryCandidate {
  id: string;
  title: string;
  status: string;
  priorities: { priorityId: string }[];
}

/** The priority's primary initiative AS IT COUNTS NOW. The stored id
 *  counts only while that initiative is still linked to the priority and
 *  is active or completed — a completed primary keeps headlining (its
 *  metrics are the result), an archived, unlinked or deleted one does
 *  not (Ben, 2026-11-16: an archived primary kept driving the
 *  priority's key details). "" = none. ONE rule: every reader of the
 *  primary's charter, metrics and commentary asks it. */
export function livePrimaryId(p: Pick<Priority, "id" | "primaryInitiativeId">, initiatives: PrimaryCandidate[]): string {
  if (p.primaryInitiativeId === "") return "";
  const i = initiatives.find((x) => x.id === p.primaryInitiativeId);
  if (!i) return "";
  if (i.status !== "active" && i.status !== "completed") return "";
  return i.priorities.some((l) => l.priorityId === p.id) ? i.id : "";
}

/** A stored primary that no longer counts, and why — the popup says so
 *  and offers to clear it. null = there is none, or it is live. */
export function stalePrimary(p: Pick<Priority, "id" | "primaryInitiativeId">, initiatives: PrimaryCandidate[]): { id: string; title: string; why: "archived" | "unlinked" | "gone" } | null {
  if (p.primaryInitiativeId === "" || livePrimaryId(p, initiatives) !== "") return null;
  const i = initiatives.find((x) => x.id === p.primaryInitiativeId);
  if (!i) return { id: p.primaryInitiativeId, title: "", why: "gone" };
  return { id: i.id, title: i.title, why: i.status !== "active" && i.status !== "completed" ? "archived" : "unlinked" };
}

/** A priority's objectives. With a live primary: its ★ starred metrics
 *  (as always). Without one: the metrics its owner picked from the
 *  linked initiatives, dropping any whose initiative is no longer under
 *  the priority. */
export function objectiveValues<V extends { key: string; starred: boolean }>(
  p: Pick<Priority, "objectives">,
  livePrimary: string,
  valuesOf: (initiativeId: string) => V[],
  linked: (initiativeId: string) => boolean
): V[] {
  if (livePrimary !== "") return valuesOf(livePrimary).filter((v) => v.starred);
  const out: V[] = [];
  for (const o of p.objectives) {
    if (!linked(o.initiativeId)) continue;
    const v = valuesOf(o.initiativeId).find((x) => x.key === o.metricKey);
    if (v) out.push(v);
  }
  return out;
}

export type AssignmentStatus = "proposed" | "accepted" | "rejected" | "onhold" | "completed";

/** priority × receiving org (decision 2). */
export interface PriorityAssignment {
  /** Assignments have no business id — `id` IS the row GUID ("" when new). */
  id: string;
  priorityId: string;
  org: OrgRef;
  status: AssignmentStatus;
  reason: string;
  decidedById: string;
  decidedByName: string;
  decidedAt: string; // ISO or ""
  /** The customised child row this org made from it ("" = adopted as-is). */
  childPriorityId: string;
}

export type PriorityEventKind =
  | "created"
  | "edited"
  | "cascaded"
  | "accepted"
  | "customised"
  | "held"
  | "rejected"
  | "completed"
  | "archived"
  | "retired"
  | "carriedForward"
  | "linked"
  | "unlinked"
  | "reopened"
  | "reordered"
  | "pulled"
  | "dropped"
  | "proposed"
  | "approved"
  | "declined";

export interface PriorityEvent {
  /** Row GUID ("" when new). */
  id: string;
  priorityId: string;
  kind: PriorityEventKind;
  detail: Record<string, unknown>;
  actorId: string;
  actorName: string;
  at: string;
}

export function isPriorityStatus(v: unknown): v is PriorityStatus {
  return v === "active" || v === "completed" || v === "archived" || v === "retired" || v === "proposed";
}

export function isAssignmentStatus(v: unknown): v is AssignmentStatus {
  return (
    v === "proposed" || v === "accepted" || v === "rejected" || v === "onhold" || v === "completed"
  );
}

/**
 * What an org's matrix shows in a column: its OWN priorities plus the
 * parent-org priorities it has ADOPTED as-is (accepted assignment, no
 * child) — decision 2. Customised ones are the org's own child rows and
 * come through the first set. Sorted by order then statement.
 */
export function prioritiesForOrg(
  org: OrgRef,
  all: Priority[],
  assignments: PriorityAssignment[]
): { own: Priority[]; adopted: Priority[] } {
  const key = orgKey(org);
  const own = all.filter((p) => orgKey(p.org) === key);
  const adoptedIds = new Set(
    assignments
      .filter((a) => orgKey(a.org) === key && a.status === "accepted" && a.childPriorityId === "")
      .map((a) => a.priorityId)
  );
  const adopted = all.filter((p) => adoptedIds.has(p.id));
  const byOrder = (a: Priority, b: Priority) =>
    a.order - b.order || a.statement.localeCompare(b.statement);
  return { own: own.sort(byOrder), adopted: adopted.sort(byOrder) };
}

/** Assignments awaiting this org's decision — the toolbar chip's count. */
export function pendingCascades(org: OrgRef, assignments: PriorityAssignment[]): PriorityAssignment[] {
  const key = orgKey(org);
  return assignments.filter((a) => orgKey(a.org) === key && a.status === "proposed");
}

/** Lineage summary for a priority card: what came in, what went out. */
export interface LineageSummary {
  /** The parent's org (received/adopted from), or null. */
  from: OrgRef | null;
  sent: number;
  accepted: number;
  pending: number;
  declined: number;
  held: number;
}

export function lineageFor(
  p: Priority,
  all: Priority[],
  assignments: PriorityAssignment[]
): LineageSummary {
  const parent = p.parentId !== "" ? all.find((x) => x.id === p.parentId) : undefined;
  const mine = assignments.filter((a) => a.priorityId === p.id);
  return {
    from: parent ? parent.org : null,
    sent: mine.length,
    accepted: mine.filter((a) => a.status === "accepted" || a.status === "completed").length,
    pending: mine.filter((a) => a.status === "proposed").length,
    declined: mine.filter((a) => a.status === "rejected").length,
    held: mine.filter((a) => a.status === "onhold").length,
  };
}

/** Every priority beneath `p` in the cascade (children of children…). */
export function descendantPriorities(p: Priority, all: Priority[]): Priority[] {
  const out: Priority[] = [];
  const walk = (id: string) => {
    for (const c of all) {
      if (c.parentId === id) {
        out.push(c);
        walk(c.id);
      }
    }
  };
  walk(p.id);
  return out;
}

/** The descendants that COUNT toward a priority's tallies, objectives
 *  and actions: a proposed priority, and everything under it, does not —
 *  it is not on the board yet (issue 13). */
export function countedDescendants(p: Priority, all: Priority[]): Priority[] {
  const out: Priority[] = [];
  const walk = (id: string) => {
    for (const c of all) {
      if (c.parentId !== id || c.status === "proposed") continue;
      out.push(c);
      walk(c.id);
    }
  };
  walk(p.id);
  return out;
}

// ---- a metric's light --------------------------------------------------------
// The R/A/G tallies, the strict / ratio roll-up and `initiativeRag` lived
// here until 2026-11-17. An initiative's and a priority's status is now
// ONE rule in improvement/status.ts (on track / flagged / off track).
// `Rag` stays for what is still a light: a metric's reading.

export type Rag = "green" | "amber" | "red" | "grey";

// ---- periods (decision 10) --------------------------------------------------

export interface PeriodSettings {
  /** fy = financial year starting `startMonth`; calendar = Jan–Dec;
   *  custom = free labels, `currentPeriod` typed by the admin. */
  mode: "fy" | "calendar" | "custom";
  /** 1–12; fy only. */
  startMonth: number;
  /** Label prefix, e.g. "FY" → "FY26". */
  prefix: string;
  /** custom mode: the current label; other modes derive it. */
  currentPeriod: string;
  /** custom mode: every label in order — spans need comparing (2026-10-02). */
  labels: string[];
}

export interface PrioritySettings {
  /** The status rule's settings (2026-11-17) — the recency window and the
   *  three state colours. Replaces the ratio roll-up's percentage. */
  status: StatusSettings;
  period: PeriodSettings;
}

export const DEFAULT_PRIORITY_SETTINGS: PrioritySettings = {
  status: DEFAULT_STATUS_SETTINGS,
  period: { mode: "fy", startMonth: 7, prefix: "FY", currentPeriod: "", labels: [] },
};

export function parsePrioritySettings(raw: string | null | undefined): PrioritySettings {
  const d = DEFAULT_PRIORITY_SETTINGS;
  const t = (raw ?? "").trim();
  if (t === "") return { status: parseStatusSettings(undefined), period: { ...d.period } };
  try {
    const o = JSON.parse(t) as Record<string, unknown>;
    const p = (o.period ?? {}) as Record<string, unknown>;
    const mode = p.mode === "calendar" || p.mode === "custom" ? p.mode : "fy";
    const sm = typeof p.startMonth === "number" ? Math.round(p.startMonth) : d.period.startMonth;
    return {
      status: parseStatusSettings(o.status),
      period: {
        mode,
        startMonth: Math.max(1, Math.min(12, sm)),
        prefix: typeof p.prefix === "string" ? p.prefix : d.period.prefix,
        currentPeriod: typeof p.currentPeriod === "string" ? p.currentPeriod : "",
        labels: Array.isArray(p.labels) ? p.labels.filter((l): l is string => typeof l === "string" && l.trim() !== "").map((l) => l.trim()) : [],
      },
    };
  } catch {
    return { status: parseStatusSettings(undefined), period: { ...d.period } };
  }
}

export function serializePrioritySettings(s: PrioritySettings): string {
  return JSON.stringify(s);
}

/**
 * The period label for a date. FY: a year starting `startMonth` is named
 * for the calendar year it ENDS in ("FY26" = Jul 2025 – Jun 2026 when
 * startMonth = 7). Calendar: "2026" (prefix applied if set). Custom: the
 * admin's current label.
 */
export function periodFor(settings: PeriodSettings, dateIso: string): string {
  if (settings.mode === "custom") return settings.currentPeriod;
  const y = Number(dateIso.slice(0, 4));
  const m = Number(dateIso.slice(5, 7));
  if (!Number.isFinite(y) || !Number.isFinite(m)) return settings.currentPeriod;
  if (settings.mode === "calendar") return `${settings.prefix}${settings.prefix === "" ? y : String(y).slice(-2)}`;
  const endYear = settings.startMonth === 1 ? y : m >= settings.startMonth ? y + 1 : y;
  return `${settings.prefix}${String(endYear).slice(-2)}`;
}

/** The label after `period` (carry-forward target). Custom → "" (admin sets). */
export function nextPeriod(settings: PeriodSettings, period: string): string {
  if (settings.mode === "custom") {
    const i = settings.labels.indexOf(period);
    return i >= 0 && i + 1 < settings.labels.length ? settings.labels[i + 1] : "";
  }
  const digits = period.replace(/\D/g, "");
  if (digits === "") return "";
  const n = Number(digits);
  const width = digits.length;
  return `${settings.prefix}${String(n + 1).padStart(width, "0").slice(-width)}`;
}

/** The label before `period`. Custom → "" (admin sets). */
export function prevPeriod(settings: PeriodSettings, period: string): string {
  if (settings.mode === "custom") {
    const i = settings.labels.indexOf(period);
    return i > 0 ? settings.labels[i - 1] : "";
  }
  const digits = period.replace(/\D/g, "");
  if (digits === "") return "";
  const n = Number(digits);
  const width = digits.length;
  if (n <= 0) return "";
  return `${settings.prefix}${String(n - 1).padStart(width, "0").slice(-width)}`;
}

/** The inclusive yyyy-mm-dd window a period spans (FY: startMonth of the
 *  prior calendar year → the month before, in the named year; calendar:
 *  Jan–Dec). Custom periods have no dates → null (all points count). */
export function periodWindow(settings: PeriodSettings, period: string): { from: string; to: string } | null {
  if (settings.mode === "custom") return null;
  const digits = period.replace(/\D/g, "");
  if (digits === "") return null;
  const n = Number(digits);
  const year = digits.length <= 2 ? 2000 + n : n;
  const p = (x: number) => String(x).padStart(2, "0");
  if (settings.mode === "calendar" || settings.startMonth === 1) return { from: `${year}-01-01`, to: `${year}-12-31` };
  const sm = settings.startMonth;
  const from = `${year - 1}-${p(sm)}-01`;
  const endMonth = sm - 1;
  const lastDay = new Date(year, endMonth, 0).getDate(); // day 0 of the next month = last day of endMonth
  return { from, to: `${year}-${p(endMonth)}-${p(lastDay)}` };
}

// ---- spans (2026-10-02) ---------------------------------------------------------
// A priority runs from a START period to an END; the year picker is a lens
// over what was live in that year, not a container. Pillars carry the same
// two fields. "" at either end = open. Nothing is copied at a boundary.

/** Compare two period labels: FY / calendar by their year, custom by the
 *  ordered label list (unknown labels fall back to text order). */
export function comparePeriods(settings: PeriodSettings, a: string, b: string): number {
  if (settings.mode === "custom") {
    const ia = settings.labels.indexOf(a);
    const ib = settings.labels.indexOf(b);
    if (ia >= 0 && ib >= 0) return ia - ib;
    if (ia >= 0 || ib >= 0) return ia >= 0 ? -1 : 1;
    return a.localeCompare(b);
  }
  const year = (p: string): number => {
    const digits = p.replace(/\D/g, "");
    if (digits === "") return Number.NaN;
    const n = Number(digits);
    return digits.length <= 2 ? 2000 + n : n;
  };
  const ya = year(a);
  const yb = year(b);
  if (Number.isNaN(ya) || Number.isNaN(yb)) return a.localeCompare(b);
  return ya - yb;
}

/** The period something ended in: its stamped end, else — for a row closed
 *  before ends were stamped — the period it started in. "" = still open. */
export function effectiveEnd(x: { status: string; period: string; toPeriod: string }): string {
  if (x.toPeriod !== "") return x.toPeriod;
  // a proposal has not ended: it has not begun
  return x.status === "active" || x.status === "proposed" ? "" : x.period;
}

/** Live in `year`: started by then (or no start) and not ended before it. */
export function spanLiveIn(settings: PeriodSettings, span: { start: string; end: string }, year: string): boolean {
  if (year === "") return true;
  if (span.start !== "" && comparePeriods(settings, span.start, year) > 0) return false;
  if (span.end !== "" && comparePeriods(settings, span.end, year) < 0) return false;
  return true;
}

export function priorityLiveIn(settings: PeriodSettings, p: Priority, year: string): boolean {
  return spanLiveIn(settings, { start: p.period, end: effectiveEnd(p) }, year);
}

export function pillarLiveIn(settings: PeriodSettings, pillar: Pillar, year: string): boolean {
  return pillar.active && spanLiveIn(settings, { start: pillar.fromPeriod, end: pillar.toPeriod }, year);
}

/** The pillars in force in `year` — what the chips and columns are built
 *  from. A sub-pillar also needs its pillar live (a retired pillar takes
 *  its columns with it, as `objectiveColumns` already assumes). */
export function pillarsLiveIn(settings: PeriodSettings, pillars: Pillar[], year: string): Pillar[] {
  const live = pillars.filter((p) => pillarLiveIn(settings, p, year));
  const tops = new Set(live.filter((p) => p.level === 1).map((p) => p.id));
  return live.filter((p) => p.level === 1 || p.parentId === "" || tops.has(p.parentId));
}

/** Still open past its planned end, as seen from `year` — the review flag
 *  that replaces the yearly carry-forward. */
export function reviewDue(settings: PeriodSettings, p: Priority, year: string): boolean {
  if (p.status !== "active" || p.plannedEnd === "") return false;
  return comparePeriods(settings, p.plannedEnd, year) < 0;
}

/** Every period the picker offers: from the earliest start in the data to
 *  the later of the next period and the latest end or planned end. FY /
 *  calendar step through the years; custom lists the ordered labels plus
 *  any the data holds. */
export function periodsOnOffer(
  settings: PeriodSettings,
  current: string,
  spans: { start: string; end: string; planned?: string }[]
): string[] {
  const seen = new Set<string>();
  for (const sp of spans) for (const l of [sp.start, sp.end, sp.planned ?? ""]) if (l !== "") seen.add(l);
  if (current !== "") seen.add(current);
  const next = nextPeriod(settings, current);
  if (next !== "") seen.add(next);
  const cmp = (a: string, b: string) => comparePeriods(settings, a, b);
  if (settings.mode === "custom") {
    const out = settings.labels.slice();
    for (const l of [...seen].sort(cmp)) if (!out.includes(l)) out.push(l);
    return out;
  }
  const sorted = [...seen].sort(cmp);
  if (sorted.length === 0) return [];
  const out: string[] = [];
  let cur = sorted[0];
  const last = sorted[sorted.length - 1];
  for (let n = 0; n < 40 && cur !== ""; n++) {
    out.push(cur);
    if (cmp(cur, last) >= 0) break;
    cur = nextPeriod(settings, cur);
  }
  for (const l of sorted) if (!out.includes(l)) out.push(l);
  return out.sort(cmp);
}

// ---- re-parenting (2026-10-02) -------------------------------------------------------
// A priority set at a junior org that turns out to serve a senior one gets
// linked after the fact. The parent must sit above the child's org or
// beside it (a peer), be active, and not already hang beneath the child.

export function canBeParent(child: Priority, candidate: Priority, all: Priority[]): boolean {
  if (candidate.id === child.id || candidate.status !== "active") return false;
  if (sameOrg(candidate.org, child.org)) return false;
  const above = isDescendant(child.org, candidate.org);
  const pc = orgParent(child.org);
  const pp = orgParent(candidate.org);
  const peer = pc !== null && pp !== null && sameOrg(pc, pp);
  if (!above && !peer) return false;
  return !descendantPriorities(child, all).some((d) => d.id === candidate.id);
}

export function parentCandidates(child: Priority, all: Priority[]): Priority[] {
  return all.filter((c) => canBeParent(child, c, all));
}

// ---- permissions (decision 7) ---------------------------------------------

export interface OwnerRef {
  whoId: string;
  who: string;
}

/** Owners per org key ("company|site|department|area"), site + department
 *  levels only (areas are managed by their department's owners). */
export type OrgOwnersMap = Record<string, OwnerRef[]>;

export interface Viewer {
  whoId: string;
  role: "user" | "siteadmin" | "superadmin";
  site: string;
  /** The viewer's manager in the directory ("" = none / unknown): a
   *  direct report of an org's owner manages that org too (issue round
   *  2026-11-06, #2). A failed lookup leaves it "" — owner-only rights. */
  managerId?: string;
}

/** The org node whose owners govern `org`: itself for site/department,
 *  the department for an area, the company for the company. */
export function governingOrg(org: OrgRef): OrgRef {
  return orgLevel(org) === "area" ? { ...org, area: "" } : org;
}

/**
 * Can this viewer create/edit priorities, accept cascades, set the
 * vision and hang initiatives under priorities for `org`? Superadmins:
 * yes. Siteadmins: anything in their site. Otherwise: an owner of the
 * governing node or of any node above it (a site owner governs its
 * departments) — or a DIRECT REPORT of such an owner (Ben, 2026-11-06:
 * "the owner of an organisation level, and their direct reports").
 */
export function canManageOrg(viewer: Viewer, org: OrgRef, owners: OrgOwnersMap): boolean {
  if (viewer.role === "superadmin") return true;
  if (viewer.role === "siteadmin" && org.site !== "" && org.site === viewer.site) return true;
  const manager = viewer.managerId ?? "";
  let node: OrgRef | null = governingOrg(org);
  while (node) {
    const list = owners[orgKey(node)] ?? [];
    if (list.some((o) => o.whoId !== "" && (o.whoId === viewer.whoId || o.whoId === manager))) return true;
    node = orgParent(node);
  }
  return false;
}

/**
 * May this viewer ACCEPT what lands on an org's board (issue 13,
 * 2026-11-16)? `canManageOrg` without its direct-report clause: a super
 * admin, the site's own admin, or an owner of the governing node or any
 * node above it. An owner's direct reports still manage the org's
 * accepted priorities; what they ADD or PULL waits for one of these.
 */
export function canApproveAt(viewer: Viewer, org: OrgRef, owners: OrgOwnersMap): boolean {
  if (viewer.role === "superadmin") return true;
  if (viewer.role === "siteadmin" && org.site !== "" && org.site === viewer.site) return true;
  let node: OrgRef | null = governingOrg(org);
  while (node) {
    const list = owners[orgKey(node)] ?? [];
    if (list.some((o) => o.whoId !== "" && o.whoId === viewer.whoId)) return true;
    node = orgParent(node);
  }
  return false;
}

/** A pull from above made by someone who may not approve: the assignment
 *  waits as "proposed" and names who pulled it. A cascade SENT from above
 *  is "proposed" too, with nobody named — that one any manager accepts. */
export function isPulledProposal(a: Pick<PriorityAssignment, "status" | "decidedById">): boolean {
  return a.status === "proposed" && a.decidedById !== "";
}

/** What an accepted priority has spread to below — said in the question
 *  before it is moved back to proposed (Ben, 2026-11-16): the orgs that
 *  adopted it as-is (it leaves their boards while proposed), the
 *  customised copies made from it (they stay — each is that org's own),
 *  and the cascades still waiting on an org's decision. */
export function spreadOf(p: Pick<Priority, "id">, priorities: Pick<Priority, "parentId">[], assignments: Pick<PriorityAssignment, "priorityId" | "status" | "childPriorityId">[]): { adopted: number; customised: number; waiting: number } {
  const mine = assignments.filter((a) => a.priorityId === p.id);
  return {
    adopted: mine.filter((a) => a.status === "accepted" && a.childPriorityId === "").length,
    customised: priorities.filter((x) => x.parentId === p.id).length,
    waiting: mine.filter((a) => a.status === "proposed" || a.status === "onhold").length,
  };
}

/** How a declined proposal is kept: archived, with the reason marked. */
export const DECLINED_PREFIX = "Declined — ";
export function isDeclined(p: Pick<Priority, "status" | "statusReason">): boolean {
  return p.status === "archived" && p.statusReason.startsWith(DECLINED_PREFIX);
}

/**
 * May this viewer link an initiative to priority `p`? Only to a priority
 * at an org they manage, or one ADOPTED as-is at an org they manage (the
 * parent's row shown there). Upward linking ended 2026-11-06 — a priority
 * from above is pulled to the org first (issue round 2026-11-06, #2).
 * The ONE rule: the overlay's Add initiative, the form's picker and the
 * store's write all ask it.
 */
export function canLinkInitiative(
  viewer: Viewer,
  p: { id: string; org: OrgRef },
  owners: OrgOwnersMap,
  assignments: PriorityAssignment[]
): boolean {
  if (canManageOrg(viewer, p.org, owners)) return true;
  return assignments.some(
    (a) => a.priorityId === p.id && a.status === "accepted" && a.childPriorityId === "" && canManageOrg(viewer, a.org, owners)
  );
}

/** The links an edit ADDS that the rule refuses — links already on the
 *  initiative stay whatever the rule says (Ben, 2026-11-06: keep the
 *  existing upward links, block new ones). */
export function refusedNewLinks(before: string[], after: string[], may: (priorityId: string) => boolean): string[] {
  const had = new Set(before);
  return [...new Set(after)].filter((id) => !had.has(id) && !may(id));
}

/**
 * What an org may PULL from above (issue round 2026-11-06, #2): active
 * priorities at an org strictly above it (not peers), not already its
 * own child row or an accepted / pending assignment here. Ordered by
 * nearest org first.
 */
export function pullCandidates(org: OrgRef, all: Priority[], assignments: PriorityAssignment[]): Priority[] {
  const key = orgKey(org);
  const have = new Set<string>();
  for (const p of all) if (orgKey(p.org) === key && p.parentId !== "") have.add(p.parentId);
  for (const a of assignments) {
    if (orgKey(a.org) === key && (a.status === "accepted" || a.status === "proposed" || a.status === "onhold" || a.status === "completed")) have.add(a.priorityId);
  }
  const depth = (o: OrgRef) => LEVEL_DEPTH[orgLevel(o)];
  return all
    .filter((p) => p.status === "active" && isDescendant(org, p.org) && !have.has(p.id))
    .sort((a, b) => depth(b.org) - depth(a.org) || a.order - b.order || a.statement.localeCompare(b.statement));
}

export function canEditPillars(viewer: Viewer): boolean {
  return viewer.role === "superadmin";
}

// ---- the matrix (screen-shaped, still pure) ---------------------------------

// ---- pillars per year (issue 4, 2026-11-16) ------------------------------------

/** Every version of a pillar: the rows linked to `id` through
 *  `succeedsId`, in either direction, itself included. */
export function pillarVersions(id: string, pillars: Pillar[]): Pillar[] {
  const byId = new Map(pillars.map((p) => [p.id, p]));
  const seen = new Set<string>();
  const out: Pillar[] = [];
  const visit = (pid: string) => {
    if (pid === "" || seen.has(pid)) return;
    seen.add(pid);
    const p = byId.get(pid);
    if (!p) return;
    out.push(p);
    visit(p.succeedsId ?? "");
    for (const q of pillars) if ((q.succeedsId ?? "") === pid) visit(q.id);
  };
  visit(id);
  return out;
}

/** The sub-pillar a priority's OWN history puts it under in `year`: an
 *  earlier home recorded in `placements` ("up to and including `to` it
 *  sat under X") for the years it covers, otherwise its current home. */
export function placedIn(settings: PeriodSettings, p: Pick<Priority, "pillarId" | "placements">, year: string): string {
  if (year === "") return p.pillarId;
  const earlier = [...p.placements].sort((a, b) => comparePeriods(settings, a.to, b.to));
  for (const pl of earlier) if (comparePeriods(settings, year, pl.to) <= 0) return pl.pillarId;
  return p.pillarId;
}

/** The sub-pillar a priority sits under AS OF `year`.
 *  1. Its own history (`placedIn`).
 *  2. The pillar's history: when that row is not in force in the year,
 *     the version of it that is (a pillar renamed from a year is two
 *     rows; the priority follows whichever was live).
 *  The stored id is returned when no version is live — the caller's
 *  "unplaced" note then says so, and nothing silently disappears. */
export function pillarIdIn(settings: PeriodSettings, p: Pick<Priority, "pillarId" | "placements">, year: string, pillars: Pillar[]): string {
  const id = placedIn(settings, p, year);
  const own = pillars.find((x) => x.id === id);
  if (!own || year === "" || pillarLiveIn(settings, own, year)) return id;
  const live = pillarVersions(id, pillars).find((v) => pillarLiveIn(settings, v, year));
  return live ? live.id : id;
}

/** Move a priority to `toPillarId` FROM `year`: that year and every later
 *  one sit under the new sub-pillar; the years before keep the home they
 *  had. With no earlier year to keep it is a plain change of home. */
export function moveFrom(
  settings: PeriodSettings,
  p: Pick<Priority, "pillarId" | "placements">,
  year: string,
  toPillarId: string
): { pillarId: string; placements: PriorityPlacement[] } {
  const before = prevPeriod(settings, year);
  if (before === "") return { pillarId: toPillarId, placements: [] };
  const home = placedIn(settings, p, before);
  // what was recorded for the years before `before` stands; anything for
  // `year` onward is replaced by the new home
  const kept = p.placements.filter((pl) => comparePeriods(settings, pl.to, before) < 0).sort((a, b) => comparePeriods(settings, a.to, b.to));
  return { pillarId: toPillarId, placements: home === toPillarId ? kept : [...kept, { pillarId: home, to: before }] };
}

/** How many priorities sit under a pillar row in ANY year — its current
 *  home or an earlier one. A row that is referenced is ended, not deleted. */
export function pillarUse(pillarId: string, priorities: Pick<Priority, "pillarId" | "placements">[]): number {
  return priorities.filter((p) => p.pillarId === pillarId || p.placements.some((pl) => pl.pillarId === pillarId)).length;
}

/** Was this priority live in `year` as the year saw it — whatever has
 *  happened to it since? A past year is a record: a priority completed
 *  later still belongs on it. Proposals and declined proposals never. */
export function liveThen(settings: PeriodSettings, p: Priority, year: string): boolean {
  if (p.status === "proposed" || isDeclined(p)) return false;
  return priorityLiveIn(settings, p, year);
}

/** Priorities of an org's matrix grouped under each sub-pillar column;
 *  a priority whose pillar is not a shown column goes to `unplaced`
 *  (retired pillar / no pillar) so nothing silently disappears.
 *  `pillarOf` says which sub-pillar a priority sits under in the year
 *  being viewed (`pillarIdIn`); absent, its current home. */
export function groupByColumn(
  columns: Pillar[],
  priorities: Priority[],
  pillarOf: (p: Priority) => string = (p) => p.pillarId
): { byColumn: Map<string, Priority[]>; unplaced: Priority[] } {
  const byColumn = new Map<string, Priority[]>(columns.map((c) => [c.id, []]));
  const unplaced: Priority[] = [];
  for (const p of priorities) {
    const list = byColumn.get(pillarOf(p));
    if (list) list.push(p);
    else unplaced.push(p);
  }
  return { byColumn, unplaced };
}

export type Density = "comfortable" | "compact" | "scroll";

/** Design spec §14: ≤4 columns comfortable, 5–6 compact, 7+ scroll. */
export function densityFor(columns: number): Density {
  if (columns <= 4) return "comfortable";
  if (columns <= 6) return "compact";
  return "scroll";
}

/** The site palette KEY a RAG state paints with (defaults: good / atrisk
 *  / issue / neutral). Palettes are site-configured; never a hex here. */
export function ragPaletteKey(rag: Rag): string {
  switch (rag) {
    case "green":
      return "good";
    case "amber":
      return "atrisk";
    case "red":
      return "issue";
    default:
      return "neutral";
  }
}

/** Lineage glyph line copy (design spec §3): "↑ Pacific" · "↓ 3 areas" ·
 *  "↓ 2 areas · 1 pending" · "↓ 3 areas · 1 declined". */
export function lineageWords(l: LineageSummary, unit = "org"): string[] {
  const out: string[] = [];
  if (l.from) out.push(`↑ ${orgName(l.from)}`);
  if (l.sent > 0) {
    const noun = l.sent === 1 ? unit : `${unit}s`;
    let s = `↓ ${l.sent} ${noun}`;
    const tails: string[] = [];
    if (l.pending > 0) tails.push(`${l.pending} pending`);
    if (l.declined > 0) tails.push(`${l.declined} declined`);
    if (l.held > 0) tails.push(`${l.held} on hold`);
    if (tails.length > 0) s += ` · ${tails.join(" · ")}`;
    out.push(s);
  }
  return out;
}

// ---- lifecycle (P2) ----------------------------------------------------------------

/** "Why is this closing?" — the design's fixed picklist (§10). "Carried to
 *  next period" left with the carry-forward copies (2026-10-02): a
 *  priority now spans years instead. */
export const CLOSE_REASONS = ["Achieved", "Superseded", "No longer relevant"] as const;
export type CloseReason = (typeof CLOSE_REASONS)[number];

/** Children still active under a parent that has closed — the ones the
 *  "parent completed" prompt is for (§10). */
export function parentClosed(p: Priority, all: Priority[]): Priority | null {
  if (p.parentId === "" || p.status !== "active") return null;
  const parent = all.find((x) => x.id === p.parentId);
  // a proposed parent is not a closed one
  return parent && parent.status !== "active" && parent.status !== "proposed" ? parent : null;
}

/** Sender's-view flags for a priority: who declined or parked it, with
 *  their reason (§10 copy). */
export function senderFlags(
  p: Priority,
  assignments: PriorityAssignment[]
): { kind: "declined" | "parked"; org: OrgRef; reason: string }[] {
  return assignments
    .filter((a) => a.priorityId === p.id && (a.status === "rejected" || a.status === "onhold"))
    .map((a) => ({ kind: a.status === "rejected" ? ("declined" as const) : ("parked" as const), org: a.org, reason: a.reason }));
}

/** Everything waiting on an org's decision: proposed first, then parked. */
export function reviewQueue(org: OrgRef, assignments: PriorityAssignment[]): PriorityAssignment[] {
  const key = orgKey(org);
  const mine = assignments.filter((a) => orgKey(a.org) === key);
  return [...mine.filter((a) => a.status === "proposed"), ...mine.filter((a) => a.status === "onhold")];
}

// ---- the decision zone (2026-11-18) ------------------------------------------------
// One place at the foot of the page for what waits on this org: what was
// PROPOSED to it from below, what was CASCADED to it from above, and the
// priorities that have lost their column ("Other").

/** What waits at an org among its assignments, by where it came from. A
 *  direct report's as-is pull is a proposal — raised from below, decided
 *  by the owner or an admin — though it is stored as an assignment; a
 *  cascade is sent from above and any manager of the org may answer it.
 *  Each list: awaiting first, then on hold. */
export function waitingAt<A extends Pick<PriorityAssignment, "org" | "status" | "decidedById">>(org: OrgRef, assignments: A[]): { fromBelow: A[]; fromAbove: A[] } {
  const key = orgKey(org);
  const mine = assignments.filter((a) => orgKey(a.org) === key);
  const queue = [...mine.filter((a) => a.status === "proposed"), ...mine.filter((a) => a.status === "onhold")];
  return { fromBelow: queue.filter((a) => isPulledProposal(a)), fromAbove: queue.filter((a) => !isPulledProposal(a)) };
}

/** The priorities with NO column in the year shown: their sub-pillar is
 *  not among the year's live sub-pillars. Asked of the WHOLE year, never
 *  of the columns on screen — a pillar filter hides priorities, it does
 *  not orphan them (the old line counted both). */
export function orphansOf<P>(priorities: P[], colOf: (p: P) => string, liveInYear: Pick<Pillar, "id" | "level" | "active">[]): P[] {
  const columns = new Set(liveInYear.filter((x) => x.level === 2 && x.active).map((x) => x.id));
  return priorities.filter((p) => !columns.has(colOf(p)));
}

// ---- per-user presentation prefs (P3) -----------------------------------------------

export type ViewMode = "simple" | "dynamic";

export interface PriorityPrefs {
  /** orgKey → view mode (absent = simple). */
  viewByOrg: Record<string, ViewMode>;
  /** Last org visited (orgKey), restored on next open. */
  lastOrg: string;
  /** Retired 2026-11-17 with the strict / ratio roll-up; still parsed so
   *  an older stored pref reads cleanly. Nothing consults it. */
  rule: "strict" | "ratio";
  showOther: boolean;
  groupByPillar: boolean;
  /** Health-check score chips on the sub-pillar headers (off by default —
   *  Ben, 2026-11-01: the wall stays a wall unless asked). */
  showHealth: boolean;
}

/** A health chip older than this reads as stale (hollow): the score is
 *  history, not a current picture. */
export const HEALTH_CHIP_STALE_DAYS = 90;

export function healthChipStale(checkDate: string, todayIso: string): boolean {
  const a = Date.parse(checkDate);
  const b = Date.parse(todayIso);
  if (Number.isNaN(a) || Number.isNaN(b)) return false;
  return b - a > HEALTH_CHIP_STALE_DAYS * 86_400_000;
}

/** Reads the `priorities` key of the person's ben_preferences JSON (the
 *  hub's own keys ride at the top level and are ignored here). */
export function parsePriorityPrefs(raw: string): PriorityPrefs {
  const d: PriorityPrefs = { viewByOrg: {}, lastOrg: "", rule: "strict", showOther: false, groupByPillar: false, showHealth: false };
  try {
    const o = JSON.parse(raw || "{}") as { priorities?: unknown };
    const p = o && typeof o === "object" ? (o.priorities as Record<string, unknown> | undefined) : undefined;
    if (!p || typeof p !== "object") return d;
    const v = p.viewByOrg;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      for (const [k, m] of Object.entries(v as Record<string, unknown>)) {
        if (m === "simple" || m === "dynamic") d.viewByOrg[k] = m;
      }
    }
    if (typeof p.lastOrg === "string") d.lastOrg = p.lastOrg;
    if (p.rule === "ratio") d.rule = "ratio";
    d.showOther = p.showOther === true;
    d.groupByPillar = p.groupByPillar === true;
    d.showHealth = p.showHealth === true;
  } catch {
    /* defaults */
  }
  return d;
}

// ---- rotation focus (P4): meeting topic → pillars ------------------------------

/** `prTopicMap` — topic text → pillar / sub-pillar ids; "" = no topic. */
export type TopicMap = Record<string, string[]>;

export function parseTopicMap(raw: string): TopicMap {
  try {
    const o = JSON.parse(raw || "{}") as unknown;
    if (!o || typeof o !== "object" || Array.isArray(o)) return {};
    const out: TopicMap = {};
    for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
      if (Array.isArray(v)) out[k] = v.filter((x): x is string => typeof x === "string" && x !== "");
    }
    return out;
  } catch {
    return {};
  }
}

/** The pillar ids in focus for a topic (case/space-insensitive lookup;
 *  "" for occurrences without a topic). null = no focus → all pillars. */
export function focusForTopic(map: TopicMap, topic: string): string[] | null {
  const want = topic.trim().toLowerCase();
  for (const [k, ids] of Object.entries(map)) {
    if (k.trim().toLowerCase() === want) return ids.length > 0 ? ids : null;
  }
  return null;
}

// ---- per-site cascade settings: how far down customisation is allowed ---------

/** Customisation floor for a site: the deepest org level that may "Accept
 *  & customise" a cascaded priority. Below it, cascades are accepted as-is
 *  (adopted) only. Stored per site in the site row's ben_prioritysettings
 *  JSON as {customiseLevel}. Default = area (no restriction). */
export type CustomiseLevel = "site" | "department" | "area";

export interface SiteCascadeSettings {
  customiseLevel: CustomiseLevel;
}

export const DEFAULT_SITE_CASCADE: SiteCascadeSettings = { customiseLevel: "area" };

export function parseSiteCascadeSettings(raw: string): SiteCascadeSettings {
  try {
    const o = JSON.parse(raw || "{}") as { customiseLevel?: unknown };
    const v = o.customiseLevel;
    return { customiseLevel: v === "site" || v === "department" || v === "area" ? v : "area" };
  } catch {
    return { ...DEFAULT_SITE_CASCADE };
  }
}

export function serializeSiteCascadeSettings(s: SiteCascadeSettings): string {
  return s.customiseLevel === "area" ? "" : JSON.stringify({ customiseLevel: s.customiseLevel });
}

const LEVEL_DEPTH: Record<OrgLevel, number> = { company: 0, site: 1, department: 2, area: 3 };

/** May this org customise a cascade it receives, under its site's floor?
 *  Company and site always may; departments need a floor of department or
 *  area; areas need area. */
export function canCustomiseAt(org: OrgRef, floor: CustomiseLevel): boolean {
  return LEVEL_DEPTH[orgLevel(org)] <= LEVEL_DEPTH[floor];
}
