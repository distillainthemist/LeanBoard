// Actions Gantt (design spec §2, P8). ONE component, three scopes:
// "initiative" (stage bands behind the bars, no group rows), "org"
// (group row per initiative — caret · status edge · name · stage chip ·
// count; collapsed shows one summary bar) and "board" (2026-09-30: the
// actions card on ANY board — the actions it is given, flat, whether or
// not they belong to an initiative). Toolbar: scope · assignee ·
// Show completed toggle · ‹ window presets 2w … 52w · All › · ⋮ (export
// CSV). The window's arithmetic lives in ganttWindow.ts (2026-11-12: the
// longer windows, "All", and ‹ › to move along a long project).
// No state filter: every bar and chip already says its state (Ben,
// 2026-10-06).
// Bar states carry a SHAPE as well as a colour (§2.2): on-track solid
// accent · overdue solid red · awaiting-verification hatched amber ·
// completed flat grey; no start date = a diamond on the due date. Editing
// (§2.3): drag moves both dates, edges resize; any due-date move opens
// the reschedule dialog (the ActionBoard's four reasons) and Cancel snaps
// back; the start-only (left-edge) drag never prompts. Touch: tap to
// select, ±1d/±1w steppers + Set dates… — no drag. Dependencies are out
// of scope by design.

import { actionBelongsTo, isOnHold } from "../../../shared/schema/actions";
import { el, clear } from "../../../shared/ui/dom";
import { LtkAction, ActionHistoryEntry } from "../../../shared/schema/actions";
import { todayIso } from "../../../shared/schema/id";
import { dayLabel } from "../linkTitle";
import { upsertActions } from "../store/actions";
import { mergeUserPrefs, userPrefsJson } from "../store/config";
import { modal, field } from "../priorities/dialogs";
import { Initiative } from "./initiativeModel";
import { PDCA_TOKENS } from "./templateModel";
import {
  DAY_MS,
  GANTT_PRESETS,
  GanttRange,
  addDaysIso as addDays,
  dayNum,
  ganttTicks,
  ganttWindow,
  isGanttRange,
  isoOfDay,
  pageStep,
  spanOf,
  weekdayOf,
} from "./ganttWindow";

/** Where a Gantt was left: its range, and the day it is centred on
 *  (null = where it opens by itself). */
export interface GanttWindowState {
  range: GanttRange;
  anchor: string | null;
}

export const RESCHEDULE_REASONS = [
  "Waiting on parts",
  "Resource unavailable",
  "Scope changed",
  "Blocked by another action",
];

export interface GanttOpts {
  host: HTMLElement;
  /** Which scopes the segmented control offers; the first is initial. */
  scopes: { key: "initiative" | "org" | "board"; label: string }[];
  /** Initiative scope: the one initiative (stage bands come from it). */
  initiative?: Initiative;
  /** Org scope: every initiative in view (group rows). */
  initiatives: Initiative[];
  actions: LtkAction[];
  /** State palette (ragPaletteKey → colour). */
  palette: Record<string, string>;
  /** Per-initiative RAG for the group rows' status edge. */
  ragFor?: (i: Initiative) => "green" | "amber" | "red" | "grey";
  /** Who may edit (drag / steppers). False = read-only (ritual card). */
  canEdit: boolean;
  actor: { whoId: string; who: string };
  /** Called after a successful date write. */
  onChanged: () => void;
  /** Open an initiative's board (org scope group rows). */
  onOpenBoard?: (boardId: string) => void;
  /** Window centre (yyyy-mm-dd); default today. The ritual card centres
   *  on the meeting's week. */
  centerIso?: string;
  /** Initial window: weeks (2/4/8/13/26/52) or "all"; default 4. */
  windowWeeks?: GanttRange;
  /** The host's own toolbar row: the Gantt puts its controls here rather
   *  than on a row of its own (the actions card, 2026-11-12). */
  toolbarHost?: HTMLElement;
  /** Where the host last saw this Gantt (it remounts on every card
   *  repaint — without this each edit would snap back to four weeks
   *  around today). */
  window?: GanttWindowState | null;
  onWindow?: (w: GanttWindowState) => void;
  /** The host already offers a List/Gantt switch — hide the internal one. */
  hideViewSwitch?: boolean;
  /** The host owns Show completed (the actions card's own switch,
   *  2026-10-31): the Gantt follows this and shows no toggle. */
  showCompleted?: boolean;
  /** Open an action for editing — a click on its name (2026-10-31). */
  onEdit?: (a: LtkAction) => void;
  /** Board scope: group the rows the way the host's kanban does (its
   *  columns when it groups by issue), in this order; open by default. */
  groups?: { key: string; label: string; items: LtkAction[] }[];
}

/** "Nov", or "Jan 2027" where the year turns (month-mode header). */
function monthLabel(day: number, withYear: boolean): string {
  const d = new Date(day * DAY_MS);
  const m = d.toLocaleDateString(undefined, { month: "short", timeZone: "UTC" });
  return withYear ? `${m} ${d.getUTCFullYear()}` : m;
}

type BarState = "ontrack" | "overdue" | "verify" | "hold" | "done";

const STATE_LABEL: Record<BarState, string> = { ontrack: "On track", overdue: "Overdue", verify: "Awaiting endorsement", hold: "On hold", done: "Done" };

function barState(a: LtkAction, today: string): BarState {
  if (a.status === "done" || a.status === "cancelled") return "done";
  if (a.status === "verify") return "verify";
  // paused by decision (2026-09-30): held, and not late while it is
  if (isOnHold(a)) return "hold";
  if (a.due !== "" && a.due < today) return "overdue";
  return "ontrack";
}

