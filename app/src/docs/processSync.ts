// The Process area term set sync (term-store-proposal §6, step 5,
// 2026-10-12; site trees since 2026-10-29, features-plan §1): the app's
// SITE trees are the master; the set mirrors them — site › area ›
// process › sub-process. The binding lives on the node itself
// (`termId`), so after the first sync every comparison is by id and a
// rename in Settings → Processes is an exact rename of its term. Nothing
// is ever deleted; an archived node's term stays as a reported orphan,
// and so do the old type-rooted terms until the cutover tool retires
// them. Local names are retired: the sync STRIPS the synonyms the app
// once pushed for them (decision 8) — the central nodes' aliases are the
// record of what it pushed; a stripped node's aliases are cleared.

import { OrgSyncPlan, orgSyncPlan, pathKey } from "./model";
import { executeOrgSync } from "./orgSync";
import { TermNode, fetchTerm, fetchTermStoreLanguage, patchTermLabels } from "./sp";
import { ProcessNode, ProcessTree, processTermPaths, synonymsToRemove } from "../processes/model";
import { saveProcessNodes } from "../store/processes";

export function planProcessSync(tree: ProcessTree, termNodes: TermNode[], retired: string[] = []): OrgSyncPlan {
  const entries = processTermPaths(tree);
  const bindings: Record<string, string> = {};
  for (const e of entries) if (e.node.termId !== "") bindings[pathKey(e.path)] = e.node.termId;
  return orgSyncPlan(
    entries.map((e) => e.path),
    termNodes,
    0,
    { bindings, retired }
  );
}

/** Runs the plan, binds the nodes to their terms, then pushes local
 *  names as synonyms. Returns the failure count (0 = clean). */
export async function executeProcessSync(opts: { site: string; setId: string; tree: ProcessTree; plan: OrgSyncPlan; termNodes: TermNode[]; log: (line: string) => void }): Promise<number> {
  const { site, setId, tree, plan, termNodes, log } = opts;
  const { failed, bindings } = await executeOrgSync({ site, setId, plan, termNodes, termOffset: 0, log });
  // bind: every node whose path now has a term id remembers it
  const entries = processTermPaths(tree);
  const toSave: ProcessNode[] = [];
  for (const e of entries) {
    const id = bindings[pathKey(e.path)];
    if (id && id !== e.node.termId) toSave.push({ ...e.node, termId: id });
  }
  if (toSave.length > 0) {
    try {
      await saveProcessNodes(toSave);
      log(`OK — ${toSave.length} node${toSave.length === 1 ? "" : "s"} bound to ${toSave.length === 1 ? "its" : "their"} term id.`);
      for (const n of toSave) {
        const e = entries.find((x) => x.node.nodeId === n.nodeId);
        if (e) e.node.termId = n.termId;
      }
    } catch (err) {
      log(`FAIL — binding the nodes: ${err instanceof Error ? err.message : String(err)}`);
      return failed + 1;
    }
  }
  // synonyms the app once pushed for local names come OFF (decision 8,
  // 2026-10-29): a central node that still carries aliases names them;
  // its term loses those non-default labels and the aliases clear
  const langRes = await fetchTermStoreLanguage(site);
  const lang = ((langRes.data ?? {}) as { defaultLanguageTag?: string }).defaultLanguageTag ?? "en-US";
  let synonyms = 0;
  let synFailed = 0;
  for (const n of tree.byId.values()) {
    if (n.site !== "" || n.termId === "" || Object.keys(n.aliases).length === 0) continue;
    const cur = await fetchTerm(site, setId, n.termId);
    const labels = ((cur.data ?? {}) as { labels?: { name?: string; languageTag?: string; isDefault?: boolean }[] }).labels;
    if (!cur.ok || !Array.isArray(labels)) {
      synFailed++;
      log(`FAIL — synonyms of ${n.name}: could not read the term.`);
      continue;
    }
    const existing = labels.map((l) => ({ name: l.name ?? "", languageTag: l.languageTag ?? lang, isDefault: l.isDefault === true }));
    const { keep, removed } = synonymsToRemove(existing, n);
    if (removed.length > 0) {
      const res = await patchTermLabels(site, setId, n.termId, keep);
      if (!res.ok) {
        synFailed++;
        log(`FAIL — synonyms of ${n.name}: ${res.status.slice(0, 200)}`);
        continue;
      }
      synonyms += removed.length;
      log(`OK — ${n.name}: synonym${removed.length === 1 ? "" : "s"} ${removed.map((a) => `"${a}"`).join(", ")} removed.`);
    }
    try {
      await saveProcessNodes([{ ...n, aliases: {} }]);
      n.aliases = {};
    } catch (err) {
      synFailed++;
      log(`FAIL — clearing ${n.name}'s local names: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  if (synonyms > 0) log(`${synonyms} retired local name${synonyms === 1 ? "" : "s"} removed from the term store.`);
  return failed + synFailed;
}
