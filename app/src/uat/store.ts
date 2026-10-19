// UAT runs and results — the Dataverse side (uat-proposal-2026-10.md
// §2). The generated services are called directly, as the ingestion
// store does; a refused call throws so the tab can say so.

import { Ben_ltkuatrunsService } from "../generated/services/Ben_ltkuatrunsService";
import { Ben_ltkuatresultsService } from "../generated/services/Ben_ltkuatresultsService";
import type { Ben_ltkuatruns } from "../generated/models/Ben_ltkuatrunsModel";
import type { Ben_ltkuatresults } from "../generated/models/Ben_ltkuatresultsModel";
import { currentViewer } from "../runtime";
import { nowIso } from "../../../shared/schema/id";
import { UatAssignee, UatOutcome, UatResult, UatRun, UatRunCase, UatScripts, parseAssignees, parseComponentKeys, parseRunCases } from "./model";

const fail = (what: string, err: unknown): never => {
  const msg = (err as { message?: unknown })?.message;
  throw new Error(`${what}: ${typeof msg === "string" ? msg : "refused"}`);
};

function runFromRow(r: Ben_ltkuatruns): UatRun {
  return {
    rowId: r.ben_ltkuatrunid,
    name: r.ben_name ?? "",
    description: r.ben_description ?? "",
    status: r.ben_status === "closed" ? "closed" : r.ben_status === "planned" ? "planned" : "running",
    components: parseComponentKeys(r.ben_componentsjson ?? ""),
    appVersion: r.ben_appversion ?? "",
    environment: r.ben_environment ?? "",
    assignees: parseAssignees(r.ben_assigneesjson ?? ""),
    cases: parseRunCases(r.ben_casesjson ?? ""),
    scope: r.ben_scope ?? "",
    createdByEmail: (r.ben_createdbyemail ?? "").toLowerCase(),
    createdByName: r.ben_createdbyname ?? "",
    createdAt: r.ben_createdat ?? "",
    closedByName: r.ben_closedbyname ?? "",
    closedAt: r.ben_closedat ?? "",
    closingNote: r.ben_closingnote ?? "",
  };
}

function resultFromRow(r: Ben_ltkuatresults): UatResult {
  const outcome = r.ben_outcome;
  return {
    rowId: r.ben_ltkuatresultid,
    runId: r._ben_run_value ?? "",
    caseId: r.ben_caseid ?? "",
    outcome: outcome === "pass" || outcome === "fail" || outcome === "blocked" ? outcome : "skipped",
    note: r.ben_note ?? "",
    testerEmail: (r.ben_testeremail ?? "").toLowerCase(),
    testerName: r.ben_testername ?? "",
    at: r.ben_at ?? "",
    issueId: r.ben_issueid ?? "",
  };
}

/** The shipped scripts (lazy — the JSON never rides the board chunk). */
export async function loadScripts(): Promise<UatScripts> {
  const m = await import("./scripts.generated.json");
  return (m.default ?? m) as unknown as UatScripts;
}

