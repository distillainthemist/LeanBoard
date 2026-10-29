// The cutover tools (term-store-proposal §7.1 / §7.3, 2026-10-12): one
// alignment run for a synced set — apply the admin's orphan decisions
// (pair / retire), sync, re-walk, give the verdict. Both the drift
// reports and the one-click "Align term sets" come through here, so a
// set is aligned the same way whichever button asked.

import { el, clear } from "../../../shared/ui/dom";
import { AppDocsConfig, OrgSyncPlan, orgSetShapeProblem, orgSyncPlan, orgTreePaths, orgTreePathsWithCompany, pathKey, withCompany } from "./model";
import { TermNode, TermWalk, fetchTerm, fetchTermPaths, invalidateTermPaths, patchTermFields, patchTermLabels } from "./sp";
import { AlignVerdict, OrphanDecision, createsAfterPairings, decisionCounts, pairableCreates, verdictFor } from "./termAlignModel";
import { executeOrgSync } from "./orgSync";
import { invalidateDocsCache, saveAppDocsConfig } from "./docsStore";
import { parseOrgTree } from "../../../shared/schema/meeting";
import { companies, orgJson, siteCompanies } from "../store/config";

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
/** The Organisation set's adapter. `offset` 1 = the set starts at
 *  COMPANY level: the app's paths carry the company (every company a
 *  top-level term, its sites under it) and the planner compares whole
 *  paths — no longer "one top term, sites under it". */
