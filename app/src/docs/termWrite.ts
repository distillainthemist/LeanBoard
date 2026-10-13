// Write-through (term-store-proposal §8, 2026-10-12): the app is the only
// writer of the synced term sets, so every edit of a synced node pushes
// at once — add → create + bind, rename → in place, local name →
// synonym, archive or removal → retire. A push that cannot land (no
// term-store rights, offline) is OWED, never lost: recorded in the
// documents config and flushed when a super admin opens Settings →
// Documents or runs "Align term sets". Reached from the Organisation
// editor and the Process tab by dynamic import only (the import gate).

import { AppDocsConfig, orgTreePaths, orgTreePathsWithCompany, pathKey, withCompany } from "./model";
import { appDocsConfig, invalidateDocsCache, saveAppDocsConfig } from "./docsStore";
import { alignSet, orgAdapter, processAdapter, retireTerm, unretireTerm, SetAdapter } from "./termAlign";
import { pathsToRetire } from "./termAlignModel";
import { parseOrgTree } from "../../../shared/schema/meeting";
import { orgJson, siteCompanies } from "../store/config";
import type { ProcessNode } from "../processes/model";

export interface WriteThroughOutcome {
  /** The set was pushed clean. */
  pushed: boolean;
  /** Nothing to push (no set bound). */
  skipped: boolean;
  /** The push is owed — recorded for a later flush. */
  owed: boolean;
  /** The one-line summary for a status area. */
  summary: string;
  lines: string[];
}

const owe = async (cfg: AppDocsConfig, setId: string, reason: string, retire: { termId: string; label: string }[]) => {
  const prior = cfg.termWritesOwed[setId];
  const merged = [...(prior?.retire ?? [])];
  for (const r of retire) if (!merged.some((m) => m.termId === r.termId)) merged.push(r);
  cfg.termWritesOwed[setId] = { at: new Date().toISOString(), reason: reason.slice(0, 200), retire: merged };
  await saveAppDocsConfig(cfg).catch(() => undefined);
  invalidateDocsCache();
};

const settle = async (cfg: AppDocsConfig, setId: string) => {
  if (cfg.termWritesOwed[setId] === undefined) return;
  delete cfg.termWritesOwed[setId];
  await saveAppDocsConfig(cfg).catch(() => undefined);
  invalidateDocsCache();
};

/** One set's push: the sync (creates, renames, synonyms) from a plan
 *  that honours the evidence, then the retirements. */
async function pushSet(cfg: AppDocsConfig, a: SetAdapter, retire: { termId: string; label: string }[], lines: string[]): Promise<WriteThroughOutcome> {
  const log = (line: string) => lines.push(line);
  let failed = 0;
  let reason = "";
  try {
    const r = await alignSet(a, new Map(), log, undefined, { verify: false });
    failed += r.failed;
    if (r.failed > 0) reason = r.verdict.lines[0] ?? "the sync reported a failure";
  } catch (e) {
    failed++;
    reason = e instanceof Error ? e.message : String(e);
    log(`FAIL — ${a.name} set: ${reason}`);
  }
  const left: { termId: string; label: string }[] = [];
  for (const r of retire) {
    if (cfg.retiredTerms[a.setId]?.[r.termId] !== undefined) continue; // already retired
    const how = await retireTerm(cfg.siteUrl, a.setId, r.termId, r.label, log).catch(() => "failed" as const);
    if (how === "failed") {
      failed++;
      left.push(r);
      if (reason === "") reason = `could not retire ${r.label}`;
    } else await a.recordRetired(r.termId, r.label, how);
  }
  if (failed > 0) {
    await owe(cfg, a.setId, reason, left);
    return { pushed: false, skipped: false, owed: true, summary: `${a.name} term set: push owed — ${reason.slice(0, 120)}`, lines };
  }
  await settle(cfg, a.setId);
  return { pushed: true, skipped: false, owed: false, summary: `${a.name} term set updated ✓`, lines };
}

const none = (what: string): WriteThroughOutcome => ({ pushed: false, skipped: true, owed: false, summary: "", lines: [`${what}: no term set bound — nothing to push.`] });

/** After the Organisation editor saves: push the org tree; retire the
 *  terms of units that were removed or a site that was archived
 *  (label paths), bring back a restored site's term. */
export async function pushOrgTerms(opts: { removed?: string[][]; restored?: string[][] } = {}): Promise<WriteThroughOutcome> {
  const cfg = await appDocsConfig();
  if (cfg.orgSetId === "") return none("Organisation");
  const lines: string[] = [];
  const setId = cfg.orgSetId;
  const companyLevel = cfg.orgSetCompanyLevel;
  const a = orgAdapter(cfg, companyLevel ? 1 : 0);
  // the editor speaks site-rooted paths; a company-level set keys them
  // with the company in front
  const siteCo = companyLevel ? await siteCompanies().catch(() => ({}) as Record<string, string>) : {};
  const keyed = (p: string[]) => (companyLevel ? withCompany(p, siteCo) : p);
  // a restored site: its retired term comes back before the plan runs,
  // or the plan would create a second term beside it
  for (const raw of opts.restored ?? []) {
    const path = keyed(raw);
    const label = path[path.length - 1];
    const hit = Object.entries(cfg.retiredTerms[setId] ?? {}).find(([, v]) => v.label.toLowerCase() === label.toLowerCase());
    if (!hit) continue;
    if (await unretireTerm(cfg, setId, hit[0], (l) => lines.push(l))) {
      cfg.termBindings[setId] = { ...(cfg.termBindings[setId] ?? {}), [pathKey(path)]: hit[0] };
      await saveAppDocsConfig(cfg).catch(() => undefined);
    }
  }
  // what to retire: a removed path's term, by binding — but never a path
  // that is back in the tree (removed and re-added before the save)
  const tree = parseOrgTree(await orgJson(true));
  const appPaths = companyLevel ? orgTreePathsWithCompany(tree, siteCo) : orgTreePaths(tree);
  const owed = cfg.termWritesOwed[setId]?.retire ?? [];
  const retire = [...owed, ...pathsToRetire((opts.removed ?? []).map(keyed), appPaths, cfg.termBindings[setId] ?? {})];
  return pushSet(cfg, a, retire, lines);
}

/** After the Process tab saves: push the model; retire the terms of
 *  nodes just archived (their binding is on the node). */
export async function pushProcessTerms(opts: { archived?: ProcessNode[] } = {}): Promise<WriteThroughOutcome> {
  const cfg = await appDocsConfig();
  if (cfg.processSetId === "") return none("Process area");
  const lines: string[] = [];
  const a = await processAdapter(cfg);
  const owed = cfg.termWritesOwed[cfg.processSetId]?.retire ?? [];
  const retire = [...owed];
  for (const n of opts.archived ?? []) {
    if (n.termId !== "" && !retire.some((r) => r.termId === n.termId)) retire.push({ termId: n.termId, label: n.name });
  }
  return pushSet(cfg, a, retire, lines);
}

/** Every owed push, retried: called when a super admin opens Settings →
 *  Documents. Returns one outcome per set that was owed. */
export async function flushOwedTermWrites(): Promise<WriteThroughOutcome[]> {
  const cfg = await appDocsConfig();
  const out: WriteThroughOutcome[] = [];
  if (cfg.orgSetId !== "" && cfg.termWritesOwed[cfg.orgSetId] !== undefined) out.push(await pushOrgTerms());
  if (cfg.processSetId !== "" && cfg.termWritesOwed[cfg.processSetId] !== undefined) out.push(await pushProcessTerms());
  return out;
}