export async function listRuns(): Promise<UatRun[]> {
  const r = await Ben_ltkuatrunsService.getAll({ top: 200 });
  if (r.success === false) fail("Could not read UAT runs", r.error);
  return (r.data ?? []).map(runFromRow).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function getRun(rowId: string): Promise<UatRun | null> {
  const r = await Ben_ltkuatrunsService.get(rowId);
  if (r.success === false || !r.data) return null;
  return runFromRow(r.data);
}

export async function createRun(o: { name: string; description: string; components: string[]; environment: string; assignees: UatAssignee[]; cases: UatRunCase[]; scope: string }): Promise<string> {
  const me = currentViewer();
  const r = await Ben_ltkuatrunsService.create({
    ben_name: o.name.slice(0, 200),
    ben_description: o.description,
    ben_status: "running",
    ben_componentsjson: JSON.stringify(o.components),
    ben_appversion: typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "unknown",
    ben_environment: o.environment,
    ben_assigneesjson: JSON.stringify(o.assignees),
    ben_casesjson: JSON.stringify(o.cases),
    ben_scope: o.scope,
    ben_createdbyemail: (me?.email ?? "").toLowerCase(),
    ben_createdbyname: me?.name ?? "",
    ben_createdat: nowIso(),
  } as Parameters<typeof Ben_ltkuatrunsService.create>[0]);
  if (r.success === false) fail("Could not create the UAT run", r.error);
  const id = String((r.data as { ben_ltkuatrunid?: unknown } | undefined)?.ben_ltkuatrunid ?? "");
  if (id === "") throw new Error("The run was created but its id did not come back — refresh the list.");
  return id;
}

export async function updateDescription(run: UatRun, description: string): Promise<void> {
  const r = await Ben_ltkuatrunsService.update(run.rowId, { ben_description: description });
  if (r.success === false) fail("Could not save the instructions", r.error);
}

export async function updateAssignees(run: UatRun, assignees: UatAssignee[]): Promise<void> {
  const r = await Ben_ltkuatrunsService.update(run.rowId, { ben_assigneesjson: JSON.stringify(assignees) });
  if (r.success === false) fail("Could not save the assignees", r.error);
}

export async function closeRun(run: UatRun, note: string): Promise<void> {
  const me = currentViewer();
  const r = await Ben_ltkuatrunsService.update(run.rowId, {
    ben_status: "closed",
    ben_closedbyemail: (me?.email ?? "").toLowerCase(),
    ben_closedbyname: me?.name ?? "",
    ben_closedat: nowIso(),
    ben_closingnote: note,
  });
  if (r.success === false) fail("Could not close the run", r.error);
}

export async function reopenRun(run: UatRun): Promise<void> {
  const r = await Ben_ltkuatrunsService.update(run.rowId, { ben_status: "running", ben_closedat: "", ben_closingnote: "" });
  if (r.success === false) fail("Could not reopen the run", r.error);
}

export async function listResults(runId: string): Promise<UatResult[]> {
  const r = await Ben_ltkuatresultsService.getAll({ filter: `_ben_run_value eq '${runId}'`, top: 5000 });
  if (r.success === false) fail("Could not read the results", r.error);
  return (r.data ?? []).map(resultFromRow);
}

/** Record a tester's result for a case — a new row each time (the
 *  latest wins; the earlier ones are the trail). */
export async function recordResult(runId: string, c: { id: string; title: string }, outcome: UatOutcome, note: string, issueId = ""): Promise<UatResult> {
  const me = currentViewer();
  const at = nowIso();
  const r = await Ben_ltkuatresultsService.create({
    ben_name: `${c.id} · ${outcome} · ${me?.name ?? ""}`.slice(0, 290),
    ben_caseid: c.id,
    ben_outcome: outcome,
    ben_note: note,
    ben_testeremail: (me?.email ?? "").toLowerCase(),
    ben_testername: me?.name ?? "",
    ben_at: at,
    ben_issueid: issueId,
    "ben_Run@odata.bind": `/ben_ltkuatruns(${runId})`,
  } as Parameters<typeof Ben_ltkuatresultsService.create>[0]);
  if (r.success === false) fail("Could not record the result", r.error);
  return { rowId: String((r.data as { ben_ltkuatresultid?: unknown } | undefined)?.ben_ltkuatresultid ?? ""), runId, caseId: c.id, outcome, note, testerEmail: (me?.email ?? "").toLowerCase(), testerName: me?.name ?? "", at, issueId };
}

/** A tester takes a tick back: their results for the case go. */
export async function clearResult(results: UatResult[], caseId: string, testerEmail: string): Promise<void> {
  for (const r of results) {
    if (r.caseId === caseId && r.testerEmail === testerEmail.toLowerCase() && r.rowId !== "") {
      await Ben_ltkuatresultsService.delete(r.rowId);
    }
  }
}

/** The open runs this person is assigned to — the hub tab's gate. */
export async function myOpenRuns(email: string): Promise<UatRun[]> {
  const e = email.trim().toLowerCase();
  if (e === "") return [];
  const runs = await listRuns().catch(() => [] as UatRun[]);
  return runs.filter((r) => r.status === "running" && r.assignees.some((a) => a.email === e));
}
