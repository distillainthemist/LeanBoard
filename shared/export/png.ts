// Snapshot machinery. An HTML card is wrapped in an SVG <foreignObject>,
// giving vector markup that is small, crisp at any size, and what the board
// stores as a card's tile.
//
// Two entry points, deliberately separate:
//   htmlToSvg — markup only. This is the hot path: every debounced card edit
//               takes a snapshot, and the board only ever keeps the markup.
//   htmlToPng — markup PLUS a rasterised 2× PNG data URI, for the kebab's
//               "Download PNG" alone. Rasterising costs an Image decode and
//               a canvas draw, so nothing on the edit path should call it.
//               When a host refuses to rasterise, the export is skipped
//               silently.
//
// Caveat: foreignObject SVGs render in documents but Safari can refuse them
// inside <img>; BoardGrid therefore renders tiles inline rather than as
// image sources.

import { SVG_NS } from "../ui/dom";

function rasterize(
  svgMarkup: string,
  width: number,
  height: number,
  background: string,
  scale: number,
  onReady: (dataUri: string) => void
): void {
  const src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgMarkup);
  const img = new Image();
  img.onload = () => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      onReady(canvas.toDataURL("image/png"));
    } catch {
      /* rasterisation unavailable in this host — skip silently */
    }
  };
  img.src = src;
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/** The mark put on the root and on every scrolling box under it while a
 *  FULL picture is measured and cloned: the boxes stop scrolling and
 *  grow to what they hold. */
const FULL_ATTR = "data-ltk-export-full";
const FULL_CSS = `[${FULL_ATTR}]{overflow:visible !important;height:auto !important;max-height:none !important;}`;

/** The class names of a page's own styles that a subtree uses, as the
 *  rules that carry them (2026-11-25, programme E6). A control packs its
 *  OWN stylesheet into its picture; content a host renders inside it —
 *  the app's Gantt in the Action card — is styled by the page, and came
 *  out bare. This gathers the page's rules for the classes actually
 *  present (and the page's custom properties), whatever the host is. */
export function cssForSubtree(root: HTMLElement, prefix = "app-"): string {
  const classes = new Set<string>();
  for (const node of [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))]) {
    for (const c of Array.from(node.classList)) if (c.startsWith(prefix)) classes.add(c);
  }
  if (classes.size === 0) return "";
  const escaped = [...classes].map((c) => c.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&"));
  const uses = new RegExp(`\\.(?:${escaped.join("|")})(?![\\w-])`);
  const out: string[] = [];
  const walk = (rules: CSSRuleList): string[] => {
    const kept: string[] = [];
    for (const rule of Array.from(rules)) {
      const style = rule as CSSStyleRule;
      if (typeof style.selectorText === "string") {
        if (style.selectorText === ":root" || uses.test(style.selectorText)) kept.push(style.cssText);
        continue;
      }
      const group = rule as CSSGroupingRule;
      if (group.cssRules && typeof (rule as CSSMediaRule).conditionText === "string") {
        const inner = walk(group.cssRules);
        if (inner.length > 0) kept.push(`@media ${(rule as CSSMediaRule).conditionText}{${inner.join("")}}`);
      }
    }
    return kept;
  };
  for (const sheet of Array.from(root.ownerDocument.styleSheets)) {
    try {
      out.push(...walk(sheet.cssRules));
    } catch {
      /* a stylesheet from another origin cannot be read: skipped */
    }
  }
  return out.join("\n");
}

/** Serialise an HTML element into standalone SVG markup via <foreignObject>.
 *  `full`: the WHOLE of it — every box under it that scrolls is opened
 *  out, so the picture holds what is scrolled out of view as well (the
 *  Gantt's every row and its whole range). */
