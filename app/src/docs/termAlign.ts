// The cutover tools (term-store-proposal §7.1 / §7.3, 2026-10-12): one
// alignment run for a synced set — apply the admin's orphan decisions
// (pair / retire), sync, re-walk, give the verdict. Both the drift
// reports and the one-click "Align term sets" come through here, so a
// set is aligned the same way whichever button asked.

import { el, clear } from "../../../shared/ui/dom";
import { AppDocsConfig, OrgSyncPlan, orgSyncPlan, orgTreePaths, pathKey } from "./model";
import { TermNode, TermWalk, fetchTerm, fetchTermPaths, invalidateTermPaths, patchTermFields, patchTermLabels } from "./sp";
import { AlignVerdict, OrphanDecision, createsAfterPairings, decisionCounts, pairableCreates, verdictFor } from "./termAlignModel";
import { executeOrgSync } from "./orgSync";
import { invalidateDocsCache, saveAppDocsConfig } from "./docsStore";
import { parseOrgTree } from "../../../shared/schema/meeting";
import { orgJson } from "../store/config";

/** What the run needs from a set: the two sets differ only in where
 *  their bindings live (the config for Organisation, the node rows for
 *  Process area) and how they plan and execute. */
export interface SetAdapter {
  name: string;
  setId: string;
  site: string;
  walk(): Promise<TermWalk>;
  plan(nodes: TermNode[]): Promise<OrgSyncPlan>;
  /** Runs the plan; returns the failure count. Owns its bookkeeping
   *  (bindings, the journal). */
  execute(plan: OrgSyncPlan, nodes: TermNode[], log: (line: string) => void): Promise<number>;
  /** Record a pairing as evidence: this app path IS that term. */
  pair(termId: string, path: string[]): Promise<void>;
  /** Record a retirement so the planner stands the term aside. */
  recordRetired(termId: string, label: string, how: "deprecated" | "suffixed"): Promise<void>;
}

const persist = async (cfg: AppDocsConfig) => {
  await saveAppDocsConfig(cfg);
  invalidateDocsCache();
};

const recordRetired = async (cfg: AppDocsConfig, setId: string, termId: string, label: string, how: "deprecated" | "suffixed") => {
  cfg.retiredTerms[setId] = { ...(cfg.retiredTerms[setId] ?? {}), [termId]: { label, at: new Date().toISOString(), how } };
  await persist(cfg).catch(() => undefined);
};

/** The Organisation set's adapter: bindings and the journal live in the
 *  documents config, which the adapter saves as it goes. */
export function orgAdapter(cfg: AppDocsConfig, offset: number): SetAdapter {
  const setId = cfg.orgSetId;
  return {
    name: "Organisation",
    setId,
    site: cfg.siteUrl,
    walk: () => fetchTermPaths(cfg.siteUrl, setId),
    plan: async (nodes) =>
      orgSyncPlan(orgTreePaths(parseOrgTree(await orgJson(true))), nodes, offset, {
        renames: cfg.orgRenames,
        bindings: cfg.termBindings[setId] ?? {},
        retired: Object.keys(cfg.retiredTerms[setId] ?? {}),
      }),
    execute: async (plan, nodes, log) => {
      const { failed, bindings } = await executeOrgSync({ site: cfg.siteUrl, setId, plan, termNodes: nodes, termOffset: offset, log });
      // what landed is now bound by id; the journal entries that became
      // renames are spent (a failed one stays for the retry)
      cfg.termBindings[setId] = { ...(cfg.termBindings[setId] ?? {}), ...bindings };
      cfg.orgRenames = cfg.orgRenames.filter((r) => bindings[pathKey(r.to)] === undefined);
      await persist(cfg).catch(() => undefined);
      return failed;
    },
    pair: async (termId, path) => {
      cfg.termBindings[setId] = { ...(cfg.termBindings[setId] ?? {}), [pathKey(path)]: termId };
      await persist(cfg).catch(() => undefined);
    },
    recordRetired: (termId, label, how) => recordRetired(cfg, setId, termId, label, how),
  };
}

/** The Process area set's adapter: the binding is the node's own
 *  `termId`, so a pairing is saved on the node row. */
export async function processAdapter(cfg: AppDocsConfig): Promise<SetAdapter & { bound: number; withAliases: number }> {
  const [{ listProcessNodes, saveProcessNodes }, { buildProcessTree, processTermPaths }, { planProcessSync, executeProcessSync }] = await Promise.all([
    import("../store/processes"),
    import("../processes/model"),
    import("./processSync"),
  ]);
  const processNodes = await listProcessNodes();
  const tree = buildProcessTree(processNodes);
  const setId = cfg.processSetId;
  return {
    name: "Process area",
    setId,
    site: cfg.siteUrl,
    bound: processNodes.filter((n) => !n.archived && n.termId !== "").length,
    withAliases: processNodes.filter((n) => !n.archived && Object.keys(n.aliases).length > 0).length,
    walk: () => fetchTermPaths(cfg.siteUrl, setId, 5, 400),
    plan: async (nodes) => planProcessSync(tree, nodes, Object.keys(cfg.retiredTerms[setId] ?? {})),
    execute: (plan, nodes, log) => executeProcessSync({ site: cfg.siteUrl, setId, tree, plan, termNodes: nodes, log }),
    pair: async (termId, path) => {
      const e = processTermPaths(tree).find((x) => pathKey(x.path) === pathKey(path));
      if (!e) return;
      e.node.termId = termId;
      await saveProcessNodes([{ ...e.node }]);
    },
    recordRetired: (termId, label, how) => recordRetired(cfg, setId, termId, label, how),
  };
}

