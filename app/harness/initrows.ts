// The ONE initiative row (improvement/initiativeRow.ts) in its two list
// layouts — the priority popup's and the Improvement list's — with stub
// data. The executive summary's is on walk.html.
import "../src/style.css";
import { initiativeRow, InitiativeRowData, initiativeRowHead, objectiveCharts, rowRank } from "../src/improvement/initiativeRow";
import type { MetricValue } from "../src/improvement/metricValues";
import { DEFAULT_STATUS_SETTINGS, initiativeStatus, statusColour, StatusInput } from "../src/improvement/status";

const palette: Record<string, string> = { good: "#107c10", atrisk: "#c19c00", issue: "#d13438", neutral: "#808080", flagged: "#7b3fa0" };
const colour = (s: "good" | "flagged" | "bad" | "none") => statusColour(s, DEFAULT_STATUS_SETTINGS, palette);
const metricColour = (rag: "green" | "amber" | "red") => ({ green: palette.good, amber: palette.atrisk, red: palette.issue })[rag];
const mv = (name: string, tail: number[], target: number | null, direction: "up" | "down" | "range", rag: MetricValue["rag"], extra: Partial<MetricValue> = {}): MetricValue => ({ key: name, name, unit: "", last: tail[tail.length - 1] ?? null, display: tail.length > 0 ? String(tail[tail.length - 1]) : "", target, rag, starred: true, objective: "", tail, usl: null, lsl: null, direction, ...extra });
const Y = mv("Yield", [20, 35, 44, 49, 51, 51], 50, "up", "green");
const P = mv("Production", [3.6, 3.4, 3.8, 4], 5, "range", "amber", { lsl: 4.5, usl: 6 });
const A = mv("Audit status", [], null, "up", "green", { display: "On track" });
const st = (over: Partial<StatusInput>) => initiativeStatus({ flagged: false, createdAt: "2026-01-01T00:00:00Z", lastUpdateAt: "2026-11-10T00:00:00Z", actions: { total: 3, done: 1, future: 2, late: 0, support: 0 }, metrics: [], ...over }, DEFAULT_STATUS_SETTINGS, "2026-11-17");
const c = (done: number, future: number, late: number, support = 0) => ({ total: done + future + late, done, future, late, support });
const rows: (InitiativeRowData & { reg: [string, string, string] })[] = [
  { title: "LiF Plan on a Page", sub: "Ben Pechey · This org", status: st({ actions: c(0, 1, 0), metrics: [{ name: "Production", rag: "amber" }], lastUpdateAt: "2026-09-28T00:00:00Z" }), flagNote: "", primary: true, stageName: "Plan", stagePdca: "plan", counts: c(0, 1, 0), metrics: [Y, P, A], reg: ["Mine", "Owner", "A3"] },
  { title: "Fix this thing", sub: "Ben Pechey · This org", status: st({ flagged: true, actions: c(1, 5, 1, 1), lastUpdateAt: "2026-08-30T00:00:00Z" }), flagNote: "Two fitters for one shift", primary: false, stageName: "Define", stagePdca: "plan", counts: c(1, 5, 1, 1), metrics: [], reg: ["Mine", "Finance Lead, Owner", "Greenbelt · DMAIC"] },
  { title: "Test problem", sub: "Ben Pechey · This org", status: st({ actions: c(1, 1, 1), lastUpdateAt: "", createdAt: "2026-06-01T00:00:00Z" }), flagNote: "", primary: false, stageName: "Define", stagePdca: "plan", stageNote: { text: "awaiting Sponsor", tone: "muted" }, counts: c(1, 1, 1), metrics: [], reg: ["Mine", "Finance Lead, Owner", "Greenbelt · DMAIC"] },
  { title: "Embed the bottling checks across every line and shift", sub: "Smith, Jane & Lee, Sam · ↓ Packaging", status: st({ actions: c(4, 2, 0), flagged: true }), flagNote: "", primary: false, stageName: "Confirm", stagePdca: "check", stageNote: { text: "12 Nov", tone: "late" }, counts: c(4, 2, 0), metrics: [A], reg: ["Packaging", "—", "A3"] },
  { title: "Light curtain standard", sub: "Jukes, Emily · This org", status: st({ actions: c(2, 0, 0) }), flagNote: "", primary: false, stageName: "Embed", stagePdca: "act", counts: c(2, 0, 0), metrics: [Y], reg: ["Mine", "—", "A3"] },
  { title: "A single action", sub: "Hall, Tom · This org", status: st({ actions: c(0, 0, 0) }), flagNote: "", primary: false, stageName: "single action", stagePdca: "", counts: c(0, 0, 0), metrics: [], reg: ["Mine", "—", ""] },
];
const cell = (text: string, cls = "app-im-cell") => {
  const d = document.createElement("div");
  d.className = cls;
  d.textContent = text;
  return d;
};
const tool = (text: string) => {
  const s = document.createElement("span");
  const b = document.createElement("button");
  b.type = "button";
  b.className = text === "⋮" ? "app-cp-kebab app-im-kebab" : "app-link app-cp-ov-star" + (text === "★" ? " app-cp-ov-star-on" : "");
  b.textContent = text;
  s.appendChild(b);
  if (text !== "⋮") s.className = "app-ir-starcell";
  return s;
};
const log: string[] = [];
(window as unknown as { log: string[] }).log = log;

