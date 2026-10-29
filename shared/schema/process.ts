// The process model's pure parts (term-store-proposal-2026-10.md §6,
// built 2026-10-12; reshaped 2026-10-29, features-plan-2026-10-29 §1):
// a SITE owns its own hierarchy — its root node carries the site's name
// (level 0, `site` = the site), then area › process › sub-process. The
// CENTRAL hierarchy is the type trees (Mine, Refinery, Smelter: level 0,
// `site` = ""); a site node soft-links to one central node (`centralId`,
// inherited down the tree) so initiatives, rituals and documents compare
// across sites. Local names (`aliases`) are RETIRED: a site's names are
// its tree; the field is read only by the migration. SDK-free, tested.

export type ProcessLevel = 0 | 1 | 2 | 3;

export const LEVEL_LABELS: Record<ProcessLevel, string> = { 0: "Process type", 1: "Area", 2: "Process", 3: "Sub-process" };

export interface ProcessNode {
  rowId: string;
  nodeId: string;
  parentId: string;
  level: ProcessLevel;
  name: string;
  order: number;
  termId: string;
  /** RETIRED 2026-10-29 — site (lowercased) → the local name there;
   *  kept so the migration can clone a site's tree in its own words and
   *  the sync can strip the synonyms the app once pushed. */
  aliases: Record<string, string>;
  archived: boolean;
  /** The site that owns this node ("" = a node of the central tree). */
  site: string;
  /** The central node this site node compares as ("" = inherit the
   *  nearest linked ancestor's; a central node links to nothing). */
  centralId: string;
}

export interface ProcessNodeRow {
  ben_ltkprocessnodeid?: string;
  ben_name?: string;
  ben_nodeid?: string;
  ben_parentid?: string;
  ben_level?: string;
  ben_order?: string;
  ben_termid?: string;
  ben_aliasesjson?: string;
  ben_isarchived?: boolean;
  ben_site?: string;
  ben_centralnodeid?: string;
}

export function nodeFromRow(r: ProcessNodeRow): ProcessNode {
  const lv = Number(r.ben_level ?? "");
  let aliases: Record<string, string> = {};
  try {
    const parsed = JSON.parse(r.ben_aliasesjson ?? "{}") as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
        if (typeof v === "string" && v.trim() !== "" && k.trim() !== "") aliases[k.trim().toLowerCase()] = v.trim();
      }
    }
  } catch {
    aliases = {};
  }
  return {
    rowId: r.ben_ltkprocessnodeid ?? "",
    nodeId: r.ben_nodeid ?? "",
    parentId: r.ben_parentid ?? "",
    level: (lv === 1 || lv === 2 || lv === 3 ? lv : 0) as ProcessLevel,
    name: (r.ben_name ?? "").trim(),
    order: Number.isFinite(Number(r.ben_order)) && (r.ben_order ?? "") !== "" ? Number(r.ben_order) : 0,
    termId: r.ben_termid ?? "",
    aliases,
    archived: r.ben_isarchived === true,
    site: (r.ben_site ?? "").trim(),
    centralId: (r.ben_centralnodeid ?? "").trim(),
  };
}

export function rowFromNode(n: ProcessNode): ProcessNodeRow {
  return {
    ben_name: n.name,
    ben_nodeid: n.nodeId,
    ben_parentid: n.parentId,
    ben_level: String(n.level),
    ben_order: String(n.order),
    ben_termid: n.termId,
    ben_aliasesjson: JSON.stringify(n.aliases),
    ben_isarchived: n.archived,
    ben_site: n.site,
    ben_centralnodeid: n.centralId,
  };
}

export function newNodeId(): string {
  const r = Math.random().toString(36).slice(2, 10);
  return `pn-${Date.now().toString(36)}-${r}`;
}

export interface ProcessTree {
  byId: Map<string, ProcessNode>;
  /** parentId → children in order (archived included; callers filter). */
  childrenOf: Map<string, ProcessNode[]>;
  /** The CENTRAL roots — the process types (level 0, no site), in order. */
  types: ProcessNode[];
  /** site (as spelled on the node) → its root node id; a live root wins
   *  over an archived one. */
  siteRoots: Record<string, string>;
}

const byOrder = (a: ProcessNode, b: ProcessNode) => a.order - b.order || a.name.localeCompare(b.name, undefined, { sensitivity: "base", numeric: true });

