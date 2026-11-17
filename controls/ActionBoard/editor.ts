// The ActionBoard editor: one canonical action set rendered as a list or a
// kanban. The actions channel IS the data — no card document. Cancelled
// actions are hidden but preserved. Plain DOM; full re-render per mutation.

import { applyThemeVars, defaultTheme, Theme } from "../../shared/tokens";
import { LTK_BASE_CSS } from "../../shared/ui/baseCss";
import { clear, el, ensureStylesheet } from "../../shared/ui/dom";
import { parsePrompts, Prompts, renderGhost, renderTitleBar } from "../../shared/ui/chrome";
import { renderKebab } from "../../shared/ui/menu";
import {
  pdcaDisc, actionRow, completeCircle, openActionDialog, confidentialGlyph, commentGlyph, movedGlyph, partsChip, supportFlag } from "../../shared/ui/actionUi";
import { makeInteractive } from "../../shared/interact/drag";
import { htmlToPng, htmlToSvg, saveSvg, SnapshotScheduler } from "../../shared/export/png";
import { assigneesLabel, pdcaOf, ActionStatus, isOverdue, LtkAction, newAction, partsTitle, RECENT_DONE_DAYS, recentlyDone, supportLabel } from "../../shared/schema/actions";
import { todayIso } from "../../shared/schema/id";
import { applyEndorsementRule } from "../../shared/schema/actionEndorsement";
import { endorsementFor } from "../../shared/ui/actionLinkProvider";
import { Person } from "../../shared/schema/people";
import { ACTIONBOARD_CSS } from "./styles";

export type BoardView = "list" | "kanban" | "gantt";

/** Below this many CSS pixels of the card's OWN width (the pane rule —
 *  a tile, a phone, a split) the kanban and the Gantt have no room:
 *  the card shows its list and says so (mobile review M4, 2026-10-07). */
export const ACTIONBOARD_NARROW_MAX = 480;
/** Below this width the Gantt's fixed 480 px label block leaves the plot
 *  almost nothing: the Gantt falls back to the list and says so, while
 *  the kanban still fits (card-responsiveness-review-2026-10-30, R4). */
export const ACTIONBOARD_GANTT_MIN = 760;

/** The view to render: the list when narrow, else the person's choice
 *  over the card's configured default — the Gantt only with room for
 *  it. Pure — the person's choice is kept, so a desktop gets it back. */
export function viewFor(narrow: boolean, userView: BoardView | null, configured: BoardView, ganttRoom = true): BoardView {
  const v = narrow ? "list" : (userView ?? configured);
  return v === "gantt" && !ganttRoom ? "list" : v;
}
export type KanbanGroupBy = "status" | "issue";

/**
 * The configured kanban columns, from a JSON array or comma-separated text
 * (CardSettings stores chip fields either way). Blank entries are dropped and
 * duplicates collapse, since each column has to be a distinct drop target.
 */
export function parseKanbanColumns(raw: string | null | undefined): string[] {
  const t = (raw ?? "").trim();
  if (t === "") return [];
  let items: unknown[];
  if (t.startsWith("[")) {
    try {
      const arr = JSON.parse(t) as unknown;
      items = Array.isArray(arr) ? arr : [];
    } catch {
      items = t.split(",");
    }
  } else {
    items = t.split(",");
  }
  const out: string[] = [];
  for (const item of items) {
    const label = String(item ?? "").trim();
    if (label === "") continue;
    if (out.some((x) => x.toLowerCase() === label.toLowerCase())) continue;
    out.push(label);
  }
  return out;
}

/** Day number of a yyyy-mm-dd date (UTC, so arithmetic is DST-proof). */
function dayNum(iso: string): number {
  return Math.floor(Date.parse(iso + "T00:00:00Z") / 86400000);
}

function dayLabel(day: number): string {
  const d = new Date(day * 86400000);
  return `${d.getUTCDate()} ${d.toLocaleDateString(undefined, {
    month: "short",
    timeZone: "UTC",
  })}`;
}

const GANTT_ROW_H = 40;
const GANTT_HEAD_H = 28;
const GANTT_MIN_DAY_W = 8;
const GANTT_MAX_DAY_W = 56;

const STATUS_COLUMNS: { status: ActionStatus; label: string }[] = [
  { status: "open", label: "Open" },
  { status: "in-progress", label: "In progress" },
  { status: "done", label: "Done" },
];

const DEFAULT_GHOST = [
  "No actions yet",
  "Capture who will do what by when — actions raised in other cards land here too.",
];

export interface ActionBoardCallbacks {
  onChange: (actions: LtkAction[]) => void;
  onSnapshot?: (svgMarkup: string) => void;
}

/** Where the host's Gantt was left: its range (weeks, or "all") and the
 *  day it is centred on (null = where it opens by itself). */
export type GanttWindowState = { range: number | "all"; anchor: string | null };

/** The host's Gantt: mount into `host`, return the teardown. */
export type GanttRenderer = (
  host: HTMLElement,
  ctx: {
    /** the actions as the card shows them (completed already hidden when the toggle is off) */
    actions: LtkAction[];
    readOnly: boolean;
    actor: { whoId: string; who: string };
    onChanged: () => void;
    /** the card's own Show completed state — the Gantt follows it, no toggle of its own */
    showCompleted: boolean;
    /** open the action's dialog (absent when read-only) */
    onEdit?: (a: LtkAction) => void;
    /** the kanban's columns when it groups by issue — the Gantt groups its rows the same way (Ben, 2026-10-31) */
    groups?: { key: string; label: string; items: LtkAction[] }[];
    /** a slot in the card's tools row, left of Add action: the Gantt's
     *  range controls go here, not on a row of their own (Ben, 2026-11-12) */
    toolbar?: HTMLElement;
    /** where this card's Gantt was left, and the way to say it moved —
     *  the card repaints (and the Gantt remounts) after every edit */
    window?: GanttWindowState | null;
    onWindow?: (w: GanttWindowState) => void;
    /** the card filters by assignee itself (its tools row carries the
     *  select): the Gantt shows what it is handed and no select of its own */
    hideAssignee?: boolean;
  }
) => () => void;

/** Where an action sits when the card shows several homes at once (the
 *  priority popup: one section per initiative). */
export interface ActionSection {
  key: string;
  label: string;
}

/** The people a list of actions is assigned to, by name — the options of
 *  the card's assignee filter. Pure. */
