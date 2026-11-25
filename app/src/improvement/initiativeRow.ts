// ONE initiative row (Ben, 2026-11-17: the priority popup, the
// Improvement list and the executive summary each drew an initiative
// their own way — three formats for one thing). Built once here and used
// by all three, under one header row:
//
//   Initiative | [extra columns] | Stage | Actions | Key metrics | [Support needed] | [tools]
//
//   · Initiative: a small-caps tag line — "PRIMARY INITIATIVE ·" when it
//     is the priority's primary, then the STATUS in its colour ("⚑ Support
//     needed", "Off track", "On track") and a small i that says why —
//     then the title, then one grey line (owner · context).
//   · Stage: the PDCA-tinted pill, a small PDCA disc leading it.
//   · Actions: three circles in a FIXED column, Done / Future / Late — the
//     header carries the captions directly over them.
//   · Key metrics: sparkline tiles.
//   · The primary wears a heavy border; its star (where a screen has one)
//     is the star alone.
// A screen adds only what it alone needs: the Improvement list its Org
// and Your role(s) columns, the popup its ★ and ⋮, the summary its
// Support needed column and a larger size. DOM only — the status is
// status.ts, the counts actionCounts, the metrics metricValues.

import { el } from "../../../shared/ui/dom";
import { pdcaQuadrant } from "../../../shared/ui/actionUi";
import type { MetricValue } from "./metricValues";
import { sparklineSvg } from "./sparkline";
import { ActionCounts, PriorityState, StatusResult, statusTag, whyLines } from "./status";
import { PDCA_TOKENS } from "./templateModel";

export type InitiativeRowLayout = "popup" | "register" | "summary";

export interface InitiativeRowData {
  title: string;
  /** The grey line under the title: owner · context. */
  sub: string;
  /** The grey line's tooltip (every owner, the org chain…). */
  subTitle?: string;
  /** On track / flagged / off track; null = not an active initiative
   *  (`statusText` says what it is instead: "completed", "archived"). */
  status: StatusResult | null;
  statusText?: string;
  /** What a flagged initiative has asked for. */
  flagNote: string;
  /** The priority's primary initiative: the tag and the heavy border. */
  primary: boolean;
  /** Extra small-caps tags after the status ("Confidential"). */
  tags?: string[];
  stageName: string;
  /** plan | do | check | act; "" = no stage to draw (a single action). */
  stagePdca: string;
  /** A line under the pill: who a gate waits on, the next gate's date. */
  stageNote?: { text: string; tone: "muted" | "mine" | "late"; title?: string };
  /** Done / future / late; null = not shown (not active). */
  counts: ActionCounts | null;
  metrics: MetricValue[];
}

export interface InitiativeRowOpts {
  layout: InitiativeRowLayout;
  /** A status state's colour (the site palette through the settings). */
  colour: (s: PriorityState) => string;
  /** A metric light's colour, for a good / bad or picklist metric. */
  metricColour: (rag: "green" | "amber" | "red") => string;
  /** The register's Org and Your role(s) cells, in the header's order. */
  extra?: HTMLElement[];
  /** The fixed cells at the right: the popup's ★ and ⋮, the register's ⋮. */
  tools?: HTMLElement[];
  onOpen?: () => void;
  openTitle?: string;
}

/** How many metric tiles a row shows before "+n". */
export const ROW_METRIC_CAP: Record<InitiativeRowLayout, number> = { popup: 2, register: 2, summary: 3 };

const PDCA_INDEX: Record<string, number> = { plan: 0, do: 1, check: 2, act: 3 };
const PDCA_WORD: Record<string, string> = { plan: "Plan", do: "Do", check: "Check", act: "Act" };

/** The header: the columns' names, the action captions over the circles. */
export function initiativeRowHead(layout: InitiativeRowLayout, extra: string[] = [], tools = 0): HTMLElement {
  const h = el("div", `app-ir-head app-ir-${layout}`);
  h.appendChild(el("span", undefined, "Initiative"));
  for (const x of extra) h.appendChild(el("span", "app-ir-extra", x));
  h.appendChild(el("span", undefined, "Stage"));
  const acts = el("span", "app-ir-actshead");
  acts.append(el("span", undefined, "Actions"), actionCaptions());
  h.appendChild(acts);
  h.appendChild(el("span", "app-ir-metricscol", "Key metrics"));
  if (layout === "summary") h.appendChild(el("span", "app-ir-supportcol", "Support needed"));
  for (let i = 0; i < tools; i++) h.appendChild(el("span", "app-ir-tool"));
  return h;
}

/** "Done  Future  Late", each over its circle. */
function actionCaptions(): HTMLElement {
  const c = el("span", "app-ir-actcap");
  for (const w of ["Done", "Future", "Late"]) c.appendChild(el("span", undefined, w));
  return c;
}

