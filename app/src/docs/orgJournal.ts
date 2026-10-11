// The organisation rename journal (term-store-proposal-2026-10.md §2,
// 2026-10-12): the Organisation editor records every site / department
// / area rename it SAVES, as label paths, in the documents
// configuration. The drift report reads them as exact evidence of a
// term rename and the sync clears what it applied. Reached from the
// board path by dynamic import only (the import gate).

import { appDocsConfig, invalidateDocsCache, saveAppDocsConfig } from "./docsStore";

export async function journalOrgRenames(entries: { from: string[]; to: string[] }[]): Promise<void> {
  const clean = entries.filter((e) => e.from.length > 0 && e.to.length > 0 && e.from.join("¦") !== e.to.join("¦"));
  if (clean.length === 0) return;
  const cfg = await appDocsConfig();
  const at = new Date().toISOString();
  for (const e of clean) {
    // a second rename of the same node collapses onto the first: the
    // term is still at the ORIGINAL label until a sync runs
    const prior = cfg.orgRenames.find((r) => r.to.join("¦") === e.from.join("¦"));
    if (prior) prior.to = e.to;
    else cfg.orgRenames.push({ from: e.from, to: e.to, at });
  }
  await saveAppDocsConfig(cfg);
  invalidateDocsCache();
}
