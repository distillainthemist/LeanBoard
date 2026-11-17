// A metric's sparkline (2026-11-17, the executive summary): the last
// readings as a line over a band that says where GOOD is — green where
// the metric is on plan, red where it is not — from the target, the
// limits and the good direction. Geometry is pure and tested; one small
// SVG builder draws it. Colours come from the caller (the state palette).

export interface SparkSpec {
  target: number | null;
  usl: number | null;
  lsl: number | null;
  direction: "up" | "down" | "range";
}

export interface SparkBand {
  /** Top edge and height, in the box's own units. */
  y: number;
  h: number;
  good: boolean;
}

export interface SparkGeometry {
  /** The line's points, oldest first. One reading gives one point. */
  points: { x: number; y: number }[];
  /** Good / not-good bands, top to bottom; empty when the metric has no
   *  target or limit to judge by. */
  bands: SparkBand[];
}

/** Where good lies on the value axis: [lo, hi], an open end as ±Infinity;
 *  null when nothing says (no target, no limit). Short of plan and
 *  outside the limits are both NOT good — the status rule's reading. */
export function goodInterval(spec: SparkSpec): { lo: number; hi: number } | null {
  let lo = -Infinity;
  let hi = Infinity;
  if (spec.direction === "up") {
    if (spec.target !== null) lo = spec.target;
    else if (spec.lsl !== null) lo = spec.lsl;
    if (spec.usl !== null) hi = spec.usl;
  } else if (spec.direction === "down") {
    if (spec.target !== null) hi = spec.target;
    else if (spec.usl !== null) hi = spec.usl;
    if (spec.lsl !== null) lo = spec.lsl;
  } else {
    if (spec.lsl !== null) lo = spec.lsl;
    if (spec.usl !== null) hi = spec.usl;
  }
  if (lo === -Infinity && hi === Infinity) return null;
  // a spec that contradicts itself (target above the upper limit) judges nothing
  if (lo > hi) return null;
  return { lo, hi };
}

/** Lay `values` out in a `w` × `h` box with `pad` clear at top and
 *  bottom. The value axis spans the readings AND the spec's own numbers,
 *  so the band edge is always in the picture. */
export function sparkGeometry(values: number[], spec: SparkSpec, w: number, h: number, pad = 3): SparkGeometry {
  const vals = values.filter((v) => Number.isFinite(v));
  const good = goodInterval(spec);
  const marks = [...vals];
  if (good) {
    if (Number.isFinite(good.lo)) marks.push(good.lo);
    if (Number.isFinite(good.hi)) marks.push(good.hi);
  }
  if (marks.length === 0) return { points: [], bands: [] };
  let min = Math.min(...marks);
  let max = Math.max(...marks);
  if (min === max) {
    // a flat line (or one reading on its target): give the axis some room
    const room = Math.abs(min) > 0 ? Math.abs(min) * 0.1 : 1;
    min -= room;
    max += room;
  } else {
    const room = (max - min) * 0.12;
    min -= room;
    max += room;
  }
  const yOf = (v: number): number => pad + (1 - (v - min) / (max - min)) * (h - 2 * pad);
  const clampY = (y: number): number => Math.max(0, Math.min(h, y));
  const points = vals.map((v, i) => ({ x: vals.length === 1 ? w / 2 : (i / (vals.length - 1)) * w, y: yOf(v) }));
  const bands: SparkBand[] = [];
  if (good) {
    const top = Number.isFinite(good.hi) ? clampY(yOf(good.hi)) : 0;
    const bottom = Number.isFinite(good.lo) ? clampY(yOf(good.lo)) : h;
    if (top > 0) bands.push({ y: 0, h: top, good: false });
    if (bottom > top) bands.push({ y: top, h: bottom - top, good: true });
    if (bottom < h) bands.push({ y: bottom, h: h - bottom, good: false });
  }
  return { points, bands };
}

const NS = "http://www.w3.org/2000/svg";

export interface SparkColours {
  good: string;
  bad: string;
  line: string;
}

/** The drawn sparkline. `w` × `h` are its natural size; it scales with
 *  its box (viewBox). */
export function sparklineSvg(values: number[], spec: SparkSpec, colours: SparkColours, w = 120, h = 40, label = ""): SVGSVGElement {
  const g = sparkGeometry(values, spec, w, h);
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.setAttribute("class", "app-spark");
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("role", "img");
  if (label !== "") {
    svg.setAttribute("aria-label", label);
    const t = document.createElementNS(NS, "title");
    t.textContent = label;
    svg.appendChild(t);
  }
  if (g.bands.length === 0) {
    const bg = document.createElementNS(NS, "rect");
    bg.setAttribute("width", String(w));
    bg.setAttribute("height", String(h));
    bg.setAttribute("class", "app-spark-plain");
    svg.appendChild(bg);
  }
  for (const b of g.bands) {
    const r = document.createElementNS(NS, "rect");
    r.setAttribute("x", "0");
    r.setAttribute("y", b.y.toFixed(2));
    r.setAttribute("width", String(w));
    r.setAttribute("height", b.h.toFixed(2));
    r.style.fill = b.good ? colours.good : colours.bad;
    r.style.opacity = "0.26";
    svg.appendChild(r);
  }
  if (g.points.length > 1) {
    const line = document.createElementNS(NS, "polyline");
    line.setAttribute("points", g.points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" "));
    line.setAttribute("fill", "none");
    line.setAttribute("vector-effect", "non-scaling-stroke");
    line.style.stroke = colours.line;
    line.style.strokeWidth = "1.6";
    line.style.strokeLinejoin = "round";
    svg.appendChild(line);
  }
  const last = g.points[g.points.length - 1];
  if (last) {
    const dot = document.createElementNS(NS, "circle");
    dot.setAttribute("cx", Math.max(2.5, Math.min(w - 2.5, last.x)).toFixed(2));
    dot.setAttribute("cy", last.y.toFixed(2));
    dot.setAttribute("r", "2.5");
    dot.style.fill = colours.line;
    svg.appendChild(dot);
  }
  return svg;
}