/** The stage: its PDCA-tinted pill with a small disc leading it. */
export function stagePill(name: string, pdca: string, size = 13): HTMLElement {
  const pill = el("span", "app-ir-pill");
  const tokens = PDCA_TOKENS[pdca as keyof typeof PDCA_TOKENS];
  if (tokens) {
    pill.style.color = tokens.fg;
    pill.style.background = tokens.bg;
    pill.appendChild(pdcaQuadrant(PDCA_INDEX[pdca] ?? 0, size, tokens.fg, PDCA_WORD[pdca] ?? ""));
  }
  pill.appendChild(el("span", undefined, name));
  pill.title = PDCA_WORD[pdca] ? `${name} — ${PDCA_WORD[pdca]}` : name;
  return pill;
}

/** What a metric tile says on hover — the numbers it no longer prints. */
export function metricTileTitle(mv: MetricValue): string {
  const head = mv.objective !== "" ? `${mv.name}: ${mv.objective}` : mv.name;
  const reading = mv.display !== "" ? mv.display : "No data";
  const plan = mv.target !== null ? ` · plan ${mv.target}${mv.unit}` : "";
  // a stale metric says so (programme D1) — the reading is an old one
  return `${head} — ${reading}${plan}${mv.stale !== "" ? ` · ${mv.stale}` : ""}`;
}

/** One metric as a tile: its caption, then the sparkline over its good
 *  band (or its state as a chip where there is no trend to draw). NO
 *  numbers (Ben, 2026-11-18): the line that read "92% · plan 100%" gave
 *  its height to the chart; the reading, the plan and the limits are the
 *  tooltip. `caption` defaults to the metric's name. */
export function metricTile(mv: MetricValue, o: Pick<InitiativeRowOpts, "colour" | "metricColour">, h = 36, caption = ""): HTMLElement {
  const tile = el("div", "app-ir-metric");
  const title = metricTileTitle(mv);
  tile.title = title;
  const name = el("div", "app-ir-metric-name");
  // stale (programme D1): a mark, no words — the tile carries no numbers.
  // The chart fades and a small clock LEADS the caption (a long caption
  // is cut at its end); the tooltip says "No reading for 9 weeks".
  if (mv.stale !== "") {
    tile.classList.add("app-ir-metric-stale");
    const mark = el("span", "app-ir-metric-stalemark", "◷ ");
    mark.setAttribute("aria-label", mv.stale);
    name.appendChild(mark);
  }
  name.appendChild(document.createTextNode(caption !== "" ? caption : mv.name));
  tile.appendChild(name);
  if (mv.tail.length > 0) {
    tile.appendChild(sparklineSvg(mv.tail, { target: mv.target, usl: mv.usl, lsl: mv.lsl, direction: mv.direction }, { good: o.colour("good"), bad: o.colour("bad"), line: "#26241f" }, 92, h, title));
  } else {
    const chip = el("div", "app-ir-metric-state" + (mv.display === "" ? " app-ir-metric-none" : ""), mv.display !== "" ? mv.display : "No data");
    if (mv.rag) {
      chip.style.background = o.metricColour(mv.rag);
      chip.classList.add("app-ir-metric-state-on");
    }
    tile.appendChild(chip);
  }
  return tile;
}

/** A priority's objectives inside its tile (Ben, 2026-11-18 — they were
 *  a row of their own under the priorities): two charts to a row, as
 *  many rows as it takes, each titled by the objective's own words, or
 *  the metric's name where none were written. */
export function objectiveCharts(list: MetricValue[], o: Pick<InitiativeRowOpts, "colour" | "metricColour">): HTMLElement {
  const box = el("div", "app-cp-objcharts");
  for (const mv of list) box.appendChild(metricTile(mv, o, 28, mv.objective !== "" ? mv.objective : mv.name));
  return box;
}

/** A row's (or a priority card's) metric tiles: `cap`, then "+n". */
export function metricTiles(list: MetricValue[], cap: number, o: Pick<InitiativeRowOpts, "colour" | "metricColour">, h = 36, none = ""): HTMLElement {
  const box = el("div", "app-ir-metrics");
  for (const mv of list.slice(0, cap)) box.appendChild(metricTile(mv, o, h));
  if (list.length > cap) {
    const more = el("div", "app-ir-metric-more", `+${list.length - cap}`);
    more.title = list.slice(cap).map((m) => m.name).join("\n");
    box.appendChild(more);
  }
  if (list.length === 0 && none !== "") box.appendChild(el("span", "app-ir-none", none));
  return box;
}

