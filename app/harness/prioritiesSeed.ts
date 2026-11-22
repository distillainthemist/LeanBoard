// The seed the Priorities harness pages share (priorities.html,
// prioritysettings.html): written through the stores' own save functions
// onto the in-memory Dataverse.
import { saveCompanies, saveSiteCompany, saveSiteDepartments, saveSiteOwners, saveCompanyOwners, savePrioritySettingsJson } from "../src/store/config";
import { upsertPerson } from "../src/store/people";
import { loadCascade, newPriority, saveAssignment, savePillar, savePriority } from "../src/store/priorities";
import { seed as seedSeries } from "./seriesStub";
import { OWN_SERIES_BOARD, ownSeriesCard } from "../src/priorities/model";
import { orgRef, Pillar, Priority } from "../src/priorities/model";

const person = (whoId: string, who: string, site: string, role = "user") => ({ whoId, who, email: `${whoId}@example.test`, site, department: "", area: "", role, active: true });

export async function seed(): Promise<void> {
  await saveCompanies(["PacOps"]);
  for (const site of ["Weipa", "BSL", "BBA"]) {
    await saveSiteCompany(site, "PacOps");
    await saveSiteDepartments(site, JSON.stringify(site === "Weipa" ? [{ department: "Mining", areas: [] }, { department: "Processing", areas: [] }] : [{ department: "Casting", areas: [] }]));
  }
  await saveCompanyOwners({ PacOps: { whoId: "u5", who: "Vallance, Colin" } });
  await saveSiteOwners("Weipa", { site: { whoId: "u1", who: "O'Brien, Ben" }, departments: { Mining: { whoId: "u2", who: "Smith, Jane" } }, areas: {} });
  await saveSiteOwners("BSL", { site: { whoId: "u6", who: "Black, Ellen" }, departments: {}, areas: {} });
  for (const p of [person("u1", "O'Brien, Ben", "Weipa", "superadmin"), person("u2", "Smith, Jane", "Weipa"), person("u5", "Vallance, Colin", ""), person("u6", "Black, Ellen", "BSL"), person("u9", "Lee, Sam", "Weipa")]) {
    await upsertPerson(p, undefined, { skipAccessSync: true });
  }
  await savePrioritySettingsJson(JSON.stringify({ period: { mode: "calendar", startMonth: 1, prefix: "", currentPeriod: "", labels: [] } }));

  const pillars: Pillar[] = [];
  const pillar = async (id: string, name: string, level: 1 | 2, parentId: string, order: number, color = "", fromPeriod = "", toPeriod = "", succeedsId = "") => {
    const p: Pillar = { id, name, level, parentId, color, order, active: true, company: "PacOps", fromPeriod, toPeriod, succeedsId };
    p.rowId = await savePillar(p, pillars);
    pillars.push(p);
  };
  await pillar("L1a", "People and Safety First", 1, "", 1, "#0b3d91");
  await pillar("L1b", "Operational Excellence", 1, "", 2, "#0f5132");
  await pillar("S1", "Continuous Improvement Safety", 2, "L1a", 1);
  await pillar("S2", "Capable & Motivated Workforce", 2, "L1a", 2);
  await pillar("S3", "Continuous Improvement - Operational", 2, "L1b", 1);
  // ends after 2026, nothing follows it: its priorities are unplaced in 2027
  await pillar("S4", "Fixed Cost Discipline", 2, "L1b", 2, "", "", "2026");
  // 2027: a sub-pillar that FOLLOWS one that ended, and a brand-new one
  await pillar("S5old", "Asset Reliability", 2, "L1b", 3, "", "", "2026");
  await pillar("S5", "Asset Health", 2, "L1b", 3, "", "2027", "", "S5old");
  await pillar("S6", "Cost Leadership", 2, "L1b", 4, "", "2027");

  const data = await loadCascade("");
  const weipa = orgRef("PacOps", "Weipa");
  const company = orgRef("PacOps");
  const all: Priority[] = [];
  const pri = async (id: string, org: typeof weipa, statement: string, pillarId: string, over: Partial<Priority> = {}) => {
    const p = { ...newPriority(org, "2026"), id, statement, pillarId, ownerId: "u1", ownerName: "O'Brien, Ben", order: all.length + 1, ...over };
    p.rowId = await savePriority(p, data);
    data.priorities.push(p);
    all.push(p);
    return p;
  };
  await pri("pr-w1", weipa, "Zero Harm - Critical Risk Management (CRM) Maturity Uplift", "S1");
  // a metric of its own (2026-11-18), with a few weekly readings: the
  // last is short of plan, so the priority reads off track on it alone
  await pri("pr-w2", weipa, "Improve Everyday Respect for Our Teams", "S2", {
    ownMetrics: [{ key: "respect_index", name: "Respect index", objective: "Above 80 by year end", unit: "%", target: 80, lsl: 60, goodDirection: "up", tracking: "value", kind: "own", cadence: "weekly" }],
  });
  // (the harness keeps series in seriesStub, not the Dataverse stub)
  seedSeries(OWN_SERIES_BOARD, ownSeriesCard("pr-w2", "respect_index"), [
    { key: "k1", date: "2026-10-26", shift: "-", value: "66" },
    { key: "k2", date: "2026-11-02", shift: "-", value: "71" },
    { key: "k3", date: "2026-11-09", shift: "-", value: "74" },
  ]);
  // a metric last filled in nine weeks ago (the Yield driver's shape on
  // dev, 2026-11-19): eleven weekly readings, 6 July to 14 September —
  // its chart reaches back for them and still ends at today
  await pri("pr-w3", weipa, "Leadership Capability Uplift", "S2", {
    ownMetrics: [{ key: "yield", name: "Yield", objective: "Lift yield to 90 g/L", unit: "", target: 50, goodDirection: "up", tracking: "value", kind: "own", cadence: "weekly" }],
  });
  seedSeries(
    OWN_SERIES_BOARD,
    ownSeriesCard("pr-w3", "yield"),
    [25, 30, 35, 40, 45, 50, 55, 52, 53, 56, 51].map((v, i) => ({ key: `y${i}`, date: ["2026-07-06", "2026-07-13", "2026-07-20", "2026-07-27", "2026-08-03", "2026-08-10", "2026-08-17", "2026-08-24", "2026-08-31", "2026-09-07", "2026-09-14"][i], shift: "-", value: String(v) }))
  );
  await pri("pr-w4", weipa, "Andoom: Optimise haulage and maintain yield", "S3");
  await pri("pr-w5", weipa, "Fixed Cost Improvement Plan", "S4");
  await pri("pr-w6", weipa, "Conveyor reliability programme", "S5old");
  await pri("pr-wp", weipa, "Uplift and Sustain Quality in Leadership in Field Activities", "S1", { status: "proposed", ownerId: "u2", ownerName: "Smith, Jane" });
  const c1 = await pri("pr-c1", company, "Contractor Safety Improvement Strategy", "S1", { ownerId: "u5", ownerName: "Vallance, Colin" });
  const c2 = await pri("pr-c2", company, "Increase local Aboriginal participation across all position levels", "S2", { ownerId: "u5", ownerName: "Vallance, Colin" });
  const c3 = await pri("pr-c3", company, "Absenteeism Improvement Focus", "S2", { ownerId: "u5", ownerName: "Vallance, Colin" });
  const c4 = await pri("pr-c4", company, "Southern Operations Skill Improvement", "S3", { ownerId: "u5", ownerName: "Vallance, Colin" });
  const asg = (p: Priority, status: "proposed" | "onhold" | "accepted", over: Record<string, string> = {}) =>
    saveAssignment({ id: "", priorityId: p.id, org: { ...weipa }, status, reason: "", decidedById: "", decidedByName: "", decidedAt: "", childPriorityId: "", ...over }, data);
  await asg(c1, "proposed"); // a cascade waiting on Weipa
  await asg(c2, "onhold", { reason: "No capacity until Q3" }); // one Weipa put on hold
  await asg(c3, "proposed", { decidedById: "u2", decidedByName: "Smith, Jane", decidedAt: new Date().toISOString() }); // a pull proposed by a direct report
  await asg(c4, "accepted", { decidedById: "u1", decidedByName: "O'Brien, Ben" }); // adopted as-is
}