const pop = document.getElementById("pop")!;
const list = document.createElement("div");
list.className = "app-ir-list";
list.appendChild(initiativeRowHead("popup", [], 2));
const ordered = rows.map((r, i) => ({ r, i })).sort((a, b) => rowRank(a.r.status!.state, a.r.primary) - rowRank(b.r.status!.state, b.r.primary) || a.i - b.i);
for (const { r } of ordered) list.appendChild(initiativeRow(r, { layout: "popup", colour, metricColour, tools: [tool(r.primary ? "★" : "☆"), tool("⋮")], onOpen: () => log.push(`open ${r.title}`) }));
pop.appendChild(list);

const reg = document.getElementById("reg")!;
const table = document.createElement("div");
table.className = "app-im-table";
table.appendChild(initiativeRowHead("register", ["Org", "Your role(s)"], 1));
for (const r of rows) table.appendChild(initiativeRow({ ...r, primary: false, sub: [r.sub.split(" · ")[0], "Leadership in the Field is awesome", r.reg[2]].filter((x) => x !== "").join(" · "), tags: r.title === "Test problem" ? ["◈ Confidential"] : [] }, { layout: "register", colour, metricColour, extra: [cell(r.reg[0]), cell(r.reg[1])], tools: [tool("⋮")], onOpen: () => log.push(`open ${r.title}`) }));
table.appendChild(initiativeRow({ title: "A completed initiative", sub: "Hall, Tom · Changeover under 25 minutes", status: null, statusText: "completed", flagNote: "", primary: false, stageName: "", stagePdca: "", counts: null, metrics: [] }, { layout: "register", colour, metricColour, extra: [cell("Mine"), cell("—")], tools: [tool("⋮")] }));
reg.appendChild(table);

// A priority TILE carrying its objectives (2026-11-18): two charts to a
// row, titled by the objective's words (or the metric's name), no
// numbers; a third and a fifth wrap under; a state chip where there is
// no trend. Three widths: comfortable, compact, and the narrow "scroll".
const tiles = document.getElementById("tiles");
if (tiles) {
  const O = (m: MetricValue, objective: string): MetricValue => ({ ...m, objective });
  const sets: [string, MetricValue[]][] = [
    ["Zero Harm - Critical Risk Management (CRM) Maturity Uplift", [O(Y, "CRM verifications completed against plan"), O(P, ""), O(A, "Audit actions closed on time")]],
    ["Improve Everyday Respect for Our Teams", [O(Y, "Every leader completes the respect module"), O(P, "Engagement score"), O(A, ""), O(Y, ""), O(P, "A fifth objective with a long description that must cut off")]],
    ["Leadership Capability Uplift", []],
  ];
  for (const [cls, width] of [["app-cp-comfortable", 300], ["app-cp-compact", 210], ["app-cp-scroll", 150]] as [string, number][]) {
    const col = document.createElement("div");
    col.className = `app-cp-matrix ${cls}`;
    col.style.cssText = `width:${width}px;display:flex;flex-direction:column;gap:8px`;
    for (const [statement, list] of sets) {
      const card = document.createElement("div");
      card.className = "app-cp-card";
      card.style.borderLeftColor = colour(list.length === 0 ? "good" : "bad");
      const st2 = document.createElement("div");
      st2.className = "app-cp-statement";
      st2.textContent = statement;
      card.append(st2, objectiveCharts(list, { colour, metricColour }));
      col.appendChild(card);
    }
    tiles.appendChild(col);
  }
}