export function orgAdapter(cfg: AppDocsConfig, offset: number): SetAdapter {
  const setId = cfg.orgSetId;
  const companyLevel = offset === 1;
  return {
    name: "Organisation",
    setId,
    site: cfg.siteUrl,
    // a sync's walk must see the WHOLE set: a large budget, and any
    // failed request makes the view partial (see partialWalk)
    walk: () => fetchTermPaths(cfg.siteUrl, setId, 4, 6000),
    plan: async (nodes) => {
      const tree = parseOrgTree(await orgJson(true));
      const siteCo = companyLevel ? await siteCompanies().catch(() => ({}) as Record<string, string>) : {};
      // the shape guard first: a plan run the wrong way round creates
      // the sites beside the company
      const problem = orgSetShapeProblem(
        nodes.filter((n) => n.labels.length === 1).map((n) => n.labels[0]),
        tree.map((s) => s.site),
        await companies().catch(() => [] as string[]),
        offset
      );
      if (problem !== "") return { creates: [], matches: [], renames: [], orphans: [], orphanTerms: [], retiredTerms: [], matched: 0, error: problem };
      const paths = companyLevel ? orgTreePathsWithCompany(tree, siteCo) : orgTreePaths(tree);
      // the journal speaks site-rooted paths; at company level each
      // entry gets its company in front (a renamed site keeps its company)
      const renames = cfg.orgRenames.map((r) => ({ from: withCompany(r.from, siteCo), to: withCompany(r.to, companyLevel ? { ...siteCo, [r.from[0]]: siteCo[r.to[0]] ?? siteCo[r.from[0]] ?? "" } : siteCo) }));
      return orgSyncPlan(paths, nodes, 0, {
        renames,
        bindings: cfg.termBindings[setId] ?? {},
        retired: Object.keys(cfg.retiredTerms[setId] ?? {}),
      });
    },
    execute: async (plan, nodes, log) => {
      const { failed, bindings } = await executeOrgSync({ site: cfg.siteUrl, setId, plan, termNodes: nodes, termOffset: 0, log });
      // what landed is now bound by id; the journal entries that became
      // renames are spent (a failed one stays for the retry)
      cfg.termBindings[setId] = { ...(cfg.termBindings[setId] ?? {}), ...bindings };
      // a journal entry is spent once its target is bound (either shape of key)
      const siteCo = companyLevel ? await siteCompanies().catch(() => ({}) as Record<string, string>) : {};
      cfg.orgRenames = cfg.orgRenames.filter((r) => bindings[pathKey(r.to)] === undefined && bindings[pathKey(withCompany(r.to, siteCo))] === undefined);
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
    withAliases: processNodes.filter((n) => n.site === "" && n.termId !== "" && Object.keys(n.aliases).length > 0).length,
    walk: () => fetchTermPaths(cfg.siteUrl, setId, 5, 6000),
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

/** The decision rows under "In the term set only": one hairline row
 *  per term — the path (parents muted), then Leave · Retire pills and,
 *  where a sibling create exists, a "This is …" select. A header offers
 *  the same decision for every row at once (a hand-made set is many). */
export function renderOrphanDecisions(host: HTMLElement, plan: OrgSyncPlan, decisions: Map<string, OrphanDecision>, onChange: () => void): void {
  clear(host);
  const n = plan.orphanTerms.length;
  const head = el("div", "app-docs-orphanhead");
  head.appendChild(el("div", "app-field-label", `In the term set only (${n})`));
  host.appendChild(head);
  if (n === 0) {
    host.appendChild(el("div", "app-field-hint", "none"));
    return;
  }
  host.appendChild(el("div", "app-field-hint", "The app does not know these. Leave them, retire them (deprecated — tags stay readable, nothing new can pick them), or say which app node a term IS: it is then renamed in place and bound, and the create drops out. Pairing is offered for siblings only — the API cannot move a term between parents."));
  const rows: { id: string; paint: () => void }[] = [];
  const pill = (label: string, on: boolean, onClick: () => void): HTMLButtonElement => {
    const b = el("button", `app-docs-fpill app-docs-orphanpill${on ? " app-docs-fpill-on" : ""}`, label) as HTMLButtonElement;
    b.type = "button";
    b.setAttribute("aria-pressed", String(on));
    b.addEventListener("click", onClick);
    return b;
  };
  const setAll = (d: OrphanDecision | null) => {
    for (const t of plan.orphanTerms) {
      if (d === null) decisions.delete(t.id);
      else decisions.set(t.id, d);
    }
    for (const r of rows) r.paint();
    onChange();
  };
  const bulk = el("div", "app-docs-orphanbulk");
  bulk.append(el("span", "app-field-hint", "All:"), pill("Leave", false, () => setAll(null)), pill("Retire", false, () => setAll({ kind: "retire" })));
  head.appendChild(bulk);
  const list = el("div", "app-docs-orphanlist");
  for (const t of plan.orphanTerms.slice(0, 120)) {
    const row = el("div", "app-docs-orphanrow");
    const label = el("span", "app-docs-orphanpath");
    if (t.labels.length > 1) label.appendChild(el("span", "app-docs-orphanparents", `${t.labels.slice(0, -1).join(" › ")} › `));
    label.appendChild(el("span", "app-docs-orphanleaf", t.labels[t.labels.length - 1]));
    const acts = el("span", "app-docs-orphanacts");
    row.append(label, acts);
    const sibs = pairableCreates(plan, t.labels);
    const paint = () => {
      clear(acts);
      const cur = decisions.get(t.id);
      const kind = cur?.kind ?? "leave";
      acts.appendChild(pill("Leave", kind === "leave", () => { decisions.delete(t.id); paint(); onChange(); }));
      acts.appendChild(pill("Retire", kind === "retire", () => { decisions.set(t.id, { kind: "retire" }); paint(); onChange(); }));
      if (sibs.length === 0) return;
      const sel = el("select", `app-input app-docs-orphansel${kind === "pair" ? " app-docs-orphansel-on" : ""}`) as HTMLSelectElement;
      const o0 = el("option", "", "This is…") as HTMLOptionElement;
      o0.value = "";
      sel.appendChild(o0);
      sibs.forEach((s, i) => {
        const o = el("option", "", s[s.length - 1]) as HTMLOptionElement;
        o.value = String(i);
        sel.appendChild(o);
      });
      sel.value = kind === "pair" ? String(sibs.findIndex((s) => s.join("¦") === (cur as { path: string[] }).path.join("¦"))) : "";
      if (sel.value === "-1") sel.value = "";
      sel.addEventListener("change", () => {
        if (sel.value === "") decisions.delete(t.id);
        else {
          const path = sibs[Number(sel.value)];
          // one create can be claimed once: another row that chose it falls back
          for (const [id, d] of decisions) if (id !== t.id && d.kind === "pair" && d.path.join("¦") === path.join("¦")) decisions.delete(id);
          decisions.set(t.id, { kind: "pair", path });
        }
        for (const r of rows) r.paint();
        onChange();
      });
      acts.appendChild(sel);
    };
    rows.push({ id: t.id, paint });
    paint();
    list.appendChild(row);
  }
  if (n > 120) list.appendChild(el("div", "app-field-hint", `… and ${n - 120} more — decide these first and reload`));
  host.appendChild(list);
  if (plan.retiredTerms.length > 0) {
    host.appendChild(el("div", "app-field-label", `Retired earlier (${plan.retiredTerms.length})`));
    const r = el("ul", "app-docs-driftlist");
    for (const t of plan.retiredTerms.slice(0, 30)) r.appendChild(el("li", "", t.labels.join(" › ")));
    host.appendChild(r);
  }
}

/** A walk a sync may not trust: cut short by its budget, or with any
 *  children request failed (that parent's subtree is missing and the
 *  plan would recreate it). "" when the walk is whole. */
export function partialWalk(w: { truncated: boolean; failed?: number }): string {
  if (w.truncated) return "The term walk was cut short by its request budget";
  if ((w.failed ?? 0) > 0) return `${w.failed} children request${w.failed === 1 ? "" : "s"} failed during the term walk (a throttle or a refusal)`;
  return "";
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
    const partial = partialWalk(w);
    if (partial !== "") return { failed: 1, verdict: { aligned: false, lines: [`${partial} — syncing against a partial view could recreate terms it did not see. Nothing was changed; try again in a minute.`] }, plan: null };
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
  return { failed, verdict: verdictFor(after, failed, partialWalk(w2) !== ""), plan: after };
}