export function buildProcessTree(nodes: ProcessNode[]): ProcessTree {
  const byId = new Map(nodes.map((n) => [n.nodeId, n]));
  const childrenOf = new Map<string, ProcessNode[]>();
  for (const n of nodes) {
    const key = n.level === 0 ? "" : n.parentId;
    childrenOf.set(key, [...(childrenOf.get(key) ?? []), n]);
  }
  for (const list of childrenOf.values()) list.sort(byOrder);
  const roots = (childrenOf.get("") ?? []).filter((n) => n.level === 0);
  const siteRoots: Record<string, string> = {};
  for (const r of roots) {
    if (r.site === "") continue;
    const cur = siteRoots[r.site];
    if (cur === undefined || (byId.get(cur)?.archived === true && !r.archived)) siteRoots[r.site] = r.nodeId;
  }
  return { byId, childrenOf, types: roots.filter((n) => n.site === ""), siteRoots };
}

/** The root of a site's tree ("" = the site has none). Matched by the
 *  site's spelling, then blind to case. */
export function siteRootOf(tree: ProcessTree, site: string): string {
  const s = site.trim();
  if (s === "") return "";
  if (tree.siteRoots[s] !== undefined) return tree.siteRoots[s];
  const hit = Object.keys(tree.siteRoots).find((k) => k.toLowerCase() === s.toLowerCase());
  return hit === undefined ? "" : tree.siteRoots[hit];
}

/** Every site's root — the map the pickers and filters take. */
export function allSiteRoots(tree: ProcessTree): Record<string, string> {
  return { ...tree.siteRoots };
}

/** The central node a node compares as: its own link, else the nearest
 *  linked ancestor's; a central node is its own; "" = unlinked. */
export function centralOf(tree: ProcessTree, nodeId: string): string {
  const path = processPath(tree, nodeId);
  if (path.length === 0) return "";
  if (path[0].site === "") return nodeId;
  for (let i = path.length - 1; i >= 0; i--) if (path[i].centralId !== "") return path[i].centralId;
  return "";
}

/** Is the node's central counterpart the central ancestor or beneath it?
 *  ("" ancestor = any.) The cross-site filter's rule. */
export function inCentralSubtree(tree: ProcessTree, nodeId: string, centralAncestorId: string): boolean {
  if (centralAncestorId === "") return true;
  const c = centralOf(tree, nodeId);
  return c !== "" && inSubtree(tree, c, centralAncestorId);
}

/** The site nodes that compare as a central node or anything beneath
 *  it — what a central filter expands to (the register maps them to
 *  term ids). */
export function siteNodesUnderCentral(tree: ProcessTree, centralAncestorId: string): ProcessNode[] {
  const out: ProcessNode[] = [];
  for (const n of tree.byId.values()) {
    if (n.site === "" || n.archived) continue;
    if (inCentralSubtree(tree, n.nodeId, centralAncestorId)) out.push(n);
  }
  return out;
}

/** "Site" for a site root, "Process type" for a central one. */
export function rootLabel(node: Pick<ProcessNode, "site">): string {
  return node.site !== "" ? "Site" : LEVEL_LABELS[0];
}

/** Live children of a node (archived left out), in order. */
export function liveChildren(tree: ProcessTree, parentId: string): ProcessNode[] {
  return (tree.childrenOf.get(parentId) ?? []).filter((n) => !n.archived);
}

/** THE display rule. Since 2026-10-29 a site's names ARE its tree, so
 *  the label is the node's name wherever it reads; the site argument
 *  stays so every caller keeps one call shape. */
export function processLabel(node: Pick<ProcessNode, "name">, _site: string): string {
  return node.name;
}

/** "Casting (Casthouse)" — the site node with its central counterpart's
 *  name when they differ; the name alone otherwise. */
export function processLabelWithCentral(tree: ProcessTree, node: ProcessNode): string {
  const c = tree.byId.get(centralOf(tree, node.nodeId));
  return c !== undefined && c.nodeId !== node.nodeId && c.name !== node.name ? `${node.name} (${c.name})` : node.name;
}

