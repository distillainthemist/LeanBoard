// Cascaded priorities — the EXECUTIVE SUMMARY (2026-11-17, "Scope for
// executive summary"; the TV walk of design §15 rebuilt in place). One
// objective (sub-pillar column) per step; cascades to accept are one
// extra, final step when any are pending. Navigation keeps the card-walk
// grammar: a full-height PREV / NEXT rail either side, the neighbours
// named in the footer, ✕ Exit summary top right beside the step counter,
// ←/→, swipe, Esc. Every control ≥44px; no hover-only content.
//
// Each priority is a card: COLLAPSED it carries its status edge, its
// three initiative counts (on track / flagged / off track) and its key
// metrics as sparklines; EXPANDED the metrics give way to one row per
// initiative — status, stage, its actions done / future / late, its own
// metrics, and what a flagged one has asked for. The status is the ONE
// rule (improvement/status.ts); this file only draws it.
//
// Mounts INTO a host: the Priorities screen gives it a fixed full-screen
// layer; the embedded ritual card's focused editor gives it the card body
// (§8: opens at step 1); the phone mounts it inline as the page.

import { el, clear } from "../../../shared/ui/dom";
import { pdcaQuadrant } from "../../../shared/ui/actionUi";
import { rememberBoardOrigin } from "../improvement/boardOrigin";
import type { MetricValue } from "../improvement/metricValues";
import { sparklineSvg } from "../improvement/sparkline";
import { priorityStatus, reasonsLine, STATE_ORDER, statusWords } from "../improvement/status";
import { actionCircles, priorityCounts } from "../improvement/statusUi";
import { LifecycleCtx, renderReviewList } from "./lifecycle";
import { OrgRef, orgName, parentClosed, pendingCascades, Pillar, Priority, ragPaletteKey } from "./model";

/** How many metric tiles a card or a row shows before "+n". */
export const SUMMARY_METRIC_CAP = 4;

const PDCA_INDEX: Record<string, number> = { plan: 0, do: 1, check: 2, act: 3 };
const PDCA_WORD: Record<string, string> = { plan: "Plan", do: "Do", check: "Check", act: "Act" };

export interface WalkOpts {
  host: HTMLElement;
  ctx: LifecycleCtx;
  org: OrgRef;
  period: string;
  /** The objective columns currently visible (filters carry in). */
  columns: Pillar[];
  pillars: Pillar[];
  /** Priorities per column id, in matrix order. */
  byColumn: Map<string, Priority[]>;
  adoptedIds: Set<string>;
  /** A priority's key metrics — its OBJECTIVES (the primary initiative's
   *  ★ starred metrics, or the picked ones), the same list the main
   *  view's Objectives row reads. */
  objectives: (p: Priority) => MetricValue[];
  /** The priority ids whose cards are open — the screen's set, so it
   *  survives a repaint and a visit to an initiative board. */
  expanded: Set<string>;
  /** The open set or the step changed (the screen remembers both). */
  onView?: () => void;
  /** The card's ⋮ — offered when the viewer may manage the priority. */
  onMenu?: (anchor: HTMLElement, p: Priority) => void;
  canMenu?: (p: Priority) => boolean;
  startStep?: number;
  /** ✕ Exit summary / Esc — leave the summary. */
  onExit: () => void;
  onOpen: (p: Priority) => void;
  /** Step changed (the screen remembers it across repaints). */
  onStep?: (i: number) => void;
  /** Extra class on the walk root (e.g. "app-cp-walk-fixed"). */
  className?: string;
  /** The phone (mobile review M3): the walk IS the page — no ✕ Exit, no
   *  Esc, the page scrolls; ←/→, swipe and the rails still step. */
  inline?: boolean;
}

const btn = (label: string, cls = "app-btn"): HTMLButtonElement => {
  const b = el("button", cls, label) as HTMLButtonElement;
  b.type = "button";
  return b;
};