function snapshot(
  root: HTMLElement,
  css: string,
  background: string,
  full = false
): { markup: string; width: number; height: number } | null {
  let width = root.clientWidth;
  let height = root.clientHeight;
  if (width <= 0 || height <= 0) return null;
  const marked: HTMLElement[] = [];
  if (full) {
    const win = root.ownerDocument.defaultView;
    for (const node of [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))]) {
      const cs = win ? win.getComputedStyle(node) : null;
      const scrolls = cs !== null && (/(auto|scroll)/.test(cs.overflowX) || /(auto|scroll)/.test(cs.overflowY));
      if (node === root || (scrolls && (node.scrollWidth > node.clientWidth || node.scrollHeight > node.clientHeight))) marked.push(node);
    }
    for (const node of marked) node.setAttribute(FULL_ATTR, "");
    // the rule that opens the marked boxes out, in the PAGE for the
    // moment of measuring (no paint happens in between) — the picture
    // carries its own copy
    const rule = root.ownerDocument.createElement("style");
    rule.textContent = FULL_CSS;
    root.ownerDocument.head.appendChild(rule);
    width = Math.max(width, root.scrollWidth);
    height = Math.max(height, root.scrollHeight);
    rule.remove();
  }
  const clone = root.cloneNode(true) as HTMLElement;
  for (const node of marked) node.removeAttribute(FULL_ATTR);
  if (full) {
    clone.style.width = `${width}px`;
    clone.style.minHeight = `${height}px`;
    css = `${css}\n${FULL_CSS}`;
  }
  clone.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  const markup =
    `<svg xmlns="${SVG_NS}" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<style>${css}</style>` +
    `<rect width="100%" height="100%" fill="${escapeAttr(background)}"/>` +
    `<foreignObject width="100%" height="100%">` +
    new XMLSerializer().serializeToString(clone) +
    `</foreignObject></svg>`;
  return { markup, width, height };
}

/**
 * Snapshot an HTML element to SVG markup — the tile the board stores.
 * Synchronous work only: no Image decode, no canvas. Use this on the edit
 * path; `htmlToPng` is for explicit downloads.
 */
export function htmlToSvg(
  root: HTMLElement,
  css: string,
  background: string,
  onReady: (svgMarkup: string) => void,
  full = false
): void {
  const shot = snapshot(root, css, background, full);
  if (shot) onReady(shot.markup);
}

/**
 * Snapshot an HTML element and rasterise it to a 2× PNG data URI. Only the
 * kebab's "Download PNG" needs this — see the note at the top of the file.
 */
export function htmlToPng(
  root: HTMLElement,
  css: string,
  background: string,
  onReady: (dataUri: string, svgMarkup: string) => void,
  full = false
): void {
  const shot = snapshot(root, css, background, full);
  if (!shot) return;
  rasterize(shot.markup, shot.width, shot.height, background, 2, (uri) =>
    onReady(uri, shot.markup)
  );
}

/** Save SVG markup to a downloaded .svg file. */
export function saveSvg(svg: string, filename: string): void {
  if (!svg) return;
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** The schedulers with a picture still waiting on its delay. */
const waitingSnapshots = new Set<SnapshotScheduler>();

/** Draw every waiting picture NOW (2026-11-25, programme E8). A card
 *  left inside the delay was saved with the picture of the edit before:
 *  the save was flushed, the picture's timer was cancelled with the
 *  editor. The picture is the record's — a closed meeting and a gate
 *  snapshot stamp it. Drawing is synchronous, so a host calls this just
 *  before it flushes its saves and the save carries the fresh picture.
 *  Returns how many were drawn. */
export function flushPendingSnapshots(): number {
  let n = 0;
  for (const s of [...waitingSnapshots]) {
    if (s.flush()) n++;
  }
  return n;
}

/** Debounced snapshot scheduling (the Fishbone 400 ms pattern). */
export class SnapshotScheduler {
  private timer: ReturnType<typeof setTimeout> | null = null;
  constructor(
    private readonly generate: () => void,
    private readonly delayMs = 400
  ) {}
  schedule(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.run(), this.delayMs);
    waitingSnapshots.add(this);
  }
  cancel(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    waitingSnapshots.delete(this);
  }
  /** Draw now if a picture is waiting; true when one was. */
  flush(): boolean {
    if (this.timer === null) return false;
    clearTimeout(this.timer);
    this.run();
    return true;
  }
  private run(): void {
    this.timer = null;
    waitingSnapshots.delete(this);
    try {
      this.generate();
    } catch (err) {
      // a picture that cannot be drawn must never stop a save
      console.warn("snapshot failed", err);
    }
  }
}