export function assigneeOptions(actions: LtkAction[]): { whoId: string; who: string }[] {
  const people = new Map<string, string>();
  for (const a of actions) for (const x of a.assignees) if (x.whoId !== "") people.set(x.whoId, x.who);
  return [...people.entries()].map(([whoId, who]) => ({ whoId, who })).sort((a, b) => a.who.localeCompare(b.who));
}

/** Actions under their sections, in the sections' label order; actions
 *  with no section last, under "". Pure. */
export function sectioned(actions: LtkAction[], sectionOf: (a: LtkAction) => ActionSection | null): { key: string; label: string; items: LtkAction[] }[] {
  const groups = new Map<string, { key: string; label: string; items: LtkAction[] }>();
  for (const a of actions) {
    const sec = sectionOf(a) ?? { key: "", label: "" };
    const g = groups.get(sec.key) ?? { key: sec.key, label: sec.label, items: [] };
    g.items.push(a);
    groups.set(sec.key, g);
  }
  return [...groups.values()].sort((a, b) => (a.key === "" ? 1 : b.key === "" ? -1 : a.label.localeCompare(b.label)));
}

/** The card's actions as a view shows them: cancelled never; completed
 *  for `recentDays` after they close (issue 2, 2026-11-17 — until then
 *  every view hid them at once, Ben 2026-10-31), and ALL of them when
 *  asked. "verify" is still open work — awaiting its endorser. */
export function visibleActions(actions: LtkAction[], showAllCompleted: boolean, recentDays = 0, today = todayIso()): LtkAction[] {
  return actions.filter((a) => a.status !== "cancelled" && (a.status !== "done" || showAllCompleted || recentlyDone(a, recentDays, today)));
}

export class ActionBoardEditor {
  private readonly root: HTMLElement;
  private actions: LtkAction[] = [];
  private theme: Theme = defaultTheme();
  private people: Person[] = [];
  private linkTargets: { key: string; label: string }[] = [];
  private cardTitle = "";
  private prompts: Prompts = { general: [], fields: {} };
  private lastPromptsRaw: string | null = null;
  private readOnly = false;
  private view: BoardView = "list";
  private groupBy: KanbanGroupBy = "status";
  private verifyColumn = false;
  /** Where an action raised here lands unless the dialog says otherwise. */
  private defaultLink = "";
  /** What the link targets are, for the dialog's caption ("" = cards). */
  private linkLabel = "";
  /** The view the PERSON chose on the card's own switch; null = the
   *  card's configured default (2026-09-30). */
  private userView: BoardView | null = null;
  /** Show ALL completed — off on every view until the person switches
   *  it (per card, for the session). Off, the recently completed still
   *  show (`recentDays`). */
  private showCompleted = false;
  /** How many days a completed action stays in view (the card's
   *  setting; 0 = it leaves at once). */
  private recentDays = RECENT_DONE_DAYS;
  private onViewChosen: ((view: BoardView) => void) | null = null;
  /** The host's Gantt (the app's — one Gantt everywhere); absent, the
   *  card draws its own. */
  private ganttRenderer: GanttRenderer | null = null;
  private ganttTeardown: (() => void) | null = null;
  private ganttWindowState: GanttWindowState | null = null;
  /** Sections (the priority popup, 2026-11-16): List rows under a heading
   *  per section, kanban cards tagged with theirs. null = one flat card. */
  private sectionOf: ((a: LtkAction) => ActionSection | null) | null = null;
  /** The tools row carries an assignee filter for every view. */
  private assigneeFilter = false;
  private assignee = "";
  /** The signed-in viewer — stamps verifications ("" = unknown). */
  private actor: { whoId: string; who: string } = { whoId: "", who: "" };
  /** Configured "by issue" columns; empty = discovered from the actions. */
  private fixedColumns: string[] = [];
  private readonly snapshots: SnapshotScheduler;
  /** Narrow (M4): the list, whatever was chosen — see viewFor. */
  private narrow = false;
  /** Under ACTIONBOARD_GANTT_MIN of the card's own width (R4). */
  private tight = false;
  private resizeObserver: ResizeObserver | null = null;

  // gantt state (transient): zoom level and the scroll position to restore
  // after a zoom re-render
  private ganttDayW = 24;
  private ganttScrollFrac: number | null = null;
  // one-shot: fit the day-width to [today … latest] and start the view at
  // today. Armed on first render and whenever the gantt view is (re)entered,
  // then consumed once the plot has been measured.
  private ganttAutoFit = true;
  // day pinned to the left edge (today after an auto-fit). Re-applied on every
  // gantt render so a host re-render can't lose it; cleared once the user
  // scrolls away or zooms.
  private ganttViewStart: number | null = null;

  // drag state (kanban): ghost follows pointer, columns are drop zones
  private ghost: HTMLElement | null = null;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private dropZones: { el: HTMLElement; key: string }[] = [];
  private currentDrop: string | undefined;

