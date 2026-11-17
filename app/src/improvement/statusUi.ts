// The status rule's shared pictures (2026-11-17): the three count
// circles (On track / Flagged / Off track, or Done / Future / Late) and a
// state chip. DOM only — the rule itself is status.ts. Every surface
// draws its counts through here so they can never look two ways.

import { el } from "../../../shared/ui/dom";
import { ActionCounts, COUNT_ORDER, countsWords, PriorityState, PriorityStatus, STATE_LABELS, StatusResult, statusWords, reasonsLine } from "./status";

export type CountSize = "xs" | "s" | "m" | "l";

export interface CountCell {
  label: string;
  count: number;
  colour: string;
}

/** A row of filled count circles. `labels`: the word over each circle
 *  (the summary) — without them the word is the circle's tooltip. A zero
 *  is drawn faint, never left out: the three always stand in the same
 *  places. */
export function countCircles(cells: CountCell[], size: CountSize, labels: boolean, title = ""): HTMLElement {
  const row = el("div", `app-st-counts app-st-counts-${size}${labels ? " app-st-counts-labelled" : ""}`);
  if (title !== "") row.title = title;
  for (const c of cells) {
    const cell = el("div", "app-st-count" + (c.count === 0 ? " app-st-count-zero" : ""));
    if (labels) cell.appendChild(el("div", "app-st-count-label", c.label));
    const dot = el("div", "app-st-dot", String(c.count));
    dot.style.background = c.colour;
    if (!labels) dot.title = `${c.count} ${c.label.toLowerCase()}`;
    dot.setAttribute("aria-label", `${c.count} ${c.label.toLowerCase()}`);
    cell.appendChild(dot);
    row.appendChild(cell);
  }
  return row;
}

/** A priority's three counts. */
export function priorityCounts(p: PriorityStatus, colour: (s: PriorityState) => string, size: CountSize, labels: boolean): HTMLElement {
  return countCircles(
    COUNT_ORDER.map((s) => ({ label: STATE_LABELS[s], count: p.counts[s], colour: colour(s) })),
    size,
    labels,
    labels ? "" : countsWords(p)
  );
}

/** An initiative's actions: Done / Future / Late. Future is neutral —
 *  the flagged colour means one thing only. */
export function actionCircles(c: ActionCounts, colour: (s: PriorityState) => string, size: CountSize, labels: boolean): HTMLElement {
  return countCircles(
    [
      { label: "Done", count: c.done, colour: colour("good") },
      { label: "Future", count: c.future, colour: colour("none") },
      { label: "Late", count: c.late, colour: colour("bad") },
    ],
    size,
    labels,
    labels ? "" : `${c.done} done · ${c.future} future · ${c.late} late`
  );
}

/** "Flagged · recovery needed" as a chip in its state's colour. */
export function statusChip(s: StatusResult, colour: (st: PriorityState) => string): HTMLElement {
  const chip = el("span", `app-st-chip app-st-chip-${s.state}`, (s.state === "flagged" ? "⚐ " : "") + statusWords(s));
  const c = colour(s.state);
  chip.style.color = c;
  chip.style.borderColor = c;
  const why = reasonsLine(s, 8);
  if (why !== "") chip.title = why;
  return chip;
}