export function initiativeRow(d: InitiativeRowData, o: InitiativeRowOpts): HTMLElement {
  const row = el("div", `app-ir-row app-ir-${o.layout}` + (d.primary ? " app-ir-primary" : ""));
  row.style.borderLeftColor = o.colour(d.status ? d.status.state : "none");

  // ---- the name: tag line, title, one grey line ---------------------------
  const name = el("div", "app-ir-name");
  const tagline = el("div", "app-ir-tagline");
  const tag = (text: string, cls = ""): HTMLElement => el("span", "app-ir-tag" + (cls !== "" ? ` ${cls}` : ""), text);
  if (d.primary) tagline.append(tag("Primary initiative"), tag("·", "app-ir-tagsep"));
  let why: HTMLElement | null = null;
  if (d.status) {
    const st = tag((d.status.state === "flagged" ? "⚑ " : "") + statusTag(d.status), "app-ir-status");
    st.style.color = o.colour(d.status.state);
    tagline.appendChild(st);
    const lines = whyLines(d.status, d.flagNote);
    if (lines.length > 0) {
      // the small i: the reasons on hover, and on a tap for a wall
      // screen or a phone where nothing hovers
      const info = el("button", "app-ir-info", "i") as HTMLButtonElement;
      info.type = "button";
      info.title = lines.join("\n");
      info.setAttribute("aria-label", `Why: ${lines.join("; ")}`);
      info.setAttribute("aria-expanded", "false");
      const box = el("div", "app-ir-why");
      for (const l of lines) box.appendChild(el("div", undefined, l));
      box.style.display = "none";
      info.addEventListener("click", (e) => {
        e.stopPropagation();
        const open = box.style.display === "none";
        box.style.display = open ? "" : "none";
        info.setAttribute("aria-expanded", String(open));
      });
      tagline.appendChild(info);
      why = box;
    }
  } else if ((d.statusText ?? "") !== "") {
    tagline.appendChild(tag(d.statusText ?? ""));
  }
  for (const t of d.tags ?? []) tagline.append(tag("·", "app-ir-tagsep"), tag(t));
  if (tagline.childElementCount > 0) name.appendChild(tagline);
  name.appendChild(el("div", "app-ir-title", d.title));
  if (d.sub !== "") {
    const sub = el("div", "app-ir-sub", d.sub);
    if (d.subTitle) sub.title = d.subTitle;
    name.appendChild(sub);
  }
  if (why) name.appendChild(why);
  row.appendChild(name);

  for (const x of o.extra ?? []) {
    x.classList.add("app-ir-extra");
    row.appendChild(x);
  }

  // ---- stage ----------------------------------------------------------------
  const stage = el("div", "app-ir-stage");
  if (d.stagePdca !== "") stage.appendChild(stagePill(d.stageName, d.stagePdca, o.layout === "summary" ? 17 : 13));
  else if (d.stageName !== "") stage.appendChild(el("span", "app-ir-none", d.stageName));
  if (d.stageNote) {
    const note = el("div", `app-ir-stagenote app-ir-stagenote-${d.stageNote.tone}`, d.stageNote.text);
    if (d.stageNote.title) note.title = d.stageNote.title;
    if (d.stageNote.tone === "late") note.style.color = o.colour("bad");
    stage.appendChild(note);
  }
  row.appendChild(stage);

  // ---- actions: three circles, a fixed column ------------------------------------
  const acts = el("div", "app-ir-actions");
  if (d.counts && d.counts.total > 0) {
    // the captions again, for the widths where the header has gone
    acts.appendChild(actionCaptions());
    const dots = el("div", "app-ir-dots");
    dots.title = `${d.counts.done} done · ${d.counts.future} future · ${d.counts.late} late`;
    const dot = (n: number, colour: string, word: string) => {
      const c = el("span", "app-st-dot app-ir-dot" + (n === 0 ? " app-ir-dot-zero" : ""), String(n));
      c.style.background = colour;
      c.setAttribute("aria-label", `${n} ${word}`);
      dots.appendChild(c);
    };
    dot(d.counts.done, o.colour("good"), "done");
    dot(d.counts.future, o.colour("none"), "future");
    dot(d.counts.late, o.colour("bad"), "late");
    acts.appendChild(dots);
    if (d.counts.support > 0) acts.appendChild(el("div", "app-ir-actsupport", `⚑ ${d.counts.support} need${d.counts.support === 1 ? "s" : ""} support`));
  } else if (d.counts) {
    acts.appendChild(el("span", "app-ir-none", "No actions"));
  }
  row.appendChild(acts);

  // ---- key metrics ----------------------------------------------------------------
  const metrics = metricTiles(d.metrics, ROW_METRIC_CAP[o.layout], o, o.layout === "summary" ? 52 : 36, "No metric set");
  metrics.classList.add("app-ir-metricscol");
  row.appendChild(metrics);

  // ---- support needed (the summary's last column) ----------------------------------
  if (o.layout === "summary") {
    const sup = el("div", "app-ir-supportcol app-ir-support");
    if (d.status?.state === "flagged") sup.textContent = d.flagNote.trim() !== "" ? d.flagNote : "No note written";
    row.appendChild(sup);
  }

  for (const t of o.tools ?? []) {
    t.classList.add("app-ir-tool");
    row.appendChild(t);
  }

  if (o.onOpen) {
    const open = o.onOpen;
    row.classList.add("app-ir-link");
    row.tabIndex = 0;
    row.setAttribute("role", "link");
    if (o.openTitle) row.title = o.openTitle;
    row.addEventListener("click", open);
    row.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && e.target === row) open();
    });
  }
  return row;
}

/** The order rows stand in under a priority: its primary first, then
 *  what needs attention — support needed, off track, on track. */
export function rowRank(state: "good" | "flagged" | "bad", primary: boolean): number {
  if (primary) return -1;
  return state === "flagged" ? 0 : state === "bad" ? 1 : 2;
}