/** Mount the walk; returns a teardown. */
export function mountWalk(o: WalkOpts): () => void {
  const root = el("div", "app-cp-walk" + (o.className ? ` ${o.className}` : ""));
  o.host.appendChild(root);
  const pending = () => pendingCascades(o.org, o.ctx.data().assignments).length;
  const stepCount = () => o.columns.length + (pending() > 0 ? 1 : 0);
  let step = Math.min(Math.max(0, o.startStep ?? 0), Math.max(0, stepCount() - 1));

  const stepTitle = (i: number): string => {
    if (i < o.columns.length) return o.columns[i].name;
    return `Cascades to accept · ${pending()}`;
  };

  const paint = () => {
    clear(root);
    const n = stepCount();
    if (n === 0) {
      root.appendChild(el("div", "app-cp-walk-empty", "Nothing to summarise — no objectives are visible with the current filters."));
      if (o.inline !== true) {
        const back = btn("✕ Exit summary");
        back.addEventListener("click", o.onExit);
        root.appendChild(back);
      }
      return;
    }
    if (step >= n) step = n - 1;
    const isReview = step >= o.columns.length;
    const col = isReview ? null : o.columns[step];
    const l1 = col ? o.pillars.find((p) => p.id === col.parentId) : undefined;

    // header strip
    const head = el("div", "app-cp-walk-head");
    const colour = col?.color || l1?.color || "";
    if (colour !== "") head.style.background = colour;
    const titleBox = el("div", "app-cp-walk-titlebox");
    const over = el("div", "app-xs-over");
    over.append(el("span", "app-xs-year", o.period), el("span", undefined, `Executive summary · ${orgName(o.org)}`));
    titleBox.appendChild(over);
    // "Pillar : Sub-pillar" — the mock-up's bar
    titleBox.appendChild(el("div", "app-cp-walk-title", col && l1 ? `${l1.name} : ${col.name}` : stepTitle(step)));
    head.appendChild(titleBox);
    const prog = el("div", "app-cp-walk-progress");
    const dots = el("div", "app-cp-walk-dots");
    for (let i = 0; i < n; i++) {
      const d = btn("", "app-cp-walk-dot" + (i === step ? " app-cp-walk-dot-on" : "") + (i >= o.columns.length ? " app-cp-walk-dot-review" : ""));
      d.title = stepTitle(i);
      d.setAttribute("aria-label", stepTitle(i));
      d.addEventListener("click", () => go(i));
      dots.appendChild(d);
    }
    prog.appendChild(dots);
    prog.appendChild(el("div", "app-cp-walk-count", `${step + 1} / ${n}`));
    // the way out: top right, beside the counter, named for what it does
    // (Ben, 2026-09-29 — "⊞ All pillars" in the footer did not read as it)
    if (col) {
      const items = o.byColumn.get(col.id) ?? [];
      const allOpen = items.length > 0 && items.every((p) => o.expanded.has(p.id));
      const all = btn(allOpen ? "Collapse all" : "Expand all", "app-btn app-cp-walk-exit app-xs-all");
      all.title = allOpen ? "Close every priority on this page" : "Open every priority on this page to its initiatives";
      all.disabled = items.length === 0;
      all.addEventListener("click", () => {
        for (const p of items) {
          if (allOpen) o.expanded.delete(p.id);
          else o.expanded.add(p.id);
        }
        o.onView?.();
        paint();
      });
      prog.appendChild(all);
    }
    if (o.inline !== true) {
      const exit = btn("✕ Exit summary", "app-btn app-cp-walk-exit");
      exit.title = "Leave the executive summary and return to all pillars (Esc)";
      exit.addEventListener("click", o.onExit);
      prog.appendChild(exit);
    }
    head.appendChild(prog);
    root.appendChild(head);

    // the stage: a full-height rail either side of the body — the meeting
    // ritual's card walk grammar (glyph + caption, never a bare chevron)
    const rail = (dir: "prev" | "next"): HTMLButtonElement => {
      const to = dir === "prev" ? step - 1 : step + 1;
      const live = to >= 0 && to < n;
      const b = btn("", "app-cp-walk-rail" + (live ? "" : " app-cp-walk-rail-off"));
      b.appendChild(el("span", "app-cp-walk-rail-glyph", dir === "prev" ? "‹" : "›"));
      b.appendChild(el("span", "app-cp-walk-rail-cap", dir === "prev" ? "PREV" : "NEXT"));
      b.disabled = !live;
      if (live) {
        b.title = stepTitle(to);
        b.setAttribute("aria-label", `${dir === "prev" ? "Previous" : "Next"}: ${stepTitle(to)}`);
        b.addEventListener("click", () => go(to));
      } else {
        b.setAttribute("aria-hidden", "true");
      }
      return b;
    };
    const stage = el("div", "app-cp-walk-stage");

    // body
    const body = el("div", "app-cp-walk-body");
    if (isReview) {
      const list = el("div", "app-cp-review app-cp-walk-review");
      renderReviewList(o.ctx, o.org, list);
      body.appendChild(list);
    } else if (col) {
      const items = o.byColumn.get(col.id) ?? [];
      if (items.length === 0) body.appendChild(el("div", "app-cp-walk-empty", "No priorities in this objective."));
      for (const p of items) body.appendChild(row(p));
    }
    stage.append(rail("prev"), body, rail("next"));
    root.appendChild(stage);

    // footer: where each rail leads
    const foot = el("div", "app-cp-walk-foot");
    const name = (to: number, dir: "prev" | "next"): HTMLElement => {
      if (to < 0 || to >= n) return el("span", "app-cp-walk-nav");
      const b = btn(dir === "prev" ? `‹ ${stepTitle(to)}` : `${stepTitle(to)} ›`, "app-link app-cp-walk-nav app-cp-walk-nav-" + dir);
      b.addEventListener("click", () => go(to));
      return b;
    };
    foot.append(name(step - 1, "prev"), name(step + 1, "next"));
    root.appendChild(foot);
  };

  const lineColour = "#26241f";
  const sparkColours = () => ({ good: o.ctx.stateColour("good"), bad: o.ctx.stateColour("bad"), line: lineColour });

  /** One metric as a tile: its name, the sparkline over its good band
   *  (or its state, for a good / bad or picklist metric), the reading. */
  const metricTile = (mv: MetricValue): HTMLElement => {
    const tile = el("div", "app-xs-metric");
    const name = el("div", "app-xs-metric-name", mv.name);
    name.title = mv.objective !== "" ? `${mv.name}: ${mv.objective}` : mv.name;
    tile.appendChild(name);
    const reading = mv.display !== "" ? mv.display : "No data";
    const plan = mv.target !== null ? ` · plan ${mv.target}${mv.unit}` : "";
    if (mv.tail.length > 0) {
      tile.appendChild(sparklineSvg(mv.tail, { target: mv.target, usl: mv.usl, lsl: mv.lsl, direction: mv.direction }, sparkColours(), 120, 40, `${mv.name}: ${reading}${plan}`));
    } else {
      const chip = el("div", "app-xs-metric-state" + (mv.display === "" ? " app-xs-metric-none" : ""), reading);
      if (mv.rag) chip.style.background = o.ctx.palette[ragPaletteKey(mv.rag)] ?? "";
      if (mv.rag) chip.classList.add("app-xs-metric-state-on");
      tile.appendChild(chip);
    }
    const num = el("div", "app-xs-metric-num", mv.tail.length > 0 ? `${reading}${plan}` : plan.replace(/^ · /, ""));
    if (mv.rag === "red" || mv.rag === "amber") num.style.color = o.ctx.stateColour("bad");
    tile.appendChild(num);
    return tile;
  };

  const metricTiles = (list: MetricValue[]): HTMLElement => {
    const box = el("div", "app-xs-metrics");
    for (const mv of list.slice(0, SUMMARY_METRIC_CAP)) box.appendChild(metricTile(mv));
    if (list.length > SUMMARY_METRIC_CAP) {
      const more = el("div", "app-xs-metric-more", `+${list.length - SUMMARY_METRIC_CAP}`);
      more.title = list.slice(SUMMARY_METRIC_CAP).map((m) => m.name).join("\n");
      box.appendChild(more);
    }
    return box;
  };

  type InitRow = ReturnType<LifecycleCtx["initiativesFor"]>[number];

  /** One initiative under an open priority. */
  const initiativeRow = (r: InitRow, isPrimary: boolean, p: Priority): HTMLElement => {
    const row = el("div", "app-xs-init");
    row.style.borderLeftColor = o.ctx.stateColour(r.status.state);
    const who = el("div", "app-xs-init-who");
    if (isPrimary) who.appendChild(el("div", "app-xs-tag", "Primary initiative"));
    const title = el("div", "app-xs-init-title");
    if (r.inheritedFrom !== "") title.appendChild(el("span", "app-cp-muted", `↓ ${r.inheritedFrom} `));
    title.appendChild(el("span", undefined, r.title));
    who.appendChild(title);
    const owner = el("div", "app-xs-owner", r.ownerName !== "" ? r.ownerName : "No owner");
    if (r.ownerTitle !== "") owner.title = `Owner: ${r.ownerTitle}`;
    who.appendChild(owner);
    // the status in words, and why — a colour alone is not an answer
    const words = el("div", "app-xs-init-status", (r.status.state === "flagged" ? "⚐ " : "") + statusWords(r.status));
    words.style.color = o.ctx.stateColour(r.status.state);
    who.appendChild(words);
    const why = reasonsLine(r.status);
    if (why !== "") who.appendChild(el("div", "app-xs-init-why", why));
    row.appendChild(who);

    const stage = el("div", "app-xs-stage");
    if (r.stagePdca !== "") {
      stage.appendChild(el("div", "app-xs-collabel", r.stageName));
      stage.appendChild(pdcaQuadrant(PDCA_INDEX[r.stagePdca] ?? 0, 44, lineColour, `${r.stageName} — ${PDCA_WORD[r.stagePdca] ?? ""}`));
    } else if (r.stageName !== "") {
      stage.appendChild(el("div", "app-xs-collabel", r.stageName));
    }
    row.appendChild(stage);

    const acts = el("div", "app-xs-actions");
    acts.appendChild(el("div", "app-xs-collabel", "Actions"));
    acts.appendChild(actionCircles(r.counts, o.ctx.stateColour, "m", true));
    if (r.counts.support > 0) acts.appendChild(el("div", "app-xs-support-count", `⚑ ${r.counts.support} need${r.counts.support === 1 ? "s" : ""} support`));
    row.appendChild(acts);

    row.appendChild(metricTiles(r.metrics));

    const support = el("div", "app-xs-support");
    if (r.status.state === "flagged") {
      support.appendChild(el("div", "app-xs-collabel app-xs-collabel-caps", "Support needed"));
      support.appendChild(el("div", "app-xs-support-text", r.flagNote !== "" ? r.flagNote : "Flagged — no note written"));
    }
    row.appendChild(support);

    if (r.boardId !== "") {
      row.classList.add("app-xs-init-link");
      row.tabIndex = 0;
      row.setAttribute("role", "link");
      row.title = "Open the initiative board";
      const open = () => {
        // Back returns to the summary where it was left (the screen
        // remembers the step and the open cards)
        o.onView?.();
        rememberBoardOrigin("#/priorities");
        window.location.hash = `#/board/${r.boardId}`;
      };
      row.addEventListener("click", open);
      row.addEventListener("keydown", (e) => {
        if (e.key === "Enter") open();
      });
    }
    void p;
    return row;
  };

  /** A priority: its status edge, counts and key metrics; open, its
   *  initiatives. */
  const row = (p: Priority): HTMLElement => {
    const data = o.ctx.data();
    const ps = priorityStatus(o.ctx.statusesFor(p).map((x) => x.state));
    const open = o.expanded.has(p.id);
    const card = el("div", "app-xs-card" + (open ? " app-xs-card-open" : ""));
    card.style.borderLeftColor = o.ctx.stateColour(ps.state);
    const head = el("div", "app-xs-head");
    const toggle = () => {
      if (open) o.expanded.delete(p.id);
      else o.expanded.add(p.id);
      o.onView?.();
      paint();
    };
    head.addEventListener("click", toggle);

    const who = el("div", "app-xs-who");
    const title = btn(p.statement, "app-link app-xs-title");
    title.title = "Open the priority";
    title.addEventListener("click", (e) => {
      e.stopPropagation();
      o.onOpen(p);
    });
    who.appendChild(title);
    who.appendChild(el("div", "app-xs-owner" + (p.ownerName !== "" ? "" : " app-cp-muted"), p.ownerName !== "" ? p.ownerName : "No owner"));
    // cascade lineage / sender flags stay in the detail overlay, not on
    // the card (Ben, 2026-08-19) — same rule as the matrix cards
    const flags = el("div", "app-cp-walk-flags");
    if (parentClosed(p, data.priorities)) flags.appendChild(el("span", "app-cp-flag app-cp-flag-amber", "▲ Parent completed — decide"));
    if (p.status !== "active") flags.appendChild(el("span", "app-cp-flag", p.status === "completed" ? "✓ Completed" : p.status === "archived" ? "▣ Archived" : "▣ Retired"));
    if (flags.childElementCount > 0) who.appendChild(flags);
    head.appendChild(who);

    const counts = el("div", "app-xs-countsbox");
    counts.appendChild(el("div", "app-xs-collabel", ps.total === 0 ? "No initiatives" : "Initiatives"));
    counts.appendChild(priorityCounts(ps, o.ctx.stateColour, "l", true));
    head.appendChild(counts);

    // the priority's key metrics — shown while it is closed; open, each
    // initiative carries its own and these would only repeat them
    head.appendChild(open ? el("div", "app-xs-metrics") : metricTiles(o.objectives(p)));

    const tools = el("div", "app-xs-tools");
    if (o.onMenu && (o.canMenu?.(p) ?? false) && !o.adoptedIds.has(p.id)) {
      const kebab = btn("⋮", "app-cp-kebab app-xs-kebab");
      kebab.title = "Edit · cascade · reorder · complete";
      kebab.addEventListener("click", (e) => {
        e.stopPropagation();
        o.onMenu?.(kebab, p);
      });
      tools.appendChild(kebab);
    }
    const chev = btn(open ? "▼" : "◀", "app-xs-chev");
    chev.setAttribute("aria-expanded", String(open));
    chev.setAttribute("aria-label", open ? "Close this priority" : "Open this priority to its initiatives");
    chev.title = open ? "Close" : "Show its initiatives";
    chev.addEventListener("click", (e) => {
      e.stopPropagation();
      toggle();
    });
    tools.appendChild(chev);
    head.appendChild(tools);
    card.appendChild(head);

    if (open) {
      const list = el("div", "app-xs-inits");
      const rows = o.ctx.initiativesFor(p);
      const shown = rows.filter((r) => !r.confidentialHidden);
      const primaryId = o.ctx.primaryOf(p)?.id ?? "";
      // the primary leads; then attention first — flagged, off track, on track
      const rank = (r: InitRow): number => (r.id === primaryId ? -1 : STATE_ORDER.indexOf(r.status.state));
      const ordered = shown.map((r, i) => ({ r, i })).sort((a, b) => rank(a.r) - rank(b.r) || a.i - b.i);
      for (const { r } of ordered) list.appendChild(initiativeRow(r, r.id === primaryId, p));
      if (rows.length === 0) list.appendChild(el("div", "app-cp-muted app-xs-none", "No initiatives are linked to this priority yet."));
      const hidden = rows.length - shown.length;
      if (hidden > 0) list.appendChild(el("div", "app-cp-muted app-xs-none", `${hidden} confidential initiative${hidden === 1 ? "" : "s"} not shown`));
      card.appendChild(list);
    }
    return card;
  };

  const go = (i: number) => {
    const n = stepCount();
    if (i < 0 || i >= n) return;
    step = i;
    o.onStep?.(i);
    paint();
  };

  // keyboard: ←/→ step, Esc = all objectives
  const onKey = (e: KeyboardEvent) => {
    if (document.querySelector(".app-modal-overlay, .app-cp-scrim")) return; // a dialog is up
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(step - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      go(step + 1);
    } else if (e.key === "Escape" && o.inline !== true) {
      e.preventDefault();
      o.onExit();
    }
  };
  document.addEventListener("keydown", onKey);
  // swipe on touch
  let sx: number | null = null;
  const onDown = (e: PointerEvent) => {
    if (e.pointerType === "mouse") return;
    sx = e.clientX;
  };
  const onUp = (e: PointerEvent) => {
    if (sx === null) return;
    const dx = e.clientX - sx;
    sx = null;
    if (Math.abs(dx) < 60) return;
    go(dx < 0 ? step + 1 : step - 1);
  };
  root.addEventListener("pointerdown", onDown);
  root.addEventListener("pointerup", onUp);

  paint();
  return () => {
    document.removeEventListener("keydown", onKey);
    root.remove();
  };
}
