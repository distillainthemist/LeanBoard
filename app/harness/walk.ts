// The executive summary (the cascaded priorities' walk), with stub data:
// three sub-pillars; priorities on track, flagged and off track; one
// open to its initiatives with stages, action counts, sparklines and a
// support note. `?open=P1,P2` opens cards; `?step=1` starts on a step.
import "../src/style.css";
import { mountWalk } from "../src/priorities/walk";
import type { LifecycleCtx } from "../src/priorities/lifecycle";
import type { Pillar, Priority } from "../src/priorities/model";
import type { MetricValue } from "../src/improvement/metricValues";
import { DEFAULT_STATUS_SETTINGS, initiativeStatus, statusColour, StatusInput, ActionCounts } from "../src/improvement/status";

const org = { company: "Pechey", site: "Bendigo", department: "Packaging", area: "" };
const pillar = (id: string, name: string, level: 1 | 2, parentId: string, color: string): Pillar => ({ id, name, level, parentId, color, order: 0, active: true, company: "Pechey" }) as Pillar;
const pillars = [pillar("L1", "People and safety first", 1, "", "#3f6fbf"), pillar("S1", "Continuous improvement safety", 2, "L1", "#3f6fbf"), pillar("S2", "Delivery", 2, "L1", "#8a4b12"), pillar("S3", "Cost", 2, "L1", "")];
const pr = (id: string, statement: string, pillarId: string, ownerName: string, primaryInitiativeId: string, status = "active"): Priority =>
  ({ id, statement, org, pillarId, ownerId: "u", ownerName, period: "2026", status, statusReason: "", parentId: "", primaryInitiativeId, order: 0, notes: "" }) as Priority;
const priorities = [
  pr("P1", "Contractor safety improvement strategy", "S1", "Dunstone, Steven", "I1"),
  pr("P2", "Guarding audit complete on every filler", "S1", "Lee, Sam", "I4"),
  pr("P3", "Machine isolation refresher for all crews", "S1", "Hall, Tom", "I7"),
  pr("P5", "A priority nobody has hung an initiative under yet", "S1", "", ""),
  pr("P4", "Changeover under 25 minutes on line 2", "S2", "Hall, Tom", "I9", "completed"),
];
const mv = (name: string, tail: number[], target: number | null, direction: "up" | "down" | "range", rag: MetricValue["rag"], unit = "", extra: Partial<MetricValue> = {}): MetricValue => ({
  key: name,
  name,
  unit,
  last: tail[tail.length - 1] ?? null,
  display: tail.length > 0 ? `${tail[tail.length - 1]}${unit}` : "",
  target,
  rag,
  starred: true,
  objective: "",
  tail,
  usl: null,
  lsl: null,
  direction,
  ...extra,
});
const W = mv("Contractor TRIFR", [9, 8, 8.5, 7, 6, 5.5, 5], 6, "down", "green");
const X = mv("Field leadership hours", [80, 60, 62, 64, 40, 90], 0, "range", "red", " h", { lsl: 55, usl: 75, target: 65 });
const Y = mv("Critical control checks", [40, 55, 62, 58, 66], 80, "up", "amber", "%");
const Z = mv("Near misses closed in 5 days", [70, 90, 60, 65, 95, 82], 85, "up", "amber", "%");
const G = mv("Audit status", [], null, "up", "green", "", { display: "On track" });
const N = mv("Pre-start quality", [], 90, "up", null, "%");

