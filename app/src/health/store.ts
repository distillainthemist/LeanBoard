// Health checks — the Dataverse side (health-checks-proposal-2026-10.md):
// the definitions on the settings rows (store/config.ts helpers) and the
// checks table. A refused call throws so the dialog can say so.

import { Ben_ltkhealthchecksService } from "../generated/services/Ben_ltkhealthchecksService";
import type { Ben_ltkhealthchecks } from "../generated/models/Ben_ltkhealthchecksModel";
import { currentViewer } from "../runtime";
import { nowIso, todayIso } from "../../../shared/schema/id";
import { healthSiteJson, healthStandardJson, saveHealthSiteJson, saveHealthStandardJson } from "../store/config";
import { memoRead, writing } from "../store/changes";
import {
  HealthAnswers,
  HealthCheck,
  HealthCriterion,
  HealthScope,
  HealthSiteConfig,
  HealthStandard,
  HealthType,
  checkName,
  parseAnswers,
  parseCriterion,
  parseHealthSiteConfig,
  parseHealthStandard,
  parseScope,
  scopeKey,
  scoreFor,
  serializeHealthSiteConfig,
  serializeHealthStandard,
  serializeScope,
} from "./model";

const fail = (what: string, err: unknown): never => {
  const msg = (err as { message?: unknown })?.message;
  throw new Error(`${what}: ${typeof msg === "string" ? msg : "refused"}`);
};
const q = (s: string) => s.replace(/'/g, "''");

// ---- definitions -----------------------------------------------------------

export async function loadDefinitions(site: string): Promise<{ standard: HealthStandard; site: HealthSiteConfig }> {
  const [std, sc] = await Promise.all([
    memoRead("health", "standard", healthStandardJson),
    memoRead("health", `site|${site}`, () => healthSiteJson(site)),
  ]);
  return { standard: parseHealthStandard(std), site: parseHealthSiteConfig(sc, site) };
}

export async function saveStandard(s: HealthStandard): Promise<void> {
  await saveHealthStandardJson(serializeHealthStandard(s));
}

export async function saveSiteConfig(site: string, c: HealthSiteConfig): Promise<void> {
  await saveHealthSiteJson(site, serializeHealthSiteConfig(c));
}

// ---- checks ------------------------------------------------------------------

function fromRow(r: Ben_ltkhealthchecks): HealthCheck {
  const type = (["priorities", "initiative", "cadence", "documents"].includes(r.ben_type ?? "") ? r.ben_type : "cadence") as HealthType;
  const site = r.ben_site ?? "";
  const label = r.ben_scopelabel ?? "";
  const criteria = (() => {
    try {
      return (JSON.parse(r.ben_criteriajson || "[]") as unknown[]).map(parseCriterion).filter((x): x is HealthCriterion => x !== null);
    } catch {
      return [] as HealthCriterion[];
    }
  })();
  const answers = parseAnswers(r.ben_answersjson ?? "");
  return {
    rowId: r.ben_ltkhealthcheckid,
    type,
    site,
    scopeKey: r.ben_scopekey ?? "",
    scope: parseScope(r.ben_scopejson ?? "", type, site, label),
    date: r.ben_date ?? "",
    status: r.ben_status === "submitted" ? "submitted" : r.ben_status === "void" ? "void" : "draft",
    criteria,
    answers,
    score: scoreFor(criteria, answers),
    wentWell: r.ben_wentwell ?? "",
    betterIf: r.ben_betterif ?? "",
    assessorEmail: (r.ben_assessoremail ?? "").toLowerCase(),
    assessorName: r.ben_assessorname ?? "",
    createdAt: r.ben_createdat ?? "",
    submittedAt: r.ben_submittedat ?? "",
    editedByName: r.ben_editedbyname ?? "",
    editedAt: r.ben_editedat ?? "",
    voidedByName: r.ben_voidedbyname ?? "",
    voidedAt: r.ben_voidedat ?? "",
    voidReason: r.ben_voidreason ?? "",
  };
}

/** Checks by site (and type / scope when given), newest first. */
export async function listChecks(f: { site?: string; type?: HealthType; scopeKey?: string }): Promise<HealthCheck[]> {
  const parts: string[] = [];
  if (f.site !== undefined && f.site !== "") parts.push(`ben_site eq '${q(f.site)}'`);
  if (f.type !== undefined) parts.push(`ben_type eq '${f.type}'`);
  if (f.scopeKey !== undefined) parts.push(`ben_scopekey eq '${q(f.scopeKey)}'`);
  const r = await Ben_ltkhealthchecksService.getAll({ ...(parts.length > 0 ? { filter: parts.join(" and ") } : {}), top: 500 });
  if (r.success === false) fail("Could not read the health checks", r.error);
  return (r.data ?? []).map(fromRow).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.createdAt < b.createdAt ? 1 : -1));
}