  constructor(
    host: HTMLElement,
    private readonly cb: ActionBoardCallbacks
  ) {
    ensureStylesheet("ltk-base-css", LTK_BASE_CSS);
    ensureStylesheet("ltk-actionboard-css", ACTIONBOARD_CSS);
    this.root = el("div", "ltk-root");
    host.appendChild(this.root);
    this.snapshots = new SnapshotScheduler(() => this.generateSnapshot());
    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(() => this.measure());
      this.resizeObserver.observe(this.root);
    }
    this.render();
  }

  /** The width call: a flip re-renders (the list in, the switch out). */
  private measure(): void {
    const w = this.root.clientWidth;
    const want = w > 0 && w < ACTIONBOARD_NARROW_MAX;
    const tight = w > 0 && w < ACTIONBOARD_GANTT_MIN;
    if (want !== this.narrow || tight !== this.tight) {
      this.narrow = want;
      this.tight = tight;
      this.render();
    }
  }

  // ---- host-facing API (setters no-op when unchanged) ----

  setActions(actions: LtkAction[]): void {
    this.actions = actions;
    this.render();
    this.snapshots.schedule();
  }

  setTheme(theme: Theme): void {
    if (JSON.stringify(theme) === JSON.stringify(this.theme)) return;
    this.theme = theme;
    this.render();
  }

  setPeople(people: Person[]): void {
    this.people = people;
  }

  setChrome(cardTitle: string, promptsRaw: string): void {
    if (cardTitle === this.cardTitle && promptsRaw === this.lastPromptsRaw) {
      return;
    }
    this.cardTitle = cardTitle;
    this.lastPromptsRaw = promptsRaw;
    this.prompts = parsePrompts(promptsRaw);
    this.render();
  }

  /** Board cards an action may be (re)linked to (Ben, 2026-08-31) —
   *  handed to the raise/edit dialogs as the "Linked card" select. */
  /** The view the person last chose for this card, and where to tell the
   *  host when they choose another. */
  setUserView(view: BoardView | null, onChosen?: (view: BoardView) => void): void {
    this.onViewChosen = onChosen ?? null;
    if (this.userView === view) return;
    if (view === "gantt") this.ganttAutoFit = true;
    this.userView = view;
    this.render();
  }

  /** Show several homes on one card: `sectionOf` names an action's. */
  setSections(sectionOf: ((a: LtkAction) => ActionSection | null) | null): void {
    this.sectionOf = sectionOf;
    this.render();
  }

  /** Offer "All assignees ▾" in the tools row (every view). */
  setAssigneeFilter(on: boolean): void {
    if (this.assigneeFilter === on) return;
    this.assigneeFilter = on;
    if (!on) this.assignee = "";
    this.render();
  }

  /** Hand the Gantt view to the host's own Gantt component. */
  setGanttRenderer(renderer: GanttRenderer | null): void {
    this.ganttRenderer = renderer;
    if (this.currentView() === "gantt") this.render();
  }

  private currentView(): BoardView {
    return viewFor(this.narrow, this.userView, this.view, !this.tight);
  }

  setLinkTargets(targets: { key: string; label: string }[], defaultKey = "", label = ""): void {
    this.linkTargets = targets;
    this.defaultLink = defaultKey;
    this.linkLabel = label;
  }

  setActor(actor: { whoId: string; who: string }): void {
    this.actor = actor;
  }

  setReadOnly(ro: boolean): void {
    if (this.readOnly !== ro) {
      this.readOnly = ro;
      this.render();
    }
  }

  setOptions(opts: {
    view: BoardView;
    groupBy: KanbanGroupBy;
    /** Fixed "by issue" columns; empty = whatever issues the actions have. */
    columns?: string[];
    /** Initiative boards (design 2.4): a fourth kanban column, Verify —
     *  done work awaiting the owner; moving Verify → Done stamps who
     *  verified. */
    verifyColumn?: boolean;
  }): void {
    const cols = opts.columns ?? [];
    if (
      this.view === opts.view &&
      this.groupBy === opts.groupBy &&
      this.verifyColumn === (opts.verifyColumn === true) &&
      JSON.stringify(cols) === JSON.stringify(this.fixedColumns)
    ) {
      return;
    }
    this.verifyColumn = opts.verifyColumn === true;
    // re-fit the gantt whenever it is (re)entered
    if (opts.view === "gantt" && this.view !== "gantt") this.ganttAutoFit = true;
    this.view = opts.view;
    this.groupBy = opts.groupBy;
    this.fixedColumns = cols;
    this.render();
  }

  /** How many days a completed action stays in view before it needs
   *  "Show all completed" (the card's setting; 0 = none stay). */
  setRecentDays(days: number): void {
    const d = Number.isFinite(days) ? Math.max(0, Math.min(365, Math.round(days))) : RECENT_DONE_DAYS;
    if (d === this.recentDays) return;
    this.recentDays = d;
    this.render();
  }

  destroy(): void {
    this.resizeObserver?.disconnect();
    this.snapshots.cancel();
    this.ganttTeardown?.();
    this.ganttTeardown = null;
    this.root.remove();
  }

  // ---- theming ----

  private doneColor(): string {
    return this.theme.legend[1] ?? "#107c10";
  }

  private openColor(): string {
    return this.theme.legend[0] ?? "#f2c811";
  }

  private overdueColor(): string {
    return this.theme.legend[2] ?? "#d13438";
  }

  // ---- rendering ----

  private visible(): LtkAction[] {
    const shown = visibleActions(this.actions, this.showCompleted, this.recentDays);
    return this.assignee === "" ? shown : shown.filter((a) => a.assignees.some((x) => x.whoId === this.assignee));
  }

  /** "All assignees ▾" — the people the card's actions are assigned to. */
  private assigneeSelect(): HTMLElement | null {
    if (!this.assigneeFilter) return null;
    const people = assigneeOptions(visibleActions(this.actions, this.showCompleted, this.recentDays));
    // someone filtered on whose last action just closed: back to everyone
    if (this.assignee !== "" && !people.some((p) => p.whoId === this.assignee)) this.assignee = "";
    if (people.length === 0) return null;
    const sel = el("select", "ltk-ab-assignee") as HTMLSelectElement;
    sel.setAttribute("aria-label", "Assigned to");
    const all = el("option", undefined, "All assignees") as HTMLOptionElement;
    all.value = "";
    sel.appendChild(all);
    for (const p of people) {
      const o = el("option", undefined, p.who) as HTMLOptionElement;
      o.value = p.whoId;
      sel.appendChild(o);
    }
    sel.value = this.assignee;
    sel.addEventListener("change", () => {
      this.assignee = sel.value;
      this.render();
    });
    return sel;
  }

  /** The kebab is pinned over the body (no title bar to hold it). */
  private kebabFloats = false;

  /** Completed actions NOT in view: the older ones, while the switch is off. */
  private hiddenDone(): number {
    return this.showCompleted ? 0 : this.actions.filter((a) => a.status === "done" && !recentlyDone(a, this.recentDays)).length;
  }

  /** The "Show all completed" switch (every view). The recently
   *  completed show without it (issue 2, 2026-11-17). */
  private completedToggle(): HTMLElement {
    const hidden = this.hiddenDone();
    const b = el("button", "ltk-ab-toggle" + (this.showCompleted ? " ltk-ab-toggle-on" : "")) as HTMLButtonElement;
    b.type = "button";
    b.setAttribute("role", "switch");
    b.setAttribute("aria-checked", String(this.showCompleted));
    const window = this.recentDays > 0 ? `Actions completed in the last ${this.recentDays} day${this.recentDays === 1 ? "" : "s"} show without this.` : "Completed actions show only with this on.";
    b.title = this.showCompleted ? `Show only the recently completed again. ${window}` : `Show every completed action, however old. ${window}`;
    b.append(el("span", "ltk-ab-toggle-knob"), el("span", "ltk-ab-toggle-label", `Show all completed${hidden > 0 ? ` (${hidden})` : ""}`));
    b.addEventListener("click", () => {
      this.showCompleted = !this.showCompleted;
      this.render();
    });
    return b;
  }

  /**
   * Completed actions drop below open ones; within each group, earliest due
   * date first with undated actions last (then by start, issue).
   */
  private sorted(list: LtkAction[]): LtkAction[] {
    return list.slice().sort((a, b) => {
      const doneA = a.status === "done" ? 1 : 0;
      const doneB = b.status === "done" ? 1 : 0;
      if (doneA !== doneB) return doneA - doneB;
      const dueA = a.due === "" ? "9999" : a.due;
      const dueB = b.due === "" ? "9999" : b.due;
      if (dueA !== dueB) return dueA < dueB ? -1 : 1;
      const startA = a.start === "" ? "9999" : a.start;
      const startB = b.start === "" ? "9999" : b.start;
      if (startA !== startB) return startA < startB ? -1 : 1;
      return a.issue < b.issue ? -1 : 1;
    });
  }

  /** Keep any open dialog alive across re-renders. */
  private render(): void {
    const overlays = Array.from(this.root.children).filter((c) =>
      c.classList.contains("ltk-dialog-overlay")
    );
    this.renderBody();
    for (const o of overlays) this.root.appendChild(o);
  }

  private renderBody(): void {
    // the host's Gantt owns listeners of its own — let it go first
    this.ganttTeardown?.();
    this.ganttTeardown = null;
    clear(this.root);
    this.dropZones = [];
    applyThemeVars(this.root, this.theme);

    // no bar (an untitled card) pins the kebab over the body's top
    // right corner — the tools row then keeps clear of it
    this.kebabFloats = renderTitleBar(this.root, this.cardTitle, this.prompts) === null && !this.readOnly;
    if (!this.readOnly) {
      renderKebab(this.root, [
        { label: "Download PNG", onClick: () => this.downloadPng() },
        { label: "Download SVG", onClick: () => this.downloadSvg() },
      ]);
    }

    const body = el("div", "ltk-ab-body");
    this.root.appendChild(body);

    const visible = this.visible();
    if (visible.length === 0 && this.assignee !== "") {
      // the filter emptied the card: keep the row that undoes it
      const tools = this.toolsRow();
      tools.appendChild(this.completedToggle());
      const sel = this.assigneeSelect();
      if (sel) tools.appendChild(sel);
      if (!this.readOnly) tools.appendChild(this.addButton());
      body.appendChild(tools);
      body.appendChild(el("div", "ltk-ab-narrownote", "No actions for this person"));
      return;
    }
    if (visible.length === 0 && this.hiddenDone() > 0) {
      // every action is complete and hidden: say so, offer the switch
      const tools = this.toolsRow();
      tools.appendChild(this.completedToggle());
      if (!this.readOnly) tools.appendChild(this.addButton());
      body.appendChild(tools);
      body.appendChild(el("div", "ltk-ab-narrownote", `All ${this.hiddenDone()} actions are complete`));
      return;
    }
    if (visible.length === 0) {
      const lines = this.prompts.general.length
        ? this.prompts.general
        : DEFAULT_GHOST;
      const ghost = renderGhost(
        body,
        this.readOnly ? lines : [...lines, "Tap to add an action"]
      );
      if (!this.readOnly) {
        ghost.addEventListener("click", () => this.addAction());
      }
      return;
    }

    // the person's own switch between the three views; the card's
    // configured view is where it starts
    const view = this.currentView();
    if (this.narrow) {
      // no switch: the kanban and the Gantt need a desktop's width, and
      // the card says so rather than offering views that cannot fit
      body.appendChild(el("div", "ltk-ab-narrownote", "Board and Gantt views open on a desktop"));
    } else if (this.tight && (this.userView ?? this.view) === "gantt") {
      // the Gantt was asked for but the card is too tight for its plot:
      // the list stands in and the card says why (R4)
      body.appendChild(el("div", "ltk-ab-narrownote", "The Gantt opens when the card is wider — showing the list"));
    }
    const views = el("div", "ltk-ab-views");
    views.setAttribute("role", "group");
    views.setAttribute("aria-label", "View");
    for (const [v, label] of this.narrow ? [] : ([["list", "List"], ["kanban", "Kanban"], ["gantt", "Gantt"]] as [BoardView, string][])) {
      const b = el("button", "ltk-ab-viewbtn" + (v === view ? " ltk-ab-viewbtn-on" : ""), label) as HTMLButtonElement;
      b.type = "button";
      b.setAttribute("aria-pressed", v === view ? "true" : "false");
      if (v === this.view) b.title = "This card's default view";
      b.addEventListener("click", () => {
        if (v === this.currentView()) return;
        if (v === "gantt") this.ganttAutoFit = true;
        this.userView = v;
        this.onViewChosen?.(v);
        this.render();
      });
      views.appendChild(b);
    }
    // the view switch and the Show completed switch share one row, and
    // Add action closes it at the top right (Ben, 2026-11-11: under a
    // long list it had to be scrolled to)
    const tools = this.toolsRow();
    if (!this.narrow) tools.appendChild(views);
    tools.appendChild(this.completedToggle());
    const whoSel = this.assigneeSelect();
    if (whoSel) tools.appendChild(whoSel);
    // the host's Gantt puts its range controls in this slot, so they
    // share the row with Add action instead of sitting under it
    const ganttSlot = view === "gantt" && this.ganttRenderer ? el("div", "ltk-ab-toolslot") : null;
    if (ganttSlot) {
      tools.classList.add("ltk-ab-tools-slot");
      tools.appendChild(ganttSlot);
    }
    if (!this.readOnly) tools.appendChild(this.addButton());
    body.appendChild(tools);

    if (view === "kanban") {
      body.appendChild(this.renderKanban(visible));
    } else if (view === "gantt") {
      if (this.ganttRenderer) {
        const host = el("div", "ltk-ab-ganttx");
        body.appendChild(host);
        // the kanban's columns group the Gantt too (Ben, 2026-10-31)
        const groups = this.groupBy === "issue" ? this.columns(visible).filter((c) => c.items.length > 0) : undefined;
        this.ganttTeardown = this.ganttRenderer(host, {
          actions: visible,
          readOnly: this.readOnly,
          actor: this.actor,
          // the host's Gantt writes a date change itself — nothing to
          // re-send; the shared objects already carry the new dates
          onChanged: () => undefined,
          // the card has already chosen what shows (the recently
          // completed included) — the Gantt must not hide them again
          showCompleted: this.showCompleted || visible.some((a) => a.status === "done"),
          onEdit: this.readOnly ? undefined : (a) => this.editAction(a),
          groups,
          toolbar: ganttSlot ?? undefined,
          window: this.ganttWindowState,
          onWindow: (w) => {
            this.ganttWindowState = w;
          },
          hideAssignee: this.assigneeFilter,
        });
      } else {
        body.appendChild(this.renderGantt(visible));
      }
    } else {
      body.appendChild(this.renderList(visible));
    }
  }

  private toolsRow(): HTMLElement {
    return el("div", "ltk-ab-tools" + (this.kebabFloats ? " ltk-ab-tools-kebab" : ""));
  }

  /** "＋ Add action" — the tools row's last item, pushed to its right. */
  private addButton(): HTMLElement {
    const add = el("button", "ltk-ab-add", "＋ Add action") as HTMLButtonElement;
    add.type = "button";
    add.addEventListener("click", () => this.addAction());
    return add;
  }

  private renderList(visible: LtkAction[]): HTMLElement {
    const list = el("div", "ltk-ab-list");
    const rows = (items: LtkAction[]) => {
      for (const a of this.sorted(items)) {
        list.appendChild(
          actionRow(a, {
            doneColor: this.doneColor(),
            showPdca: true,
            showIssue: true,
            readOnly: this.readOnly,
            onChanged: () => this.commit(),
            onEdit: (act) => this.editAction(act),
          })
        );
      }
    };
    if (this.sectionOf === null) {
      rows(visible);
      return list;
    }
    for (const g of sectioned(visible, this.sectionOf)) {
      if (g.label !== "") list.appendChild(el("div", "ltk-ab-section", `${g.label} · ${g.items.length}`));
      rows(g.items);
    }
    return list;
  }

  // ---- kanban ----

  private columns(visible: LtkAction[]): { key: string; label: string; items: LtkAction[] }[] {
    if (this.groupBy === "status") {
      // initiative boards get the fourth column (design 2.4); elsewhere
      // "verify" keeps showing in Done with its marker
      const defs = this.verifyColumn
        ? ([
            { status: "open", label: "To do" },
            { status: "in-progress", label: "Doing" },
            { status: "verify", label: "Verify" },
            { status: "done", label: "Done" },
          ] as { status: ActionStatus; label: string }[])
        : STATUS_COLUMNS;
      return defs.map((c) => ({
        key: c.status,
        label: c.label,
        items: visible.filter(
          (a) => a.status === c.status || (!this.verifyColumn && c.status === "done" && a.status === "verify")
        ),
      }));
    }
    // configured columns: exactly these, in this order, ALWAYS shown — an
    // empty swim lane is information ("nothing in Safety this week"), and a
    // column that came and went as actions were added would be unusable as a
    // drop target. Matching is case-insensitive so a typed issue still lands.
    if (this.fixedColumns.length > 0) {
      const norm = (s: string) => s.trim().toLowerCase();
      const cols = this.fixedColumns.map((label) => ({
        key: label,
        label,
        items: visible.filter((a) => norm(a.issue) === norm(label)),
      }));
      // anything that matches no column still has to be reachable
      const known = new Set(this.fixedColumns.map(norm));
      const rest = visible.filter((a) => !known.has(norm(a.issue)));
      if (rest.length > 0) cols.push({ key: "", label: "Other", items: rest });
      return cols;
    }
    // by issue: preserve first-seen order, empty issue last
    const keys: string[] = [];
    for (const a of visible) {
      const k = a.issue.trim();
      if (k !== "" && !keys.includes(k)) keys.push(k);
    }
    const cols = keys.map((k) => ({
      key: k,
      label: k,
      items: visible.filter((a) => a.issue.trim() === k),
    }));
    const blank = visible.filter((a) => a.issue.trim() === "");
    if (blank.length > 0) {
      cols.push({ key: "", label: "(No issue)", items: blank });
    }
    return cols;
  }

  private renderKanban(visible: LtkAction[]): HTMLElement {
    const board = el("div", "ltk-ab-kanban");
    for (const col of this.columns(visible)) {
      const colEl = el("div", "ltk-ab-col");
      const title = el("div", "ltk-ab-col-title");
      title.appendChild(el("span", "ltk-ab-col-name", col.label));
      title.appendChild(el("span", "ltk-ab-col-count", String(col.items.length)));
      if (!this.readOnly) {
        // straight into THIS column (2026-09-30)
        const add = el("button", "ltk-ab-col-add", "＋") as HTMLButtonElement;
        add.type = "button";
        add.title = `Add an action to ${col.label}`;
        add.setAttribute("aria-label", add.title);
        add.addEventListener("click", () => this.addAction(col.key));
        title.appendChild(add);
      }
      colEl.appendChild(title);
      const cards = el("div", "ltk-ab-cards");
      for (const a of this.sorted(col.items)) {
        cards.appendChild(this.renderKanbanCard(a));
      }
      if (this.groupBy === "status" && col.key === "done" && this.hiddenDone() > 0) {
        // the column stays as the drop target; the note says what it
        // holds beyond the recently completed
        const note = el("button", "ltk-ab-col-hidden", `${this.hiddenDone()} older completed hidden`) as HTMLButtonElement;
        note.type = "button";
        note.title = "Show all completed actions";
        note.addEventListener("click", () => {
          this.showCompleted = true;
          this.render();
        });
        cards.appendChild(note);
      }
      colEl.appendChild(cards);
      board.appendChild(colEl);
      this.dropZones.push({ el: colEl, key: col.key });
    }
    return board;
  }

  private renderKanbanCard(a: LtkAction): HTMLElement {
    const card = el("div", "ltk-ab-card");
    if (this.readOnly) card.classList.add("ltk-readonly");
    // left edge colour signals state (inline for Safari)
    const edge =
      a.status === "done"
        ? this.doneColor()
        : isOverdue(a)
          ? this.overdueColor()
          : this.openColor();
    card.style.borderLeftColor = edge;

    // top row: complete circle beside the issue tag (or standing alone)
    const head = el("div", "ltk-ab-card-head");
    const circle = completeCircle(a, this.doneColor(), () => this.commit(), this.readOnly);
    head.appendChild(circle);
    head.appendChild(pdcaDisc(pdcaOf(a), 16));
    const lock = confidentialGlyph(a);
    if (lock) head.appendChild(lock);
    const moved = movedGlyph(a);
    if (moved) head.appendChild(moved);
    const said = commentGlyph(a);
    if (said) head.appendChild(said);
    if (this.groupBy !== "issue" && a.issue.trim() !== "") {
      head.appendChild(el("div", "ltk-ab-card-issue", a.issue));
    }
    card.appendChild(head);
    // which home it belongs to, when the card shows several
    const sec = this.sectionOf?.(a) ?? null;
    if (sec && sec.label !== "") {
      const tag = el("div", "ltk-ab-card-tag", sec.label);
      tag.title = sec.label;
      card.appendChild(tag);
    }

    const desc = el(
      "div",
      "ltk-ab-card-desc" + (a.status === "done" ? " ltk-ab-done" : ""),
      a.description || a.issue
    );
    card.appendChild(desc);

    const meta = el("div", "ltk-ab-card-meta");
    const whoEl = el("span", undefined, assigneesLabel(a, "Unassigned"));
    meta.appendChild(whoEl);
    // a shared action: how many parts are done, who is still to do it
    const parts = partsChip(a);
    if (parts) meta.appendChild(parts);
    // supporters: a count on the card, the names in its tooltip
    const support = supportLabel(a);
    if (support !== "") {
      const sup = el("span", "ltk-ab-support", `＋${(a.supporters ?? []).length}`);
      sup.title = support;
      meta.appendChild(sup);
    }
    if (a.status === "verify") {
      const verify = el("span", "ltk-ab-verify", "◐");
      verify.title = "Awaiting endorsement";
      verify.appendChild(el("span", "ltk-ab-verify-words", " awaiting endorsement"));
      meta.appendChild(verify);
    }
    if (a.due !== "") {
      const dueEl = el("span", undefined, `Due ${a.due}`);
      if (isOverdue(a)) dueEl.style.color = this.overdueColor();
      if (a.escalated) {
        dueEl.appendChild(supportFlag());
      }
      meta.appendChild(dueEl);
    } else if (a.escalated) {
      whoEl.appendChild(supportFlag());
    }
    card.appendChild(meta);

    if (!this.readOnly) this.attachDrag(card, a);
    return card;
  }

  // ---- gantt ----

  /**
   * Time-axis view. Fixed left columns (Issue/Action, Who, Dates) beside a
   * horizontally scrollable, zoomable plot: bars run start→due (a single-day
   * bar when only one date is set), coloured by state, with a today marker.
   * Zoom via the −/＋ buttons or Ctrl/Cmd + wheel; tap a row to edit.
   */
  private renderGantt(visible: LtkAction[]): HTMLElement {
    const wrap = el("div", "ltk-ab-gantt");
    const dated = visible.filter((a) => a.due !== "" || a.start !== "");
    const undated = visible.filter((a) => a.due === "" && a.start === "");

    if (dated.length === 0) {
      wrap.appendChild(
        el(
          "div",
          "ltk-ab-g-empty",
          "No dated actions yet — add a start or due date to plot them here."
        )
      );
    } else {
      const dayW = this.ganttDayW;
      const today = dayNum(new Date().toISOString().slice(0, 10));
      const startOf = (a: LtkAction) => dayNum(a.start !== "" ? a.start : a.due);
      const endOf = (a: LtkAction) => dayNum(a.due !== "" ? a.due : a.start);
      let minDay = Math.min(today, ...dated.map(startOf));
      let maxDay = Math.max(today, ...dated.map(endOf));
      minDay -= 2;
      maxDay += 2;
      const days = maxDay - minDay + 1;
      const plotW = days * dayW;
      const sorted = dated
        .slice()
        .sort((a, b) => startOf(a) - startOf(b) || endOf(a) - endOf(b));

      const scroller = el("div", "ltk-ab-g-scroll");
      const zoom = (mult: number, focusFrac?: number) => {
        this.ganttViewStart = null; // manual zoom takes over from the today-pin
        this.ganttScrollFrac =
          focusFrac ??
          (scroller.scrollLeft + scroller.clientWidth / 2) /
            Math.max(1, scroller.scrollWidth);
        this.ganttDayW = Math.max(
          GANTT_MIN_DAY_W,
          Math.min(GANTT_MAX_DAY_W, Math.round(this.ganttDayW * mult))
        );
        this.render();
      };

      // zoom controls
      const zoomBar = el("div", "ltk-ab-g-zoom");
      const zOut = el("button", "ltk-ab-g-zbtn", "−");
      zOut.type = "button";
      zOut.title = "Zoom out";
      zOut.addEventListener("click", () => zoom(0.75));
      const zIn = el("button", "ltk-ab-g-zbtn", "＋");
      zIn.type = "button";
      zIn.title = "Zoom in";
      zIn.addEventListener("click", () => zoom(1.33));
      zoomBar.append(zOut, zIn);
      wrap.appendChild(zoomBar);

      const main = el("div", "ltk-ab-g-main");

      // fixed left pane: Issue/Action, Who, Dates
      const left = el("div", "ltk-ab-g-left");
      const lhead = el("div", "ltk-ab-g-lhead");
      lhead.append(
        el("div", "ltk-ab-g-hcell ltk-ab-g-c0"),
        el("div", "ltk-ab-g-hcell ltk-ab-g-c1", "Issue / Action"),
        el("div", "ltk-ab-g-hcell ltk-ab-g-c2", "Who"),
        el("div", "ltk-ab-g-hcell ltk-ab-g-c3", "Dates")
      );
      left.appendChild(lhead);
      for (const a of sorted) {
        const lrow = el("div", "ltk-ab-g-lrow");
        const c0 = el("div", "ltk-ab-g-c0");
        c0.appendChild(
          completeCircle(a, this.doneColor(), () => this.commit(), this.readOnly)
        );
        const c1 = el("div", "ltk-ab-g-c1");
        if (a.issue.trim() !== "") {
          c1.appendChild(el("div", "ltk-ab-card-issue", a.issue));
        }
        c1.appendChild(
          el(
            "div",
            "ltk-ab-g-desc" + (a.status === "done" ? " ltk-ab-done" : ""),
            a.description || a.issue
          )
        );
        const c2 = el("div", "ltk-ab-g-c2", assigneesLabel(a, "—"));
        if (a.assignees.length > 1) c2.title = partsTitle(a);
        const c3 = el("div", "ltk-ab-g-c3");
        const range =
          (a.start !== "" ? dayLabel(dayNum(a.start)) + " → " : "") +
          (a.due !== "" ? dayLabel(dayNum(a.due)) : "");
        const rangeEl = el("span", undefined, range);
        if (a.due !== "" && isOverdue(a)) {
          rangeEl.classList.add("ltk-action-overdue");
        }
        c3.appendChild(rangeEl);
        if (a.escalated) c3.appendChild(supportFlag());
        lrow.append(c0, c1, c2, c3);
        if (!this.readOnly) {
          lrow.addEventListener("click", () => this.editAction(a));
        }
        left.appendChild(lrow);
      }
      main.appendChild(left);

      // scrollable, zoomable plot pane
      const inner = el("div", "ltk-ab-g-inner");
      inner.style.width = `${plotW}px`;

      const scale = el("div", "ltk-ab-g-scale");
      for (let d = minDay; d <= maxDay; d++) {
        if (new Date(d * 86400000).getUTCDay() === 1) {
          const tick = el("div", "ltk-ab-g-tick", dayLabel(d));
          tick.style.left = `${(d - minDay) * dayW}px`;
          scale.appendChild(tick);
        }
      }
      inner.appendChild(scale);

      for (const a of sorted) {
        const plot = el("div", "ltk-ab-g-plot");
        const s = startOf(a);
        const e = endOf(a);
        const bar = el("div", "ltk-ab-g-bar");
        bar.style.left = `${(s - minDay) * dayW + 1}px`;
        bar.style.width = `${(e - s + 1) * dayW - 2}px`;
        const colour =
          a.status === "done"
            ? this.doneColor()
            : isOverdue(a)
              ? this.overdueColor()
              : this.openColor();
        bar.style.background = colour;
        plot.appendChild(bar);
        if (!this.readOnly) {
          plot.addEventListener("click", () => this.editAction(a));
        }
        inner.appendChild(plot);
      }

      // today marker spanning scale + rows
      const marker = el("div", "ltk-ab-g-today");
      marker.style.left = `${(today - minDay) * dayW + dayW / 2}px`;
      marker.style.height = `${GANTT_HEAD_H + sorted.length * GANTT_ROW_H}px`;
      inner.appendChild(marker);

      scroller.appendChild(inner);
      // Ctrl/Cmd + wheel zooms about the pointer; plain wheel scrolls
      scroller.addEventListener(
        "wheel",
        (e: WheelEvent) => {
          if (!e.ctrlKey && !e.metaKey) return;
          e.preventDefault();
          const rect = scroller.getBoundingClientRect();
          const frac =
            (scroller.scrollLeft + (e.clientX - rect.left)) /
            Math.max(1, scroller.scrollWidth);
          zoom(e.deltaY < 0 ? 1.25 : 0.8, frac);
        },
        { passive: false }
      );
      main.appendChild(scroller);
      wrap.appendChild(main);

      // where today (or another pinned day) should sit at the left edge,
      // clamped to the scroll range
      const pinTarget = () => {
        const maxScroll = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
        return Math.min(
          maxScroll,
          Math.max(0, (this.ganttViewStart! - minDay) * this.ganttDayW)
        );
      };
      const applyPin = () => {
        if (this.ganttViewStart === null) return;
        requestAnimationFrame(() => {
          if (this.ganttViewStart !== null) scroller.scrollLeft = pinTarget();
        });
      };
      // a scroll that lands away from the pin means the user took control
      scroller.addEventListener("scroll", () => {
        if (this.ganttViewStart === null) return;
        if (Math.abs(scroller.scrollLeft - pinTarget()) > 2) {
          this.ganttViewStart = null;
        }
      });

      if (this.ganttAutoFit) {
        // measure the plot pane, size a day so [today … latest] fills it, then
        // pin today to the left edge (re-rendering if the zoom changed)
        requestAnimationFrame(() => {
          const avail = scroller.clientWidth;
          if (avail <= 0) return;
          this.ganttAutoFit = false;
          this.ganttViewStart = today;
          const spanDays = Math.max(1, maxDay - today + 1);
          const w = Math.max(
            GANTT_MIN_DAY_W,
            Math.min(GANTT_MAX_DAY_W, Math.floor(avail / spanDays))
          );
          if (w !== this.ganttDayW) {
            this.ganttDayW = w;
            this.render(); // applyPin runs in the fresh render
          } else {
            applyPin();
          }
        });
      } else if (this.ganttViewStart !== null) {
        applyPin();
      } else if (this.ganttScrollFrac !== null) {
        // restore the centre after a manual zoom re-render
        const frac = this.ganttScrollFrac;
        this.ganttScrollFrac = null;
        requestAnimationFrame(() => {
          scroller.scrollLeft =
            frac * scroller.scrollWidth - scroller.clientWidth / 2;
        });
      }
    }

    if (undated.length > 0) {
      wrap.appendChild(
        el("div", "ltk-ab-g-undated-title", `No dates (${undated.length})`)
      );
      for (const a of this.sorted(undated)) {
        wrap.appendChild(
          actionRow(a, {
            doneColor: this.doneColor(),
            showIssue: true,
            readOnly: this.readOnly,
            onChanged: () => this.commit(),
            onEdit: (act) => this.editAction(act),
          })
        );
      }
    }
    return wrap;
  }

  // ---- kanban drag: move cards between columns ----

  private attachDrag(card: HTMLElement, a: LtkAction): void {
    makeInteractive(card, {
      onTap: () => this.editAction(a),
      onStart: (e) => {
        const rect = card.getBoundingClientRect();
        this.dragOffsetX = e.clientX - rect.left;
        this.dragOffsetY = e.clientY - rect.top;
        const ghost = card.cloneNode(true) as HTMLElement;
        ghost.classList.add("ltk-ab-ghost");
        ghost.style.width = `${rect.width}px`;
        ghost.style.left = `${rect.left}px`;
        ghost.style.top = `${rect.top}px`;
        this.root.appendChild(ghost);
        this.ghost = ghost;
        card.classList.add("ltk-ab-dragging");
      },
      onMove: (e) => {
        if (!this.ghost) return;
        this.ghost.style.left = `${e.clientX - this.dragOffsetX}px`;
        this.ghost.style.top = `${e.clientY - this.dragOffsetY}px`;
        this.updateDropTarget(e.clientX, e.clientY, a);
      },
      onEnd: () => {
        const target = this.currentDrop;
        this.clearDrag(card);
        if (target !== undefined) this.dropInColumn(a, target);
      },
    });
  }

  private currentKey(a: LtkAction): string {
    return this.groupBy === "status" ? a.status : a.issue.trim();
  }

  private updateDropTarget(x: number, y: number, dragging: LtkAction): void {
    let hit: { el: HTMLElement; key: string } | undefined;
    for (const zone of this.dropZones) {
      const r = zone.el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
        hit = zone;
        break;
      }
    }
    if (hit && hit.key === this.currentKey(dragging)) hit = undefined;
    this.currentDrop = hit?.key;
    for (const zone of this.dropZones) {
      zone.el.classList.toggle("ltk-ab-col-drop", zone === hit);
    }
  }

  private clearDrag(card: HTMLElement): void {
    if (this.ghost) this.ghost.remove();
    this.ghost = null;
    card.classList.remove("ltk-ab-dragging");
    for (const zone of this.dropZones) zone.el.classList.remove("ltk-ab-col-drop");
    this.currentDrop = undefined;
  }

  private dropInColumn(a: LtkAction, key: string): void {
    if (this.groupBy === "status") {
      const wasVerify = a.status === "verify";
      const prior = a.status;
      a.status = key as ActionStatus;
      // verify = the work is done, awaiting the owner; done from verify
      // stamps who verified (decision 6's endorsement)
      const done = a.status === "done" || a.status === "verify";
      for (const x of a.assignees) x.done = done;
      // the stored PDCA follows the column too (the display derives it,
      // the row should say the same — 2026-10-06)
      if (done) a.pdca = "closed";
      else if (a.pdca === "closed" || a.pdca === undefined) a.pdca = a.status === "in-progress" ? "do" : "plan";
      if (a.status === "done" && wasVerify && this.actor.whoId !== "") {
        a.verified = { whoId: this.actor.whoId, who: this.actor.who, when: new Date().toISOString().slice(0, 10) };
      }
      if (a.status !== "done") a.verified = undefined;
      // on an initiative that asks for endorsement, only an endorser's
      // drop closes — anyone else's waits (the store applies this again)
      if (this.actor.whoId !== "") applyEndorsementRule(a, prior, endorsementFor(a), this.actor, new Date().toISOString());
    } else {
      a.issue = key;
    }
    this.commit();
  }

  // ---- mutations ----

  private commit(): void {
    this.render();
    this.cb.onChange(this.actions);
    this.snapshots.schedule();
  }

  /** Raise an action; `columnKey` starts it in that kanban column (a
   *  status, or an issue when the board groups by issue). */
  private addAction(columnKey?: string): void {
    const action = newAction({ source: "actionboard", sourceId: "" });
    if (columnKey !== undefined && columnKey !== "") {
      if (this.groupBy === "status") {
        const status = columnKey as ActionStatus;
        action.status = status;
        // the PDCA state the dialog opens on follows the column
        action.pdca = status === "done" || status === "verify" ? "closed" : status === "in-progress" ? "do" : "plan";
        if (status === "done" || status === "verify") for (const x of action.assignees) x.done = true;
      } else {
        action.issue = columnKey;
      }
    }
    openActionDialog({
      host: this.root,
      action,
      people: this.people,
      isNew: true,
      linkTargets: this.linkTargets,
      linkTarget: this.defaultLink !== "" ? this.defaultLink : undefined,
      linkLabel: this.linkLabel !== "" ? this.linkLabel : undefined,
      // several homes on one card: a new action goes to one of THEM —
      // the select is the whole choice, no free "Linked to" beside it
      noLinkField: this.sectionOf !== null,
      onCommit: () => {
        this.actions.push(action);
        this.commit();
      },
    });
  }

  private editAction(action: LtkAction): void {
    // a due-date move is recorded — and, where the organisation's rule
    // says so, asked about — by the dialog itself (shared/schema/
    // reschedule.ts), the same on every card
    openActionDialog({
      host: this.root,
      action,
      people: this.people,
      isNew: false,
      // several homes on one card: an existing action moves only through
      // "Linked to" (applyLink re-stamps what a move changes) — the
      // card-level select would carry the old home's stamps along
      linkTargets: this.sectionOf !== null ? undefined : this.linkTargets,
      linkTarget: action.instanceId,
      // who moved it, where the host has no viewer provider of its own
      viewer: this.actor.whoId !== "" ? this.actor : undefined,
      onCommit: () => this.commit(),
      // "Duplicate…" (issue 11): the copy opens as a new action of this card
      onDuplicate: (copy) => this.raiseCopy(copy),
    });
  }

  /** A duplicate: the Raise dialog, filled from the copy; raised, it
   *  joins the card like any new action. */
  private raiseCopy(action: LtkAction): void {
    openActionDialog({
      host: this.root,
      action,
      people: this.people,
      isNew: true,
      prefill: true,
      linkTargets: this.sectionOf !== null ? undefined : this.linkTargets,
      linkTarget: action.instanceId !== "" ? action.instanceId : this.defaultLink !== "" ? this.defaultLink : undefined,
      linkLabel: this.linkLabel !== "" ? this.linkLabel : undefined,
      viewer: this.actor.whoId !== "" ? this.actor : undefined,
      onCommit: () => {
        this.actions.push(action);
        this.commit();
      },
    });
  }

  // ---- snapshot + downloads ----

  private generateSnapshot(): void {
    if (!this.cb.onSnapshot) return;
    htmlToSvg(this.root, LTK_BASE_CSS + ACTIONBOARD_CSS, this.theme.background, (svg) =>
      this.cb.onSnapshot!(svg)
    );
  }

    private downloadSvg(): void {
    htmlToSvg(this.root, LTK_BASE_CSS + ACTIONBOARD_CSS, this.theme.background, (svg) =>
      saveSvg(svg, "action-board.svg")
    );
  }

private downloadPng(): void {
    htmlToPng(this.root, LTK_BASE_CSS + ACTIONBOARD_CSS, this.theme.background, (uri) => {
      const link = document.createElement("a");
      link.href = uri;
      link.download = "action-board.png";
      link.click();
    });
  }
}