const TODAY = "2026-11-17";
const counts = (done: number, future: number, late: number, support = 0): ActionCounts => ({ total: done + future + late, done, future, late, support });
interface Init {
  id: string;
  title: string;
  owner: string;
  stage: string;
  pdca: string;
  counts: ActionCounts;
  metrics: MetricValue[];
  flagged?: boolean;
  note?: string;
  lastUpdate?: string;
  conf?: boolean;
  from?: string;
}
const inits: Record<string, Init[]> = {
  P1: [
    { id: "I1", title: "Embedded and consistent contractor performance rituals", owner: "Haeusler, Judey & Vallance, Colin", stage: "Trial", pdca: "do", counts: counts(2, 1, 3, 1), metrics: [W, X, Y], flagged: true, note: "Access to AI to speed development" },
    { id: "I2", title: "Safety improvement plan for Ecotone", owner: "Schleich, Aaron", stage: "Confirm", pdca: "check", counts: counts(1, 0, 0), metrics: [Z], lastUpdate: "2026-09-20T00:00:00Z" },
    { id: "I3", title: "Prioritise safety in the field", owner: "Braun, Benjamin", stage: "Embed", pdca: "act", counts: counts(4, 2, 0), metrics: [G], from: "Maintenance" },
    { id: "IC", title: "Hidden", owner: "", stage: "", pdca: "", counts: counts(0, 1, 0), metrics: [], conf: true },
  ],
  P2: [
    { id: "I4", title: "Filler guarding audit", owner: "Lee, Sam", stage: "Understand", pdca: "plan", counts: counts(3, 2, 0), metrics: [W, X, Y, Z, G] },
    { id: "I5", title: "Interlock retrofit, line 3", owner: "Clegg, Tammy", stage: "Trial", pdca: "do", counts: counts(0, 0, 0), metrics: [N] },
    { id: "I6", title: "Light curtain standard", owner: "Jukes, Emily", stage: "Trial", pdca: "do", counts: counts(1, 3, 0), metrics: [] },
  ],
  P3: [1, 2, 3, 4].map((n) => ({ id: `I7${n}`, title: `Isolation refresher, crew ${n}`, owner: "Bird, Dylan", stage: "Trial", pdca: "do", counts: counts(n, 2, 0), metrics: n === 1 ? [W, Y] : [] })),
  P4: [{ id: "I9", title: "SMED on line 2", owner: "Hall, Tom", stage: "Embed", pdca: "act", counts: counts(6, 0, 0), metrics: [] }],
  P5: [],
};
const statusOfInit = (i: Init) => {
  const input: StatusInput = {
    flagged: i.flagged === true,
    createdAt: "2026-02-01T00:00:00Z",
    lastUpdateAt: i.lastUpdate ?? "2026-11-10T00:00:00Z",
    actions: i.counts,
    metrics: i.metrics.map((m) => ({ name: m.name, rag: i.id === "I4" || i.id.startsWith("I7") || i.id === "I3" ? (m.rag === null ? null : "green") : m.rag })),
  };
  return initiativeStatus(input, DEFAULT_STATUS_SETTINGS, TODAY);
};
const palette: Record<string, string> = { good: "#107c10", atrisk: "#c19c00", issue: "#d13438", neutral: "#808080", flagged: "#7b3fa0" };
const objectives: Record<string, MetricValue[]> = { P1: [W, X, Y], P2: [W, X, Y, Z], P3: [W, Y], P4: [], P5: [] };

const ctx = {
  data: () => ({ pillars, priorities, assignments: [] }),
  settings: { status: DEFAULT_STATUS_SETTINGS },
  palette,
  stateColour: (s: "good" | "flagged" | "bad" | "none") => statusColour(s, DEFAULT_STATUS_SETTINGS, palette),
  statusesFor: (p: Priority) => (inits[p.id] ?? []).map(statusOfInit),
  primaryOf: (p: Priority) => (p.primaryInitiativeId !== "" ? { id: p.primaryInitiativeId, title: "", completed: false } : null),
  initiativesFor: (p: Priority) =>
    (inits[p.id] ?? []).map((i) => ({
      id: i.id,
      title: i.title,
      stageName: i.stage,
      stagePdca: i.pdca,
      pdcaFg: "#000",
      pdcaBg: "#eee",
      ownerName: i.owner,
      ownerTitle: i.owner,
      orgName: "This org",
      open: i.counts.future + i.counts.late,
      overdue: i.counts.late,
      counts: i.counts,
      status: statusOfInit(i),
      flagNote: i.note ?? "",
      metrics: i.metrics,
      boardId: `init-${i.id}`,
      inheritedFrom: i.from ?? "",
      confidentialHidden: i.conf === true,
    })),
} as unknown as LifecycleCtx;
const columns = pillars.filter((p) => p.level === 2);
const byColumn = new Map(columns.map((c) => [c.id, priorities.filter((p) => p.pillarId === c.id)]));
const log: string[] = [];
(window as unknown as { log: string[] }).log = log;
const q = new URLSearchParams(location.search);
const expanded = new Set((q.get("open") ?? "").split(",").filter((x) => x !== ""));
mountWalk({
  host: document.getElementById("w")!,
  ctx,
  org,
  period: "2026",
  columns,
  pillars,
  byColumn,
  adoptedIds: new Set(),
  objectives: (p) => objectives[p.id] ?? [],
  expanded,
  onView: () => log.push(`view ${[...expanded].join(",")}`),
  onMenu: (_a, p) => log.push(`menu ${p.id}`),
  canMenu: () => true,
  startStep: Number(q.get("step") ?? "0") || 0,
  inline: q.get("inline") === "1",
  className: q.get("inline") === "1" ? "app-cp-walk-inline" : "",
  onExit: () => log.push("exit"),
  onOpen: (p) => log.push(`open ${p.id}`),
  onStep: (i) => log.push(`step ${i}`),
});