/** Bring a retired term back (a restored site): deprecation off, the
 *  "(retired)" suffix stripped, the record cleared. */
export async function unretireTerm(cfg: AppDocsConfig, setId: string, termId: string, log: (line: string) => void): Promise<boolean> {
  const rec = cfg.retiredTerms[setId]?.[termId];
  const label = rec?.label ?? termId;
  let ok = true;
  if (rec?.how === "deprecated" || rec === undefined) {
    const r = await patchTermFields(cfg.siteUrl, setId, termId, { isDeprecated: false });
    ok = r.ok;
  }
  if (rec?.how === "suffixed" || !ok) {
    const cur = await fetchTerm(cfg.siteUrl, setId, termId);
    const labels = ((cur.data ?? {}) as { labels?: { languageTag?: string; name?: string; isDefault?: boolean }[] }).labels;
    if (cur.ok && Array.isArray(labels) && labels.length > 0) {
      const next = labels.map((l) => ({ languageTag: l.languageTag ?? "en-US", name: (l.name ?? "").replace(/\s*\(retired\)$/, ""), isDefault: l.isDefault === true }));
      ok = (await patchTermLabels(cfg.siteUrl, setId, termId, next)).ok;
    } else ok = false;
  }
  if (!ok) {
    log(`FAIL — could not bring back ${label}; it stays retired.`);
    return false;
  }
  if (cfg.retiredTerms[setId]) {
    delete cfg.retiredTerms[setId][termId];
    if (Object.keys(cfg.retiredTerms[setId]).length === 0) delete cfg.retiredTerms[setId];
  }
  await persist(cfg).catch(() => undefined);
  log(`OK — ${label} is back in use.`);
  return true;
}

/** Retire a term: deprecate it on the v2.1 road; where the road refuses
 *  the field, suffix its default label "(retired)" instead — either way
 *  the term stays, so documents carrying it keep a readable tag. */
export async function retireTerm(site: string, setId: string, termId: string, label: string, log: (line: string) => void): Promise<"deprecated" | "suffixed" | "failed"> {
  const dep = await patchTermFields(site, setId, termId, { isDeprecated: true });
  if (dep.ok) {
    log(`OK — retired ${label} (deprecated; existing tags stay readable, no new tagging).`);
    return "deprecated";
  }
  const cur = await fetchTerm(site, setId, termId);
  const labels = ((cur.data ?? {}) as { labels?: { languageTag?: string; name?: string; isDefault?: boolean }[] }).labels;
  if (!cur.ok || !Array.isArray(labels) || labels.length === 0) {
    log(`FAIL — retire ${label}: deprecation refused (${dep.status.slice(0, 120)}) and the term could not be read for the suffix.`);
    return "failed";
  }
  const next = labels.map((l) => ({
    languageTag: l.languageTag ?? "en-US",
    name: l.isDefault && !(l.name ?? "").endsWith("(retired)") ? `${l.name ?? ""} (retired)` : (l.name ?? ""),
    isDefault: l.isDefault === true,
  }));
  const res = await patchTermLabels(site, setId, termId, next);
  if (res.ok) {
    log(`OK — retired ${label} by suffix "(retired)" — this road does not deprecate (${dep.status.slice(0, 80)}).`);
    return "suffixed";
  }
  log(`FAIL — retire ${label}: ${res.status.slice(0, 200)}`);
  return "failed";
}

/** The decision rows under "In the term set only": a select per orphan —
 *  Leave, Retire, or "This is …" for each sibling create. */