/** A new DRAFT on a scope with the criteria frozen in. */
export async function createDraft(scope: HealthScope, criteria: HealthCriterion[], date = todayIso()): Promise<HealthCheck> {
  const me = currentViewer();
  const at = nowIso();
  const fields = {
    ben_name: checkName(scope.type, scope.label, date),
    ben_type: scope.type,
    ben_site: scope.site,
    ben_scopekey: scopeKey(scope),
    ben_scopelabel: scope.label.slice(0, 300),
    ben_scopejson: serializeScope(scope),
    ben_date: date,
    ben_status: "draft",
    ben_criteriajson: JSON.stringify(criteria),
    ben_answersjson: "{}",
    ben_score: "",
    ben_scorejson: "{}",
    ben_wentwell: "",
    ben_betterif: "",
    ben_assessoremail: (me?.email ?? "").toLowerCase(),
    ben_assessorname: me?.name ?? "",
    ben_createdat: at,
  };
  const r = await writing("health", Ben_ltkhealthchecksService.create(fields as Parameters<typeof Ben_ltkhealthchecksService.create>[0]));
  if (r.success === false) fail("Could not start the health check", r.error);
  const id = String((r.data as { ben_ltkhealthcheckid?: unknown } | undefined)?.ben_ltkhealthcheckid ?? "");
  if (id === "") throw new Error("The check was created but its id did not come back — reopen it.");
  return { ...fromRow({ ...fields, ben_ltkhealthcheckid: id } as unknown as Ben_ltkhealthchecks) };
}

/** Write the answers, comments, date and (on submit) the status. */
export async function saveCheck(c: HealthCheck, o: { answers: HealthAnswers; wentWell: string; betterIf: string; date: string; submit: boolean }): Promise<HealthCheck> {
  const me = currentViewer();
  const at = nowIso();
  const score = scoreFor(c.criteria, o.answers);
  const submittedAt = o.submit && c.status === "draft" ? at : c.submittedAt;
  const edited = c.status === "submitted";
  const fields = {
    ben_name: checkName(c.type, c.scope.label, o.date),
    ben_date: o.date,
    ben_status: o.submit ? "submitted" : c.status,
    ben_answersjson: JSON.stringify(o.answers),
    ben_score: score.value === null ? "" : score.value.toFixed(1),
    ben_scorejson: JSON.stringify({ got: score.got, possible: score.possible, perCriterion: score.perCriterion }),
    ben_wentwell: o.wentWell,
    ben_betterif: o.betterIf,
    ...(o.submit && c.status === "draft" ? { ben_submittedat: at } : {}),
    ...(edited ? { ben_editedbyemail: (me?.email ?? "").toLowerCase(), ben_editedbyname: me?.name ?? "", ben_editedat: at } : {}),
  };
  const r = await writing("health", Ben_ltkhealthchecksService.update(c.rowId, fields as Parameters<typeof Ben_ltkhealthchecksService.update>[1]));
  if (r.success === false) fail("Could not save the health check", r.error);
  return {
    ...c,
    date: o.date,
    status: o.submit ? "submitted" : c.status,
    answers: o.answers,
    score,
    wentWell: o.wentWell,
    betterIf: o.betterIf,
    submittedAt,
    ...(edited ? { editedByName: me?.name ?? "", editedAt: at } : {}),
  };
}

/** A draft is discardable (decision 13); a submitted check never is. */
export async function discardDraft(c: HealthCheck): Promise<void> {
  if (c.status !== "draft") throw new Error("Only a draft can be discarded — void a submitted check instead.");
  await writing("health", Ben_ltkhealthchecksService.delete(c.rowId));
}

export async function voidCheck(c: HealthCheck, reason: string): Promise<void> {
  const me = currentViewer();
  const r = await writing("health", Ben_ltkhealthchecksService.update(c.rowId, { ben_status: "void", ben_voidedbyname: me?.name ?? "", ben_voidedat: nowIso(), ben_voidreason: reason }));
  if (r.success === false) fail("Could not void the check", r.error);
}

export async function unvoidCheck(c: HealthCheck): Promise<void> {
  const r = await writing("health", Ben_ltkhealthchecksService.update(c.rowId, { ben_status: "submitted", ben_voidedbyname: "", ben_voidedat: "", ben_voidreason: "" }));
  if (r.success === false) fail("Could not restore the check", r.error);
}
