// The process model's store (term-store-proposal §6, 2026-10-12;
// reshaped 2026-10-29, features-plan-2026-10-29 §1): ben_ltkprocessnode
// rows, read through the cache by topic and written through writing().
// A site's tree is found by its root node (`site` on the row) — the
// site's process TYPE on its settings row is retired and read only by
// the migration readout.

import { Ben_ltkprocessnodesService } from "../generated/services/Ben_ltkprocessnodesService";
import { Ben_ltksitesettingsesService } from "../generated/services/Ben_ltksitesettingsesService";
import { allWhere, eq, upsertWhere } from "./dv";
import { memoRead, writing } from "./changes";
import { APP_ROW } from "./config";
import { ProcessNode, ProcessNodeRow, allSiteRoots, buildProcessTree, nodeFromRow, rowFromNode } from "../processes/model";

const TOPIC = "processes";

/** Every node, archived included (the tree builder keeps them for
 *  references; editors filter). */
export function listProcessNodes(): Promise<ProcessNode[]> {
  return memoRead(TOPIC, "all", async () => {
    const rows = await allWhere<ProcessNodeRow>(Ben_ltkprocessnodesService.getAll);
    return rows.map(nodeFromRow).filter((n) => n.nodeId !== "");
  });
}

/** Create or update by node id. */
export function saveProcessNode(n: ProcessNode): Promise<string> {
  return writing(
    TOPIC,
    upsertWhere(Ben_ltkprocessnodesService, eq("ben_nodeid", n.nodeId), (row: ProcessNodeRow) => row.ben_ltkprocessnodeid ?? "", rowFromNode(n) as Parameters<typeof Ben_ltkprocessnodesService.create>[0])
  );
}

export async function saveProcessNodes(nodes: ProcessNode[]): Promise<void> {
  for (const n of nodes) await saveProcessNode(n);
}

/** site → its tree's root node id — the map every picker and filter
 *  takes (the shape `allSiteProcessTypes` had: callers changed only the
 *  name). */
export async function allSiteProcessRoots(): Promise<Record<string, string>> {
  return allSiteRoots(buildProcessTree(await listProcessNodes()));
}

/** RETIRED model: site → process type node id from the site rows. Read
 *  by the migration readout only (which sites still carry a type). */
export async function allSiteProcessTypes(): Promise<Record<string, string>> {
  const rows = await allWhere(Ben_ltksitesettingsesService.getAll);
  const out: Record<string, string> = {};
  for (const r of rows) if (r.ben_site && r.ben_site !== APP_ROW) out[r.ben_site] = (r.ben_processtype ?? "").trim();
  return out;
}

/** The migration clears a site's retired type once its tree exists. */
export async function clearSiteProcessType(site: string): Promise<void> {
  await writing(
    "sites",
    upsertWhere(Ben_ltksitesettingsesService, eq("ben_site", site), (row) => row.ben_ltksitesettingsid, { ben_site: site, ben_name: site, ben_processtype: "" })
  );
}

/** A site rename carries its process root with it (the root term's
 *  label follows through the sync). */
export async function renameSiteProcessRoot(from: string, to: string): Promise<void> {
  const nodes = await listProcessNodes();
  const roots = nodes.filter((n) => n.level === 0 && n.site.toLowerCase() === from.trim().toLowerCase());
  const kids = nodes.filter((n) => n.site.toLowerCase() === from.trim().toLowerCase() && n.level > 0);
  for (const r of roots) await saveProcessNode({ ...r, name: to.trim(), site: to.trim() });
  for (const k of kids) await saveProcessNode({ ...k, site: to.trim() });
}