/** What a row is called: the action itself (its description), else its
 *  issue. On a meeting board the issue is the kanban's category
 *  ("Safety"), so it must not stand in for the action (Ben, 2026-10-01). */
function titleOf(a: LtkAction): string {
  const d = a.description.trim();
  return d !== "" ? d : a.issue.trim() !== "" ? a.issue : "(untitled)";
}
/** The issue as a tag when it is not what the title already says. */
function issueTag(a: LtkAction): string {
  const i = a.issue.trim();
  return i !== "" && i !== titleOf(a) ? i : "";
}

/** "Show completed" is the person's standing choice (Ben, 2026-10-05):
 *  read once per session from their prefs (`ganttShowCompleted`), kept
 *  here so later mounts open on it without a round trip. */
let completedPref: boolean | null = null;
async function loadCompletedPref(whoId: string): Promise<boolean> {
  if (completedPref !== null) return completedPref;
  try {
    const prefs = JSON.parse((whoId !== "" ? await userPrefsJson(whoId) : "") || "{}") as { ganttShowCompleted?: unknown };
    completedPref = prefs.ganttShowCompleted === true;
  } catch {
    completedPref = false;
  }
  return completedPref;
}

export function mountGantt(opts: GanttOpts): () => void {
  const wrap = el("div", "app-gx");
  opts.host.appendChild(wrap);
  const cleanups: (() => void)[] = [
    () => wrap.remove(),
    () => {
      if (opts.toolbarHost) clear(opts.toolbarHost);
    },
  ];

  const today = todayIso();
  let scope = opts.scopes[0]?.key ?? "org";
  // Ben, 2026-08-25: every Gantt surface switches to a plain action list
  let view: "gantt" | "list" = "gantt";
  const todayN = dayNum(today) as number;
  // where the window opens by itself: the meeting's week, else today
  const centre0 = dayNum(opts.centerIso ?? "") ?? todayN;
  let range: GanttRange = isGanttRange(opts.window?.range) ? opts.window.range : isGanttRange(opts.windowWeeks) ? opts.windowWeeks : 4;
  let anchor = dayNum(opts.window?.anchor ?? "") ?? centre0;
  const tellWindow = () => opts.onWindow?.({ range, anchor: anchor === centre0 ? null : isoOfDay(anchor) });
  const controlled = opts.showCompleted !== undefined;
  let showCompleted = controlled ? opts.showCompleted === true : completedPref === true;
  if (!controlled && completedPref === null) {
    void loadCompletedPref(opts.actor.whoId).then((v) => {
      if (v !== showCompleted && wrap.isConnected) {
        showCompleted = v;
        render();
      }
    });
  }
  let assignee = "";
  const expanded = new Set<string>(); // initiative ids (org scope)
  const collapsed = new Set<string>(); // board-scope groups folded by the person
  const uncapped = new Set<string>(); // groups past the 3-row cap
  let selected: string | null = null; // touch selection (action id)

  const accent = getComputedStyle(document.documentElement).getPropertyValue("--app-accent").trim() || "#2563eb";
  const colours = {
    ontrack: accent,
    overdue: opts.palette.issue ?? "#c0392b",
    verify: opts.palette.atrisk ?? "#d9a441",
    hold: "#6d675c",
    done: "#b8b1a5",
  };

  const owns = (i: Initiative, a: LtkAction): boolean =>
    actionBelongsTo(i, a);
  const byInitiative = (i: Initiative): LtkAction[] => opts.actions.filter((a) => owns(i, a));
  const initOf = (a: LtkAction): Initiative | null => opts.initiatives.find((i) => owns(i, a)) ?? null;

  const visibleAction = (a: LtkAction): boolean => {
    // the state is on every bar and chip — the only filter is completed
    // or not (Ben, 2026-10-06; the state select was redundant)
    if (!showCompleted && (a.status === "done" || a.status === "cancelled")) return false;
    if (assignee !== "" && !a.assignees.some((x) => x.whoId === assignee)) return false;
    return true;
  };

  /** First and last date among what the scope shows — "All" fits it. An
   *  initiative's stage targets count: the bands are part of its plan. */
  const scopeSpan = (): { min: number; max: number } | null => {
    const rows =
      scope === "initiative" && opts.initiative
        ? byInitiative(opts.initiative)
        : scope === "org"
          ? opts.actions.filter((a) => initOf(a) !== null)
          : opts.actions;
    const dates: string[] = [];
    for (const a of rows.filter(visibleAction)) dates.push(a.start, a.due);
    if (scope === "initiative" && opts.initiative) dates.push(...Object.values(opts.initiative.stageTargets));
    return spanOf(dates);
  };

  // ---- date writes ----------------------------------------------------------

  const writeDates = async (a: LtkAction, start: string, due: string, reason: string, note: string) => {
    const next: LtkAction = { ...a, start, due };
    if (due !== a.due) {
      const entry: ActionHistoryEntry = {
        kind: "rescheduled",
        whoId: opts.actor.whoId,
        who: opts.actor.who,
        when: new Date().toISOString(),
        from: a.due,
        to: due,
        reason: note !== "" ? `${reason} — ${note}` : reason,
      };
      next.history = [...(a.history ?? []), entry];
    }
    await upsertActions([next]);
    const local = opts.actions.find((x) => x.id === a.id);
    if (local) {
      local.start = start;
      local.due = due;
      local.history = next.history;
    }
    opts.onChanged();
  };

  /** The §2.3 dialog. Resolves true = moved, false = cancelled. */
  const rescheduleDialog = (a: LtkAction, start: string, due: string): Promise<boolean> =>
    new Promise((resolve) => {
      const m = modal(opts.host, `Move due date to ${dayLabel(due)}?`, undefined);
      const prev = el("div", "app-gx-dlgprev");
      const wasOverdue = a.due !== "" && a.due < today;
      prev.textContent = a.due !== "" ? `Was ${dayLabel(a.due)}${wasOverdue ? " — overdue" : ""}` : "No due date was set";
      if (wasOverdue) prev.style.color = colours.overdue;
      m.body.appendChild(prev);
      const sel = el("select", "app-input") as HTMLSelectElement;
      for (const r of RESCHEDULE_REASONS) {
        const o = el("option", "", r) as HTMLOptionElement;
        o.value = r;
        sel.appendChild(o);
      }
      m.body.appendChild(field("Why is this moving?", sel));
      const note = el("input", "app-input") as HTMLInputElement;
      note.placeholder = "Optional note";
      m.body.appendChild(field("Note", note));
      let done = false;
      const finish = (ok: boolean) => {
        if (done) return;
        done = true;
        clearInterval(watch);
        m.close();
        resolve(ok);
      };
      // Escape / overlay-click close the modal without our buttons — watch
      // for removal so the promise still resolves (and the bar snaps back)
      const watch = setInterval(() => {
        if (!m.overlay.isConnected) finish(false);
      }, 300);
      const cancel = el("button", "app-btn", "Cancel") as HTMLButtonElement;
      cancel.type = "button";
      cancel.addEventListener("click", () => finish(false));
      const go = el("button", "app-btn app-btn-primary", "Move date") as HTMLButtonElement;
      go.type = "button";
      go.addEventListener("click", () => {
        void writeDates(a, start, due, sel.value, note.value.trim()).then(() => finish(true));
      });
      m.footer.append(cancel, go);
    });

  /** A move settles: start-only writes silently, a due change prompts. */
  const settle = async (a: LtkAction, start: string, due: string): Promise<boolean> => {
    if (due === a.due) {
      if (start !== a.start) await writeDates(a, start, due, "", "");
      return true;
    }
    return rescheduleDialog(a, start, due);
  };

  const setDatesDialog = (a: LtkAction) => {
    const m = modal(opts.host, "Set dates", undefined);
    const s = el("input", "app-input") as HTMLInputElement;
    s.type = "date";
    s.value = a.start;
    const d = el("input", "app-input") as HTMLInputElement;
    d.type = "date";
    d.value = a.due;
    m.body.appendChild(field("Start", s));
    m.body.appendChild(field("Due", d));
    const cancel = el("button", "app-btn", "Cancel") as HTMLButtonElement;
    cancel.type = "button";
    cancel.addEventListener("click", () => m.close());
    const go = el("button", "app-btn app-btn-primary", "Save") as HTMLButtonElement;
    go.type = "button";
    go.addEventListener("click", () => {
      m.close();
      void settle(a, s.value, d.value).then(() => render());
    });
    m.footer.append(cancel, go);
  };

  // ---- rendering ------------------------------------------------------------

  let paintedHostW = 0;
  let fitted = false; // this paint's day width came from the plot's width
  const render = () => {
    clear(wrap);
    if (opts.toolbarHost) clear(opts.toolbarHost);
    paintedHostW = opts.host.clientWidth;
    // "All" (and 26w / 52w) fit the room the plot has: the host's width less the label
    // column (150 px on a phone) and the stage's border
    const labelW = window.matchMedia("(max-width: 599px)").matches ? 150 : 300;
    const avail = (opts.host.clientWidth || wrap.clientWidth || 1200) - labelW - 4;
    const win = ganttWindow(range, anchor, range === "all" ? scopeSpan() : null, todayN, avail);
    const { days, dayW } = win;
    fitted = range === "all" || win.months;
    const d0 = win.start;
    const startIso = isoOfDay(d0);
    const width = Math.round(days * dayW);
    // a bar stays grabbable when a day is three pixels wide
    const minBar = Math.max(dayW, 6);
    const xOf = (iso: string): number | null => {
      const n = dayNum(iso);
      return n === null ? null : Math.round((n - d0) * dayW);
    };
    // header ticks and the rows' scaffold, worked out once for every row
    const ticks = ganttTicks(win);
    const weekendAt: number[] = [];
    if (!win.months) {
      for (let d = 0; d < days; d++) {
        const wd = weekdayOf(d0 + d);
        if (wd === 6 || wd === 0) weekendAt.push(d);
      }
    }

    // toolbar
    const bar = el("div", "app-gx-bar");
    if (!opts.hideViewSwitch) {
      const viewSeg = el("div", "app-docs-seg");
      for (const [v, l] of [["list", "List"], ["gantt", "Gantt"]] as const) {
        const b = el("button", "app-docs-segbtn" + (view === v ? " app-docs-segbtn-on" : ""), l) as HTMLButtonElement;
        b.type = "button";
        b.addEventListener("click", () => {
          view = v;
          render();
        });
        viewSeg.appendChild(b);
      }
      bar.appendChild(viewSeg);
    }
    if (opts.scopes.length > 1) {
      const seg = el("div", "app-docs-seg");
      for (const sc of opts.scopes) {
        const b = el("button", "app-docs-segbtn" + (scope === sc.key ? " app-docs-segbtn-on" : ""), sc.label) as HTMLButtonElement;
        b.type = "button";
        b.addEventListener("click", () => {
          scope = sc.key;
          render();
        });
        seg.appendChild(b);
      }
      bar.appendChild(seg);
    }
    if (scope === "org" || scope === "board") {
      const people = new Map<string, string>();
      for (const a of opts.actions) for (const x of a.assignees) if (x.whoId !== "") people.set(x.whoId, x.who);
      if (people.size > 0) {
        const sel = el("select", "app-input app-gx-sel") as HTMLSelectElement;
        const all = el("option", "", "All assignees") as HTMLOptionElement;
        all.value = "";
        sel.appendChild(all);
        for (const [id, name] of [...people.entries()].sort((a, b) => a[1].localeCompare(b[1]))) {
          const o = el("option", "", name) as HTMLOptionElement;
          o.value = id;
          if (id === assignee) o.selected = true;
          sel.appendChild(o);
        }
        sel.addEventListener("change", () => {
          assignee = sel.value;
          render();
        });
        bar.appendChild(sel);
      }
    }
    // show completed: a standing toggle on the bar (was a hidden ⋮ item);
    // absent when the host's own switch governs
    const tog = el("label", "app-gx-toggle");
    if (controlled) tog.style.display = "none";
    const sw = el("button", "app-tw-toggle" + (showCompleted ? " app-tw-toggle-on" : "")) as HTMLButtonElement;
    sw.type = "button";
    sw.setAttribute("role", "switch");
    sw.setAttribute("aria-checked", String(showCompleted));
    sw.title = showCompleted ? "Hide completed and cancelled actions" : "Show completed and cancelled actions too";
    sw.appendChild(el("span", "app-tw-toggle-knob"));
    sw.addEventListener("click", () => {
      showCompleted = !showCompleted;
      completedPref = showCompleted;
      if (opts.actor.whoId !== "") void mergeUserPrefs(opts.actor.whoId, { ganttShowCompleted: showCompleted }).catch(() => undefined);
      render();
    });
    tog.append(sw, el("span", undefined, "Show completed"));
    bar.appendChild(tog);
    if (!opts.toolbarHost) bar.appendChild(el("span", "app-bar-gap"));
    if (view === "gantt") {
      // ‹ range › — the arrows move the window half its own length, so a
      // long project is walked a stretch at a time; "All" has nowhere to
      // go. "Today" appears once the window has left today.
      const step = pageStep(range);
      const stepWords = step === 7 ? "1 week" : `${step / 7} weeks`;
      if (range !== "all" && anchor !== todayN) {
        const now = el("button", "app-btn app-gx-nav app-gx-now", "Today") as HTMLButtonElement;
        now.type = "button";
        now.title = "Centre the window on today";
        now.addEventListener("click", () => {
          anchor = todayN;
          tellWindow();
          render();
        });
        bar.appendChild(now);
      }
      const nav = (glyph: string, dir: -1 | 1): HTMLButtonElement => {
        const b = el("button", "app-btn app-gx-nav", glyph) as HTMLButtonElement;
        b.type = "button";
        const words = dir < 0 ? "Earlier" : "Later";
        b.setAttribute("aria-label", words);
        if (range === "all") {
          b.disabled = true;
          b.title = "All actions are in view";
        } else {
          b.title = `${words} by ${stepWords}`;
          b.addEventListener("click", () => {
            anchor += dir * step;
            tellWindow();
            render();
          });
        }
        return b;
      };
      // ‹ range › stay together when the row wraps
      const group = el("span", "app-gx-rangegroup");
      group.appendChild(nav("‹", -1));
      const rangeSeg = el("div", "app-docs-seg app-gx-range");
      for (const p of GANTT_PRESETS) {
        const b = el("button", "app-docs-segbtn" + (range === p.range ? " app-docs-segbtn-on" : ""), p.label) as HTMLButtonElement;
        b.type = "button";
        b.title = p.title;
        b.addEventListener("click", () => {
          range = p.range;
          tellWindow();
          render();
        });
        rangeSeg.appendChild(b);
      }
      group.appendChild(rangeSeg);
      group.appendChild(nav("›", 1));
      bar.appendChild(group);
    }
    const more = el("button", "app-btn app-gx-more", "⋮") as HTMLButtonElement;
    more.type = "button";
    more.title = "Export";
    more.addEventListener("click", () => {
      const menu = el("div", "app-cp-menu");
      const item = (label: string, run: () => void) => {
        const b = el("button", "app-cp-menu-item", label) as HTMLButtonElement;
        b.type = "button";
        b.addEventListener("click", () => {
          menu.remove();
          run();
        });
        menu.appendChild(b);
      };
      item("Export CSV", () => exportCsv());
      const r = more.getBoundingClientRect();
      menu.style.top = `${r.bottom + 4}px`;
      menu.style.left = `${Math.min(r.left, window.innerWidth - 240)}px`;
      document.body.appendChild(menu);
      const off = (e: PointerEvent) => {
        if (!menu.contains(e.target as Node)) {
          menu.remove();
          document.removeEventListener("pointerdown", off, true);
        }
      };
      setTimeout(() => document.addEventListener("pointerdown", off, true), 0);
      cleanups.push(() => menu.remove());
    });
    bar.appendChild(more);
    (opts.toolbarHost ?? wrap).appendChild(bar);

    if (view === "list") {
      const listBox = el("div", "app-gx-list");
      const stateChip = (a: LtkAction): HTMLElement => {
        const st = barState(a, today);
        const chip = el("span", "app-gx-statechip", (st === "hold" ? "⏸ " : "") + STATE_LABEL[st]);
        const c = colours[st];
        chip.style.color = c;
        chip.style.background = `color-mix(in srgb, ${c} 14%, white)`;
        return chip;
      };
      const listRow = (a: LtkAction): HTMLElement => {
        const r = el("div", "app-gx-listrow");
        const main = el("div", "app-gx-listmain");
        main.appendChild(el("div", "app-gx-label-title", titleOf(a).slice(0, 120)));
        const who = a.assignees.map((x) => x.who).filter((x) => x !== "").join(", ");
        main.appendChild(el("div", "app-gx-label-meta", [issueTag(a), who].filter((x) => x !== "").join(" · ")));
        r.appendChild(main);
        const dates = el("div", "app-gx-listdates");
        const dueTxt = a.due !== "" ? dayLabel(a.due) : "no due date";
        dates.textContent = a.start !== "" ? `${dayLabel(a.start)} → ${dueTxt}` : dueTxt;
        if (barState(a, today) === "overdue") {
          dates.style.color = colours.overdue;
          dates.style.fontWeight = "600";
        }
        r.appendChild(dates);
        r.appendChild(stateChip(a));
        if (opts.onEdit) {
          r.classList.add("app-gx-listrow-edit");
          r.title = "Open this action";
          r.addEventListener("click", () => opts.onEdit?.(a));
        } else if (opts.canEdit && a.status !== "done" && a.status !== "cancelled") {
          r.classList.add("app-gx-listrow-edit");
          r.title = "Set dates";
          r.addEventListener("click", () => setDatesDialog(a));
        }
        return r;
      };
      const sortRows = (rows: LtkAction[]) => rows.sort((a, b) => ((a.due || "9999") < (b.due || "9999") ? -1 : 1));
      if (scope === "board" && opts.groups) {
        const groups = opts.groups.map((g) => ({ g, rows: sortRows(g.items.filter(visibleAction)) })).filter((x) => x.rows.length > 0);
        if (groups.length === 0) listBox.appendChild(el("div", "app-gx-empty", "No open actions."));
        for (const { g, rows } of groups) {
          listBox.appendChild(el("div", "app-gx-listgroup", `${g.label} · ${rows.length}`));
          for (const a of rows) listBox.appendChild(listRow(a));
        }
      } else if (scope === "board") {
        const rows = sortRows(opts.actions.filter(visibleAction));
        if (rows.length === 0) listBox.appendChild(el("div", "app-gx-empty", "No open actions."));
        for (const a of rows) listBox.appendChild(listRow(a));
      } else if (scope === "initiative" && opts.initiative) {
        const rows = sortRows(byInitiative(opts.initiative).filter(visibleAction));
        if (rows.length === 0) listBox.appendChild(el("div", "app-gx-empty", "No actions on this initiative yet. Add one from the Action plan card."));
        for (const a of rows) listBox.appendChild(listRow(a));
      } else {
        const groups = opts.initiatives
          .map((i) => ({ i, rows: sortRows(byInitiative(i).filter(visibleAction)) }))
          .filter((g) => g.rows.length > 0);
        if (groups.length === 0) listBox.appendChild(el("div", "app-gx-empty", "No open actions."));
        for (const g of groups) {
          listBox.appendChild(el("div", "app-gx-listgroup", `${g.i.title} · ${g.rows.length}`));
          for (const a of g.rows) listBox.appendChild(listRow(a));
        }
      }
      wrap.appendChild(listBox);
      return;
    }

    // the scrolling stage: fixed 300px label column, timeline under it
    const stage = el("div", "app-gx-stage");
    wrap.appendChild(stage);
    const grid = el("div", "app-gx-grid");
    stage.appendChild(grid);

    const headRow = () => {
      const r = el("div", "app-gx-row app-gx-headrow");
      r.appendChild(el("div", "app-gx-label app-gx-headlabel", ""));
      const tl = el("div", "app-gx-tl");
      tl.style.width = `${width}px`;
      for (const t of ticks) {
        const wk = el("div", "app-gx-week", win.months ? monthLabel(t.day, t.year) : dayLabel(isoOfDay(t.day)));
        wk.style.left = `${t.offset * dayW}px`;
        tl.appendChild(wk);
      }
      for (const d of weekendAt) {
        const we = el("div", "app-gx-weekend");
        we.style.left = `${d * dayW}px`;
        we.style.width = `${dayW}px`;
        tl.appendChild(we);
      }
      r.appendChild(tl);
      return r;
    };
    grid.appendChild(headRow());

    /** Shared per-row timeline scaffold: weekend tint (month lines on
     *  the long windows, where a weekend is a few pixels) + today line. */
    const timelineCell = (): HTMLElement => {
      const tl = el("div", "app-gx-tl");
      tl.style.width = `${width}px`;
      for (const d of weekendAt) {
        const we = el("div", "app-gx-weekend");
        we.style.left = `${d * dayW}px`;
        we.style.width = `${dayW}px`;
        tl.appendChild(we);
      }
      if (win.months) {
        for (const t of ticks) {
          if (t.offset === 0) continue;
          const ml = el("div", "app-gx-monthline");
          ml.style.left = `${t.offset * dayW}px`;
          tl.appendChild(ml);
        }
      }
      const tx = xOf(today);
      if (tx !== null && tx >= 0 && tx <= width) {
        const line = el("div", "app-gx-today");
        line.style.left = `${tx}px`;
        tl.appendChild(line);
      }
      return tl;
    };

    // stage bands (initiative scope): translucent PDCA rails from the
    // previous stage's target to this stage's, labelled with the target
    const stageBands = (tl: HTMLElement, i: Initiative) => {
      let prev = "";
      for (const st of i.snapshot.stages) {
        const target = i.stageTargets[st.id] ?? "";
        if (target === "") continue;
        const x1 = prev !== "" ? (xOf(addDays(prev, 1)) ?? 0) : 0;
        const x2 = xOf(target);
        prev = target;
        if (x2 === null || x2 < 0 || x1 > width) continue;
        const band = el("div", "app-gx-band");
        band.style.left = `${Math.max(0, x1)}px`;
        band.style.width = `${Math.min(width, x2 + dayW) - Math.max(0, x1)}px`;
        band.style.background = `color-mix(in srgb, ${PDCA_TOKENS[st.pdca].fg} 9%, transparent)`;
        const lab = el("span", "app-gx-band-label", `${st.name} · ${dayLabel(target)}`);
        lab.style.color = PDCA_TOKENS[st.pdca].fg;
        band.appendChild(lab);
        tl.appendChild(band);
      }
    };

    const actionRow = (a: LtkAction): HTMLElement => {
      const r = el("div", "app-gx-row");
      const label = el("div", "app-gx-label");
      const t = el("div", "app-gx-label-title", titleOf(a).slice(0, 90));
      t.title = titleOf(a);
      label.appendChild(t);
      if (opts.onEdit) {
        // the name opens the action; the bar stays for dragging dates
        label.classList.add("app-gx-label-edit");
        label.title = "Open this action";
        label.addEventListener("click", () => opts.onEdit?.(a));
      }
      const who = a.assignees.map((x) => x.who).filter((x) => x !== "").join(", ");
      label.appendChild(el("div", "app-gx-label-meta", [issueTag(a), who, a.due !== "" ? `due ${dayLabel(a.due)}` : "no due date"].filter((x) => x !== "").join(" · ")));
      r.appendChild(label);
      const tl = timelineCell();
      r.appendChild(tl);

      const state = barState(a, today);
      const col = colours[state];
      if (a.due === "") return r; // nothing to place
      if (a.start === "") {
        // §2.2: no start date → a diamond on the due date
        const x = xOf(a.due);
        if (x !== null && x >= -dayW && x <= width) {
          const dia = el("div", "app-gx-diamond");
          dia.style.left = `${x + dayW / 2}px`;
          dia.style.background = col;
          dia.title = `${titleOf(a)} — no start date. Set one to show this as a bar.`;
          if (opts.canEdit) {
            dia.style.cursor = "pointer";
            dia.addEventListener("click", () => setDatesDialog(a));
          }
          tl.appendChild(dia);
        }
        return r;
      }
      const x1 = xOf(a.start);
      const x2 = xOf(a.due);
      if (x1 === null || x2 === null) return r;
      if (x2 < 0 || x1 > width) return r;
      const barEl = el("div", "app-gx-actionbar" + (selected === a.id ? " app-gx-bar-sel" : ""));
      const left = Math.max(-4, x1);
      barEl.style.left = `${left}px`;
      barEl.style.width = `${Math.max(minBar, Math.min(width + 4, x2 + dayW) - left)}px`;
      if (state === "verify") {
        barEl.style.background = `repeating-linear-gradient(45deg, ${col}, ${col} 5px, color-mix(in srgb, ${col} 45%, white) 5px, color-mix(in srgb, ${col} 45%, white) 10px)`;
      } else if (state === "hold") {
        // on hold: an outlined, washed bar — present, not progressing
        barEl.style.background = `color-mix(in srgb, ${col} 18%, white)`;
        barEl.style.border = `1.5px dashed ${col}`;
        barEl.style.boxSizing = "border-box";
      } else barEl.style.background = col;
      if (state === "done") barEl.style.opacity = "0.55";
      barEl.title = `${titleOf(a)}\n${dayLabel(a.start)} → ${dayLabel(a.due)}${state === "hold" ? "\nOn hold" : ""}`;
      tl.appendChild(barEl);

      if (opts.canEdit && state !== "done") wireDrag(barEl, a, dayW);
      if (selected === a.id && opts.canEdit) {
        const tools = el("div", "app-gx-steppers");
        const step = (label2: string, n: number) => {
          const b = el("button", "app-btn app-gx-step", label2) as HTMLButtonElement;
          b.type = "button";
          b.addEventListener("click", (e) => {
            e.stopPropagation();
            void settle(a, a.start !== "" ? addDays(a.start, n) : a.start, addDays(a.due, n)).then(() => render());
          });
          tools.appendChild(b);
        };
        step("−1w", -7);
        step("−1d", -1);
        step("+1d", 1);
        step("+1w", 7);
        const set = el("button", "app-btn app-gx-step", "Set dates…") as HTMLButtonElement;
        set.type = "button";
        set.addEventListener("click", (e) => {
          e.stopPropagation();
          setDatesDialog(a);
        });
        tools.appendChild(set);
        tools.style.left = `${Math.max(0, left)}px`;
        tl.appendChild(tools);
      }
      return r;
    };

    // ---- drag (desktop pointers only; touch selects) ----
    function wireDrag(barEl: HTMLElement, a: LtkAction, dw: number) {
      barEl.addEventListener("pointerdown", (e: PointerEvent) => {
        if (e.pointerType === "touch") {
          selected = selected === a.id ? null : a.id;
          render();
          return;
        }
        e.preventDefault();
        const rect = barEl.getBoundingClientRect();
        // a bar too short to have a middle moves whole
        const zone = rect.width >= 24 ? 8 : 0;
        const edge = e.clientX - rect.left < zone ? "start" : rect.right - e.clientX < zone ? "due" : "both";
        const fromX = e.clientX;
        let dDays = 0;
        const origLeft = parseFloat(barEl.style.left);
        const origW = parseFloat(barEl.style.width);
        const move = (ev: PointerEvent) => {
          dDays = Math.round((ev.clientX - fromX) / dw);
          if (edge === "both") barEl.style.left = `${origLeft + dDays * dw}px`;
          else if (edge === "due") barEl.style.width = `${Math.max(dw, origW + dDays * dw)}px`;
          else {
            barEl.style.left = `${origLeft + dDays * dw}px`;
            barEl.style.width = `${Math.max(dw, origW - dDays * dw)}px`;
          }
        };
        const up = () => {
          document.removeEventListener("pointermove", move);
          document.removeEventListener("pointerup", up);
          if (dDays === 0) return;
          const start = edge === "due" ? a.start : addDays(a.start, dDays);
          const due = edge === "start" ? a.due : addDays(a.due, dDays);
          if (edge === "start" && start > a.due) {
            render(); // snap back — a start can't pass the due date
            return;
          }
          void settle(a, start, due).then(() => render());
        };
        document.addEventListener("pointermove", move);
        document.addEventListener("pointerup", up);
      });
      barEl.addEventListener("mousemove", (e: MouseEvent) => {
        const rect = barEl.getBoundingClientRect();
        const zone = rect.width >= 24 ? 8 : 0;
        barEl.style.cursor = e.clientX - rect.left < zone || rect.right - e.clientX < zone ? "ew-resize" : "grab";
      });
    }

    /** A collapsed group's one bar spanning its actions, coloured by the worst state. */
    const summaryBar = (tl: HTMLElement, rows: LtkAction[]) => {
      const starts = rows.map((a) => a.start || a.due).filter((d) => d !== "");
      const dues = rows.map((a) => a.due).filter((d) => d !== "");
      if (starts.length === 0 || dues.length === 0) return;
      const x1 = xOf(starts.reduce((m, d) => (d < m ? d : m)));
      const x2 = xOf(dues.reduce((m, d) => (d > m ? d : m)));
      if (x1 === null || x2 === null || x2 < 0 || x1 > width) return;
      const sum = el("div", "app-gx-summary");
      const left = Math.max(-4, x1);
      sum.style.left = `${left}px`;
      sum.style.width = `${Math.max(minBar, Math.min(width + 4, x2 + dayW) - left)}px`;
      const worst = rows.map((a) => barState(a, today));
      sum.style.background = worst.includes("overdue") ? colours.overdue : worst.includes("verify") ? colours.verify : colours.ontrack;
      tl.appendChild(sum);
    };

    // ---- body ----
    if (scope === "board" && opts.groups) {
      // the actions card with kanban columns: a group per column, open
      // by default (the lanes are what the person sees on the board)
      const groups = opts.groups
        .map((g) => ({ g, rows: g.items.filter(visibleAction).sort((a, b) => ((a.due || "9999") < (b.due || "9999") ? -1 : 1)) }))
        .filter((x) => x.rows.length > 0);
      if (groups.length === 0) grid.appendChild(el("div", "app-gx-empty", "No open actions."));
      for (const { g, rows } of groups) {
        const key = `col:${g.key}`;
        const open = !collapsed.has(key);
        const gr = el("div", "app-gx-row app-gx-grouprow");
        const label = el("div", "app-gx-label app-gx-grouplabel");
        const caret = el("span", "app-gx-caret", open ? "▾" : "▸");
        label.append(caret, el("span", "app-gx-group-name", g.label), el("span", "app-gx-group-count", `· ${rows.length}`));
        label.style.cursor = "pointer";
        label.addEventListener("click", () => {
          if (open) collapsed.add(key);
          else collapsed.delete(key);
          render();
        });
        gr.appendChild(label);
        const tl = timelineCell();
        if (!open) summaryBar(tl, rows);
        gr.appendChild(tl);
        grid.appendChild(gr);
        if (open) for (const a of rows) grid.appendChild(actionRow(a));
      }
    } else if (scope === "board") {
      // the actions card: what it was given, flat — no groups, no bands
      const rows = opts.actions.filter(visibleAction).sort((a, b) => ((a.due || "9999") < (b.due || "9999") ? -1 : 1));
      if (rows.length === 0) grid.appendChild(el("div", "app-gx-empty", "No open actions."));
      for (const a of rows) grid.appendChild(actionRow(a));
    } else if (scope === "initiative" && opts.initiative) {
      const i = opts.initiative;
      const rows = byInitiative(i).filter(visibleAction).sort((a, b) => (a.due || "9999") < (b.due || "9999") ? -1 : 1);
      const bandsRow = el("div", "app-gx-row app-gx-bandsrow");
      bandsRow.appendChild(el("div", "app-gx-label app-gx-label-quiet", "Stages"));
      const btl = timelineCell();
      stageBands(btl, i);
      bandsRow.appendChild(btl);
      if (Object.keys(i.stageTargets).length > 0) grid.appendChild(bandsRow);
      if (rows.length === 0) {
        grid.appendChild(el("div", "app-gx-empty", "No actions on this initiative yet. Add one from the Action plan card."));
      }
      for (const a of rows) grid.appendChild(actionRow(a));
    } else {
      // org scope: a group per initiative
      const groups = opts.initiatives
        .map((i) => ({ i, rows: byInitiative(i).filter(visibleAction).sort((a, b) => ((a.due || "9999") < (b.due || "9999") ? -1 : 1)) }))
        .filter((g) => g.rows.length > 0);
      if (groups.length === 0) {
        grid.appendChild(el("div", "app-gx-empty", "No open actions."));
      }
      for (const g of groups) {
        const open = expanded.has(g.i.id);
        const gr = el("div", "app-gx-row app-gx-grouprow");
        const label = el("div", "app-gx-label app-gx-grouplabel");
        const rag = opts.ragFor?.(g.i) ?? "grey";
        label.style.borderLeft = `3px solid ${opts.palette[rag === "green" ? "good" : rag === "amber" ? "atrisk" : rag === "red" ? "issue" : "neutral"] ?? "#9a948a"}`;
        const caret = el("span", "app-gx-caret", open ? "▾" : "▸");
        label.append(caret, el("span", "app-gx-group-name", g.i.title));
        const st = g.i.snapshot.stages.find((s) => s.id === g.i.stageId);
        if (st) {
          const chip = el("span", "app-im-stagechip", st.name);
          chip.style.color = PDCA_TOKENS[st.pdca].fg;
          chip.style.background = PDCA_TOKENS[st.pdca].bg;
          label.appendChild(chip);
        }
        label.appendChild(el("span", "app-gx-group-count", `· ${g.rows.length}`));
        label.style.cursor = "pointer";
        label.addEventListener("click", () => {
          if (open) expanded.delete(g.i.id);
          else expanded.add(g.i.id);
          render();
        });
        gr.appendChild(label);
        const tl = timelineCell();
        if (!open) summaryBar(tl, g.rows);
        gr.appendChild(tl);
        grid.appendChild(gr);
        if (open) {
          const cap = uncapped.has(g.i.id) ? g.rows.length : 3;
          for (const a of g.rows.slice(0, cap)) grid.appendChild(actionRow(a));
          if (g.rows.length > cap) {
            const moreRow = el("div", "app-gx-row");
            const l = el("div", "app-gx-label");
            const b = el("button", "app-link app-gx-more-link", `${g.rows.length - cap} more ›`) as HTMLButtonElement;
            b.type = "button";
            b.title = g.i.boardId !== "" ? "Show all — or open the initiative board" : "Show all";
            b.addEventListener("click", () => {
              uncapped.add(g.i.id);
              render();
            });
            l.appendChild(b);
            if (opts.onOpenBoard && g.i.boardId !== "") {
              const ob = el("button", "app-link app-gx-more-link", "Open board ›") as HTMLButtonElement;
              ob.type = "button";
              ob.addEventListener("click", () => opts.onOpenBoard?.(g.i.boardId));
              l.appendChild(ob);
            }
            moreRow.appendChild(l);
            moreRow.appendChild(timelineCell());
            grid.appendChild(moreRow);
          }
        }
      }
    }

    // legend (§2.2)
    const legend = el("div", "app-gx-legend");
    const key = (label: string, paint: (sw: HTMLElement) => void) => {
      const k = el("span", "app-gx-key");
      const sw = el("span", "app-gx-swatch");
      paint(sw);
      k.append(sw, el("span", undefined, label));
      legend.appendChild(k);
    };
    key("On track", (sw) => (sw.style.background = colours.ontrack));
    key("Overdue", (sw) => (sw.style.background = colours.overdue));
    key("Awaiting endorsement", (sw) => {
      sw.style.background = `repeating-linear-gradient(45deg, ${colours.verify}, ${colours.verify} 3px, color-mix(in srgb, ${colours.verify} 45%, white) 3px, color-mix(in srgb, ${colours.verify} 45%, white) 6px)`;
    });
    key("On hold", (sw) => {
      sw.style.background = `color-mix(in srgb, ${colours.hold} 18%, white)`;
      sw.style.border = `1.5px dashed ${colours.hold}`;
      sw.style.boxSizing = "border-box";
    });
    key("Completed", (sw) => {
      sw.style.background = colours.done;
      sw.style.opacity = "0.55";
    });
    key("No start date", (sw) => {
      sw.classList.add("app-gx-swatch-diamond");
      sw.style.background = colours.ontrack;
    });
    // the window in words; with the year once it leaves this one
    const endIso = isoOfDay(d0 + days - 1);
    const thisYear = today.slice(0, 4);
    const withYear = startIso.slice(0, 4) !== thisYear || endIso.slice(0, 4) !== thisYear;
    const dl = (iso: string): string => (withYear ? `${dayLabel(iso)} ${iso.slice(0, 4)}` : dayLabel(iso));
    const windowEl = el("span", "app-gx-window", `${dl(startIso)} – ${dl(endIso)}${win.clipped ? " · 3 years shown" : ""}`);
    if (win.clipped) windowEl.title = "These actions span more than three years. Use 52w and the arrows to reach the rest.";
    legend.appendChild(windowEl);
    wrap.appendChild(legend);
  };

  const exportCsv = () => {
    const rows: string[][] = [["Initiative", "Action", "Issue", "Assignees", "Start", "Due", "State"]];
    for (const a of opts.actions.filter(visibleAction)) {
      const i = initOf(a);
      rows.push([i?.title ?? "", titleOf(a), issueTag(a), a.assignees.map((x) => x.who).join("; "), a.start, a.due, barState(a, today)]);
    }
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "actions-gantt.csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  render();
  // "All" and the long windows are fitted to the plot's width — refit
  // when the card is resized (or first laid out: a host mounted off the
  // page measures nothing)
  if (typeof ResizeObserver !== "undefined") {
    const ro = new ResizeObserver(() => {
      if (fitted && wrap.isConnected && Math.abs(opts.host.clientWidth - paintedHostW) > 24) render();
    });
    ro.observe(opts.host);
    cleanups.push(() => ro.disconnect());
  }
  return () => {
    for (const fn of cleanups) fn();
  };
}
