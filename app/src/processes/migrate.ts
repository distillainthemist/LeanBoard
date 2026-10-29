// The process migration (features-plan-2026-10-29 §1, decision 5): a
// site that was assigned a process TYPE under the retired model gets its
// own tree CLONED from that type — in its own words, each node linked to
// the central node it came from — and every reference that pointed at
// the type's nodes for that site (rituals, initiatives, value drivers)
// moves to the clone. Idempotent per site: a site with a root already is
// left alone. The retired type on the site row is cleared at the end.

import { listProcessNodes, saveProcessNodes, clearSiteProcessType, allSiteProcessTypes } from "../store/processes";
import { buildProcessTree, cloneTypeForSite, repointedNodeId, siteRootOf } from "./model";

export interface MigrationOutcome {
  site: string;
  nodes: number;
  rituals: number;
  initiatives: number;
  drivers: number;
  lines: string[];
  error: string;
}

/** Sites that still carry a retired type and have no tree yet — what
 *  the migration readout lists. */
export async function sitesAwaitingMigration(): Promise<{ site: string; typeId: string; typeName: string }[]> {
  const [nodes, types] = await Promise.all([listProcessNodes(), allSiteProcessTypes()]);
  const tree = buildProcessTree(nodes);
  const out: { site: string; typeId: string; typeName: string }[] = [];
  for (const [site, typeId] of Object.entries(types)) {
    if (typeId === "" || siteRootOf(tree, site) !== "") continue;
    out.push({ site, typeId, typeName: tree.byId.get(typeId)?.name ?? typeId });
  }
  return out.sort((a, b) => a.site.localeCompare(b.site));
}

/** Clone the type for the site and re-point the site's references.
 *  Counts what moved; the lines read in the settings tab. */
export async function migrateSiteFromType(site: string, typeId: string): Promise<MigrationOutcome> {
  const out: MigrationOutcome = { site, nodes: 0, rituals: 0, initiatives: 0, drivers: 0, lines: [], error: "" };
  const tree = buildProcessTree(await listProcessNodes());
  if (siteRootOf(tree, site) !== "") {
    out.error = `${site} already has a process hierarchy.`;
    return out;
  }
  const { nodes, idMap } = cloneTypeForSite(tree, typeId, site);
  if (nodes.length === 0) {
    out.error = "The process type could not be read.";
    return out;
  }
  await saveProcessNodes(nodes);
  out.nodes = nodes.length;
  out.lines.push(`${nodes.length} node${nodes.length === 1 ? "" : "s"} created for ${site} from ${tree.byId.get(typeId)?.name ?? "the type"}.`);
  const siteKey = site.trim().toLowerCase();
  // rituals: the column and the blob together
  try {
    const { listBoards, repointBoardProcess } = await import("../store/boards");
    for (const b of await listBoards(true)) {
      if (b.site.trim().toLowerCase() !== siteKey || b.processNodeId === "") continue;
      const next = repointedNodeId(b.processNodeId, idMap);
      if (next === b.processNodeId) continue;
      await repointBoardProcess(b, next);
      out.rituals++;
    }
    out.lines.push(`${out.rituals} ritual${out.rituals === 1 ? "" : "s"} re-pointed.`);
  } catch (err) {
    out.lines.push(`Rituals: ${err instanceof Error ? err.message : String(err)}`);
  }
  // initiatives
  try {
    const { listInitiatives, saveInitiative } = await import("../store/initiatives");
    for (const i of await listInitiatives()) {
      if (i.org.site.trim().toLowerCase() !== siteKey || (i.processNodeId ?? "") === "") continue;
      const next = repointedNodeId(i.processNodeId ?? "", idMap);
      if (next === i.processNodeId) continue;
      await saveInitiative({ ...i, processNodeId: next });
      out.initiatives++;
    }
    out.lines.push(`${out.initiatives} initiative${out.initiatives === 1 ? "" : "s"} re-pointed.`);
  } catch (err) {
    out.lines.push(`Initiatives: ${err instanceof Error ? err.message : String(err)}`);
  }
  // value drivers
  try {
    const { listDrivers, saveDriver } = await import("../store/valueDrivers");
    for (const d of await listDrivers(site)) {
      if (d.processNodeId === "") continue;
      const next = repointedNodeId(d.processNodeId, idMap);
      if (next === d.processNodeId) continue;
      await saveDriver({ ...d, processNodeId: next });
      out.drivers++;
    }
    out.lines.push(`${out.drivers} value driver${out.drivers === 1 ? "" : "s"} re-pointed.`);
  } catch (err) {
    out.lines.push(`Value drivers: ${err instanceof Error ? err.message : String(err)}`);
  }
  await clearSiteProcessType(site).catch(() => undefined);
  return out;
}
