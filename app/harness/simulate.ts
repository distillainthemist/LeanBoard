// Simulate (P9d, parked 2026-09-09) on stub data — does the parked code
// still run? (backlog programme tranche 7, E16, 2026-11-27)
import "../src/style.css";
import { DriverNode, newNode } from "../src/improvement/vdt/model";
import { renderSimulate } from "../src/improvement/vdt/simulate";

const mk = (id: string, parentId: string, name: string, over: Partial<DriverNode>): DriverNode => ({ ...newNode("Mine", parentId, name), id, ...over });
const $ = (v: Partial<Record<"baseline" | "plan", number>>) => ({ "2026": v });
const nodes: DriverNode[] = [
  mk("ebitda", "", "EBITDA", { unit: "$", cadence: "annually", formula: "{margin} - {fixed}", format: { decimals: 2, scale: "m", percent: false } }),
  mk("margin", "ebitda", "Gross margin", { unit: "$", cadence: "annually", formula: "{vol} * {unitm}", format: { decimals: 2, scale: "m", percent: false } }),
  mk("fixed", "ebitda", "Fixed cost", { unit: "$", cadence: "monthly", format: { decimals: 2, scale: "m", percent: false }, values: $({ baseline: 3100000, plan: 3000000 }) }),
  mk("vol", "margin", "Saleable volume", { unit: "kL", cadence: "daily", aggregate: "sum", values: $({ baseline: 1800, plan: 2000 }) }),
  mk("unitm", "margin", "Unit margin", { unit: "$/kL", cadence: "monthly", values: $({ baseline: 5300, plan: 5450 }) }),
  mk("changeover", "vol", "Changeover time", { kind: "leading", unit: "min", cadence: "daily", aggregate: "avg" }),
];
const init = (id: string, title: string, metrics: unknown[]) => ({ id, title, name: title, status: "active", metrics, org: { site: "Mine", department: "", area: "" } });
const initiatives = [
  init("i1", "Debottleneck the still", [{ key: "m1", name: "Saleable volume", unit: "kL", target: 2150, driverId: "vol", driverLink: "drives" }]),
  init("i2", "Renegotiate the freight contract", [{ key: "m2", name: "Fixed cost", unit: "$", target: 2900000, driverId: "fixed", driverLink: "drives" }]),
  init("i3", "SMED on the bottling line", [{ key: "m3", name: "Changeover time", unit: "min", target: 20, driverId: "changeover", driverLink: "leads" }]),
];
const log: string[] = [];
(window as unknown as { log: string[] }).log = log;
renderSimulate({
  host: document.getElementById("host")!,
  nodes,
  period: "2026",
  site: "Mine",
  initiatives: initiatives as never,
  actor: { whoId: "u1", who: "Ben" },
  window: { from: "2026-01-01", to: "2026-12-31" },
  canAdopt: true,
  onAdopted: async () => {
    log.push("adopted");
  },
});