/** The node's ancestors from the type down to itself. */
export function processPath(tree: ProcessTree, nodeId: string): ProcessNode[] {
  const out: ProcessNode[] = [];
  let cur = tree.byId.get(nodeId);
  const seen = new Set<string>();
  while (cur && !seen.has(cur.nodeId)) {
    seen.add(cur.nodeId);
    out.unshift(cur);
    cur = cur.level === 0 ? undefined : tree.byId.get(cur.parentId);
  }
  return out;
}

/** The root a node belongs to — a site root or a central type ("" when
 *  the chain is broken). */
export function typeOf(tree: ProcessTree, nodeId: string): string {
  const path = processPath(tree, nodeId);
  return path[0]?.level === 0 ? path[0].nodeId : "";
}
export const rootOf = typeOf;

/** "Area › Process › Sub-process" for a site, type left out. */
export function processPathLabel(tree: ProcessTree, nodeId: string, site: string): string {
  return processPath(tree, nodeId)
    .filter((n) => n.level > 0)
    .map((n) => processLabel(n, site))
    .join(" › ");
}

/** The next order value under a parent. */
export function nextOrder(tree: ProcessTree, parentId: string): number {
  const kids = tree.childrenOf.get(parentId) ?? [];
  return kids.length === 0 ? 10 : Math.max(...kids.map((k) => k.order)) + 10;
}

/** Swap a node with its live neighbour (up = earlier). Returns the two
 *  nodes with their orders exchanged, or null at an edge. */
export function reorder(tree: ProcessTree, nodeId: string, up: boolean): [ProcessNode, ProcessNode] | null {
  const n = tree.byId.get(nodeId);
  if (!n) return null;
  const sib = liveChildren(tree, n.level === 0 ? "" : n.parentId);
  const i = sib.findIndex((s) => s.nodeId === nodeId);
  const j = up ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= sib.length) return null;
  const a = { ...sib[i], order: sib[j].order };
  const b = { ...sib[j], order: sib[i].order };
  // equal orders (legacy rows) would not swap: force distinct values
  if (a.order === b.order) {
    a.order = up ? b.order - 1 : b.order + 1;
  }
  return [a, b];
}

/** Is `nodeId` the ancestor itself or beneath it? ("" ancestor = any.) */
export function inSubtree(tree: ProcessTree, nodeId: string, ancestorId: string): boolean {
  if (ancestorId === "") return true;
  if (nodeId === "") return false;
  return processPath(tree, nodeId).some((n) => n.nodeId === ancestorId);
}

/** The live nodes under a type as a flat, indented option list for a
 *  filter select — "Casthouse", "  Ingot casting", "    Line 2" — with
 *  the site's local names. */
export function flatProcessOptions(tree: ProcessTree, typeId: string, site: string, maxLevel: ProcessLevel = 3): { value: string; label: string; level: ProcessLevel }[] {
  const out: { value: string; label: string; level: ProcessLevel }[] = [];
  const walk = (parentId: string) => {
    for (const n of liveChildren(tree, parentId)) {
      if (n.level > maxLevel) continue;
      out.push({ value: n.nodeId, label: `${"  ".repeat(Math.max(0, n.level - 1))}${processLabel(n, site)}`, level: n.level });
      walk(n.nodeId);
    }
  };
  if (typeId !== "" && tree.byId.has(typeId)) walk(typeId);
  return out;
}

// ---- the Process area term set (term-store-proposal §6, step 5) ---------

/** The LIVE SITE trees as label paths for the term set — site › area ›
 *  process › sub-process (features-plan-2026-10-29 §1: the central tree
 *  does not sync). Parents first. */
export function processTermPaths(tree: ProcessTree): { path: string[]; node: ProcessNode }[] {
  const out: { path: string[]; node: ProcessNode }[] = [];
  const walk = (parentId: string, prefix: string[]) => {
    for (const n of liveChildren(tree, parentId)) {
      if (n.level === 0 && n.site === "") continue; // central: not synced
      const path = [...prefix, n.name];
      out.push({ path, node: n });
      walk(n.nodeId, path);
    }
  };
  walk("", []);
  return out;
}

/** The term store writes "＆" for "&": compare both as "&". */
const labelKey = (s: string) => s.replace(/\uFF06/g, "&").trim().toLowerCase();

/** The synonyms the app once pushed for a node's local names, to strip
 *  from its term (decision 8, 2026-10-29): the non-default labels equal
 *  to an alias value — never the default label, never a label that is
 *  not an alias (someone typed it by hand). Returns the labels to keep
 *  and the names removed. */
