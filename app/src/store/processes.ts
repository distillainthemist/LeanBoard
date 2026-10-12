// The process model's store (term-store-proposal §6, 2026-10-12):
// ben_ltkprocessnode rows, read through the cache by topic and written
// through writing(); the site's process type on its settings row.

import { Ben_ltkprocessnodesService } from "../generated/services/Ben_ltkprocessnodesService";
import { Ben_ltksitesettingsesService } from "../generated/services/Ben_ltksitesettingsesService";
import { allWhere, eq, upsertWhere } from "./dv";
import { memoRead, writing } from "./changes";
import { APP_ROW } from "./config";
import { ProcessNode, ProcessNodeRow, nodeFromRow, rowFromNode } from "../processes/model";

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

/** site → process type node id ("" = none). */
export async function allSiteProcessTypes(): Promise<Record<string, string>> {
  const rows = await allWhere(Ben_ltksitesettingsesService.getAll);
  const out: Record<string, string> = {};
  for (const r of rows) if (r.ben_site && r.ben_site !== APP_ROW) out[r.ben_site] = (r.ben_processtype ?? "").trim();
  return out;
}

export async function saveSiteProcessType(site: string, nodeId: string): Promise<void> {
  await writing(
    "sites",
    upsertWhere(Ben_ltksitesettingsesService, eq("ben_site", site), (row) => row.ben_ltksitesettingsid, { ben_site: site, ben_name: site, ben_processtype: nodeId })
  );
}