export function renderOrphanDecisions(host: HTMLElement, plan: OrgSyncPlan, decisions: Map<string, OrphanDecision>, onChange: () => void): void {
  clear(host);
  const n = plan.orphanTerms.length;
  host.appendChild(el("div", "app-field-label", `In the term set only (${n})`));
  if (n === 0) {
    host.appendChild(el("div", "app-field-hint", "none"));
    return;
  }
  host.appendChild(el("div", "app-field-hint", "The app does not know these. Leave them, retire them (deprecated, tags stay readable), or say which app node a term IS — it is then renamed in place and bound, and the create drops out. A term can only be paired with a sibling: the API cannot move a term between parents."));
  const ul = el("ul", "app-docs-driftlist app-docs-decisions");
  for (const t of plan.orphanTerms.slice(0, 80)) {
    const li = el("li", "app-docs-decision");
    li.appendChild(el("span", "app-docs-decisionlabel", t.labels.join(" › ")));
    const sel = el("select", "app-input app-docs-decisionsel") as HTMLSelectElement;
    const add = (value: string, label: string) => {
      const o = el("option", "", label) as HTMLOptionElement;
      o.value = value;
      sel.appendChild(o);
    };
    add("leave", "Leave");
    add("retire", "Retire");
    const sibs = pairableCreates(plan, t.labels);
    for (let i = 0; i < sibs.length; i++) add(`pair:${i}`, `This is ${sibs[i][sibs[i].length - 1]}`);
    const cur = decisions.get(t.id);
    sel.value = cur === undefined || cur.kind === "leave" ? "leave" : cur.kind === "retire" ? "retire" : `pair:${sibs.findIndex((s) => s.join("¦") === cur.path.join("¦"))}`;
    if (sel.value === "") sel.value = "leave";
    sel.addEventListener("change", () => {
      if (sel.value === "leave") decisions.delete(t.id);
      else if (sel.value === "retire") decisions.set(t.id, { kind: "retire" });
      else decisions.set(t.id, { kind: "pair", path: sibs[Number(sel.value.slice(5))] });
      // one create can be claimed once: another row that chose it falls back
      for (const [id, d] of decisions) {
        if (id !== t.id && d.kind === "pair" && decisions.get(t.id)?.kind === "pair" && d.path.join("¦") === (decisions.get(t.id) as { path: string[] }).path.join("¦")) {
          decisions.delete(id);
          const other = host.querySelector<HTMLSelectElement>(`select[data-term="${id}"]`);
          if (other) other.value = "leave";
        }
      }
      onChange();
    });
    sel.dataset.term = t.id;
    li.appendChild(sel);
    ul.appendChild(li);
  }
  if (n > 80) ul.appendChild(el("li", "", `… and ${n - 80} more — decide these first and reload`));
  host.appendChild(ul);
  if (plan.retiredTerms.length > 0) {
    host.appendChild(el("div", "app-field-label", `Retired earlier (${plan.retiredTerms.length})`));
    const r = el("ul", "app-docs-driftlist");
    for (const t of plan.retiredTerms.slice(0, 30)) r.appendChild(el("li", "", t.labels.join(" › ")));
    host.appendChild(r);
  }
}

export interface AlignResult {
  failed: number;
  verdict: AlignVerdict;
  /** The fresh plan after the run — the next report's starting point. */
  plan: OrgSyncPlan | null;
}

/** The run: decisions first (pairings become evidence, retirements
 *  land on the terms), then the sync from a plan that honours them,
 *  then a fresh walk and the verdict. */
export async function alignSet(a: SetAdapter, decisions: Map<string, OrphanDecision>, log: (line: string) => void, prior?: { plan: OrgSyncPlan; nodes: TermNode[] }, opts: { verify?: boolean } = {}): Promise<AlignResult> {
  let failed = 0;
  const counts = decisionCounts(decisions);
  let plan = prior?.plan ?? null;
  let nodes = prior?.nodes ?? null;
  if (plan === null || nodes === null) {
    const w = await a.walk();
    if (w.error !== "") return { failed: 1, verdict: { aligned: false, lines: [`Term walk failed: ${w.error}`] }, plan: null };
    if (w.truncated) return { failed: 1, verdict: { aligned: false, lines: ["The term walk was cut short — syncing against a partial view could recreate terms it did not see. Nothing was changed."] }, plan: null };
    nodes = w.nodes;
    plan = await a.plan(nodes);
    if (plan.error !== "") return { failed: 1, verdict: verdictFor(plan, 0), plan };
  }
  // 1. the decisions
  if (counts.pair + counts.retire > 0) {
    for (const [termId, d] of decisions) {
      const t = plan.orphanTerms.find((o) => o.id === termId);
      const label = t ? t.labels.join(" › ") : termId;
      if (d.kind === "pair") {
        await a.pair(termId, d.path);
        log(`OK — ${label} is ${d.path.join(" › ")}: bound; it will be renamed in place.`);
      } else if (d.kind === "retire") {
        const how = await retireTerm(a.site, a.setId, termId, label, log);
        if (how === "failed") failed++;
        else await a.recordRetired(termId, t ? t.labels[t.labels.length - 1] : "", how);
      }
    }
    // the plan now honours the evidence: pairings turn into renames
    plan = await a.plan(nodes);
    if (plan.error !== "") return { failed: failed + 1, verdict: verdictFor(plan, failed), plan };
  }
  // 2. the sync
  const work = createsAfterPairings(plan, decisions).length + plan.renames.length;
  if (work > 0 || a.name === "Process area") {
    failed += await a.execute(plan, nodes, log);
  } else {
    log("Nothing to create or rename.");
  }
  // 3. the verdict, from a fresh walk (write-through skips it: the
  //    plan it ran is its answer, and the walk cache is dropped)
  invalidateTermPaths();
  if (opts.verify === false) return { failed, verdict: verdictFor(plan, failed), plan };
  const w2 = await a.walk();
  if (w2.error !== "") return { failed, verdict: { aligned: false, lines: [`The confirming walk failed: ${w2.error}`] }, plan: null };
  const after = await a.plan(w2.nodes);
  return { failed, verdict: verdictFor(after, failed, w2.truncated), plan: after };
}