export function synonymsToRemove(labels: { name: string; languageTag: string; isDefault: boolean }[], node: Pick<ProcessNode, "aliases">): { keep: { name: string; languageTag: string; isDefault: boolean }[]; removed: string[] } {
  const aliasKeys = new Set(Object.values(node.aliases).map(labelKey).filter((k) => k !== ""));
  const keep: { name: string; languageTag: string; isDefault: boolean }[] = [];
  const removed: string[] = [];
  for (const l of labels) {
    if (!l.isDefault && aliasKeys.has(labelKey(l.name))) removed.push(l.name);
    else keep.push(l);
  }
  return { keep, removed };
}

// ---- the migration (features-plan-2026-10-29 §1, decision 5) ---------------

/** A site's starter tree, CLONED from the type it was assigned: the root
 *  carries the site's name; every live descendant is copied in the
 *  site's own words (its local name when it had one) and linked to the
 *  node it came from. Term bindings start empty — the sync creates the
 *  site's terms. Returns the new nodes and old → new ids. */
export function cloneTypeForSite(tree: ProcessTree, typeId: string, site: string, newId: () => string = newNodeId): { nodes: ProcessNode[]; idMap: Record<string, string> } {
  const type = tree.byId.get(typeId);
  const nodes: ProcessNode[] = [];
  const idMap: Record<string, string> = {};
  if (!type || type.level !== 0 || site.trim() === "") return { nodes, idMap };
  const rootId = newId();
  nodes.push({ rowId: "", nodeId: rootId, parentId: "", level: 0, name: site.trim(), order: 10, termId: "", aliases: {}, archived: false, site: site.trim(), centralId: "" });
  idMap[typeId] = rootId;
  const walk = (fromId: string, toId: string) => {
    for (const n of liveChildren(tree, fromId)) {
      const id = newId();
      idMap[n.nodeId] = id;
      nodes.push({ rowId: "", nodeId: id, parentId: toId, level: n.level, name: processNameFor(n, site), order: n.order, termId: "", aliases: {}, archived: false, site: site.trim(), centralId: n.nodeId });
      walk(n.nodeId, id);
    }
  };
  walk(typeId, rootId);
  return { nodes, idMap };
}

/** What a site called a central node under the retired local-name
 *  model — the alias when it had one, the general name otherwise. */
export function processNameFor(node: Pick<ProcessNode, "name" | "aliases">, site: string): string {
  const local = node.aliases[site.trim().toLowerCase()] ?? "";
  return local !== "" ? local : node.name;
}

/** A reference's new node id after the migration: the clone for its
 *  site when the reference points at a central node of that site's
 *  type; unchanged otherwise (already a site node, or no clone). */
export function repointedNodeId(nodeId: string, idMap: Record<string, string>): string {
  return nodeId === "" ? "" : (idMap[nodeId] ?? nodeId);
}

// ---- the process filter a surface holds (features-plan-2026-10-29 §1, decision 7) ----

/** "site": a node of the scope site's own tree, subtree semantics;
 *  "central": a central node — a site node matches through its link.
 *  value "" = no filter. */
export interface ProcessFilter {
  mode: "site" | "central";
  value: string;
}

export const NO_PROCESS_FILTER: ProcessFilter = { mode: "site", value: "" };

/** Does a referenced node pass the filter? An empty filter passes all. */
export function matchesProcessFilter(tree: ProcessTree, nodeId: string, f: ProcessFilter): boolean {
  if (f.value === "") return true;
  return f.mode === "central" ? inCentralSubtree(tree, nodeId, f.value) : inSubtree(tree, nodeId, f.value);
}

/** A filter whose value no longer fits the scope — a site node from
 *  another site's tree, a central pick on a tree with no types — is
 *  cleared; the mode stays. */
export function fitProcessFilter(tree: ProcessTree, f: ProcessFilter, site: string): ProcessFilter {
  if (f.value === "") return f;
  if (f.mode === "central") return tree.byId.get(f.value)?.site === "" ? f : { ...f, value: "" };
  const root = siteRootOf(tree, site);
  return root !== "" && typeOf(tree, f.value) === root ? f : { ...f, value: "" };
}
