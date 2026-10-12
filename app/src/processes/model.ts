// The process model's pure parts (term-store-proposal-2026-10.md §6,
// built 2026-10-12): a process TYPE (Mine, Refinery, Smelter) is a named
// hierarchy of area › process › sub-process; a site is assigned one
// type; a node carries local names per site (the "Casthouse" that one
// site calls "Casting"); every surface reads a node's name through ONE
// rule, processLabel. SDK-free, tested.

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
  /** site (lowercased) → the local name there */
  aliases: Record<string, string>;
  archived: boolean;
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
  /** The process types (level 0), in order. */
  types: ProcessNode[];
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
  return { byId, childrenOf, types: (childrenOf.get("") ?? []).filter((n) => n.level === 0) };
}

/** Live children of a node (archived left out), in order. */
export function liveChildren(tree: ProcessTree, parentId: string): ProcessNode[] {
  return (tree.childrenOf.get(parentId) ?? []).filter((n) => !n.archived);
}

/** THE display rule (proposal §6): the site's local name when a site is
 *  in scope and has one, else the general name. */
export function processLabel(node: Pick<ProcessNode, "name" | "aliases">, site: string): string {
  const local = site.trim() === "" ? "" : (node.aliases[site.trim().toLowerCase()] ?? "");
  return local !== "" ? local : node.name;
}

/** "Casthouse (Casting)" when the site's name differs, else the name. */
export function processLabelWithGeneral(node: Pick<ProcessNode, "name" | "aliases">, site: string): string {
  const local = processLabel(node, site);
  return local !== node.name ? `${local} (${node.name})` : node.name;
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

/** The type a node belongs to ("" when the chain is broken). */
export function typeOf(tree: ProcessTree, nodeId: string): string {
  const path = processPath(tree, nodeId);
  return path[0]?.level === 0 ? path[0].nodeId : "";
}

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
