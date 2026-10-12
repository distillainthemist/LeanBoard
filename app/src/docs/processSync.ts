// The Process area term set sync (term-store-proposal §6, step 5,
// 2026-10-12): the app's process model is the master; the set mirrors
// it — type › area › process › sub-process in the general names, the
// local names pushed as SYNONYMS. The binding lives on the node itself
// (`termId`), so after the first sync every comparison is by id and a
// rename in Settings → Processes is an exact rename of its term. Nothing
// is ever deleted; an archived node's term stays as a reported orphan.

import { OrgSyncPlan, orgSyncPlan, pathKey } from "./model";
import { executeOrgSync } from "./orgSync";
import { TermNode, fetchTerm, fetchTermStoreLanguage, patchTermLabels } from "./sp";
import { ProcessNode, ProcessTree, processTermPaths, synonymsToAdd } from "../processes/model";
import { saveProcessNodes } from "../store/processes";

export function planProcessSync(tree: ProcessTree, termNodes: TermNode[]): OrgSyncPlan {
  const entries = processTermPaths(tree);
  const bindings: Record<string, string> = {};
  for (const e of entries) if (e.node.termId !== "") bindings[pathKey(e.path)] = e.node.termId;
  return orgSyncPlan(
    entries.map((e) => e.path),
    termNodes,
    0,
    { bindings }
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
  // synonyms: each local name the term does not carry yet, in the
  // store's language — added, never removed (the manager removes)
  const langRes = await fetchTermStoreLanguage(site);
  const lang = ((langRes.data ?? {}) as { defaultLanguageTag?: string }).defaultLanguageTag ?? "en-US";
  let synonyms = 0;
  let synFailed = 0;
  for (const e of entries) {
    if (e.node.termId === "" || Object.keys(e.node.aliases).length === 0) continue;
    const cur = await fetchTerm(site, setId, e.node.termId);
    const labels = ((cur.data ?? {}) as { labels?: { name?: string; languageTag?: string; isDefault?: boolean }[] }).labels;
    if (!cur.ok || !Array.isArray(labels)) {
      synFailed++;
      log(`FAIL — synonyms for ${e.path.join(" › ")}: could not read the term.`);
      continue;
    }
    const existing = labels.map((l) => ({ name: l.name ?? "", languageTag: l.languageTag ?? lang, isDefault: l.isDefault === true }));
    const add = synonymsToAdd(existing, e.node, lang);
    if (add.length === 0) continue;
    const res = await patchTermLabels(site, setId, e.node.termId, [...existing, ...add]);
    if (res.ok) {
      synonyms += add.length;
      log(`OK — ${e.path.join(" › ")}: synonym${add.length === 1 ? "" : "s"} ${add.map((a) => `"${a.name}"`).join(", ")} added.`);
    } else {
      synFailed++;
      log(`FAIL — synonyms for ${e.path.join(" › ")}: ${res.status.slice(0, 200)}`);
    }
  }
  if (synonyms > 0) log(`${synonyms} local name${synonyms === 1 ? "" : "s"} now read as synonyms in the term store.`);
  return failed + synFailed;
}
