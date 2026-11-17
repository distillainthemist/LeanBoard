// The register's Filters pane — the pure rules (2026-11-17, issues 7, 8
// and 9): the order the filter groups stand in, which terms LEAD a
// column's pills for the person looking, and the tree a deep vocabulary
// is picked from. No DOM, no SharePoint — docsScreen draws it.

/** A term as the walk hands it: its id and its label path from the
 *  set's root. */
export interface TermLike {
  id: string;
  labels: string[];
}

// ---- the order of the groups (issue 9) ---------------------------------------

/** The columns everyone reaches for first, by ROLE. */
export const LEADING_FILTER_ROLES = ["status", "docType", "processArea"];

/** Status, document type and process area lead, in that order; every
 *  other column keeps the place it had (the organisation among them). */
export function orderFilterColumns(cols: string[], roleOf: (col: string) => string): string[] {
  const rank = (col: string): number => {
    const i = LEADING_FILTER_ROLES.indexOf(roleOf(col));
    return i === -1 ? LEADING_FILTER_ROLES.length : i;
  };
  return cols.map((col, i) => ({ col, i })).sort((a, b) => rank(a.col) - rank(b.col) || a.i - b.i).map((x) => x.col);
}

// ---- featured terms (issue 7) --------------------------------------------------

/** A column's featured terms are kept per SCOPE: everyone ("") — a site
 *  — a department of a site. The nearest scope that has a list wins. */
export const FEATURED_ALL = "";
export function featuredScopeKey(site: string, department = ""): string {
  const s = site.trim();
  if (s === "") return FEATURED_ALL;
  const d = department.trim();
  return d === "" ? `site:${s}` : `dept:${s}|${d}`;
}

/** What a scope key reads as in Settings. */
export function featuredScopeLabel(key: string): string {
  if (key === FEATURED_ALL) return "Everyone";
  if (key.startsWith("site:")) return key.slice(5);
  if (key.startsWith("dept:")) return key.slice(5).replace("|", " › ");
  return key;
}

export type FeaturedMap = Record<string, string[]>;

const findScope = (featured: FeaturedMap, key: string): string[] | undefined => {
  // sites and departments are matched case-blind: a profile's "casting"
  // is the settings' "Casting"
  const k = Object.keys(featured).find((x) => x.toLowerCase() === key.toLowerCase());
  return k !== undefined && featured[k].length > 0 ? featured[k] : undefined;
};

/** The featured term ids for a person: their department's list, else
 *  their site's, else everyone's, else none. */
export function featuredFor(featured: FeaturedMap | undefined, profile: { site: string; department: string }): string[] {
  if (featured === undefined) return [];
  return (
    (profile.site !== "" && profile.department !== "" ? findScope(featured, featuredScopeKey(profile.site, profile.department)) : undefined) ??
    (profile.site !== "" ? findScope(featured, featuredScopeKey(profile.site)) : undefined) ??
    findScope(featured, FEATURED_ALL) ??
    []
  );
}

/** A parsed featured map: scope → term ids, empties dropped. */
export function parseFeatured(raw: unknown): FeaturedMap | undefined {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const out: FeaturedMap = {};
  for (const [key, list] of Object.entries(raw as Record<string, unknown>)) {
    if (!Array.isArray(list)) continue;
    const ids = [...new Set(list.filter((x): x is string => typeof x === "string" && x.trim() !== "").map((x) => x.trim()))];
    if (ids.length > 0) out[key] = ids;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/** The terms a column's pills LEAD with: the featured ones, in their
 *  order, where the walk still has them; with none, the top two levels
 *  (the pane's long-standing default). */
export function leadTerms<T extends TermLike>(nodes: T[], featuredIds: string[]): T[] {
  const byId = new Map(nodes.map((n) => [n.id.toLowerCase(), n]));
  const featured = featuredIds.map((id) => byId.get(id.toLowerCase())).filter((n): n is T => n !== undefined);
  return featured.length > 0 ? featured : nodes.filter((n) => n.labels.length <= 2);
}

// ---- the tree (issue 8) ----------------------------------------------------------

/** How deep a vocabulary must go before its filter is a tree rather
 *  than a row of pills. */
export const TREE_FILTER_MIN_DEPTH = 3;

export function vocabularyDepth(nodes: TermLike[]): number {
  return nodes.reduce((d, n) => Math.max(d, n.labels.length), 0);
}

export interface TermTreeNode<T extends TermLike> {
  node: T;
  children: TermTreeNode<T>[];
}

const pathKey = (labels: string[]): string => labels.map((l) => l.toLowerCase()).join("\u0001");

/** The walk's flat list as a tree, by label path, in the walk's order. A
 *  term whose parent the walk missed hangs from the root — never lost. */
export function termTree<T extends TermLike>(nodes: T[]): TermTreeNode<T>[] {
  const byPath = new Map<string, TermTreeNode<T>>();
  for (const n of nodes) byPath.set(pathKey(n.labels), { node: n, children: [] });
  const roots: TermTreeNode<T>[] = [];
  for (const n of nodes) {
    const me = byPath.get(pathKey(n.labels))!;
    const parent = n.labels.length > 1 ? byPath.get(pathKey(n.labels.slice(0, -1))) : undefined;
    if (parent && parent !== me) parent.children.push(me);
    else roots.push(me);
  }
  return roots;
}

const ancestorsOf = <T extends TermLike>(nodes: T[], n: T): T[] => nodes.filter((a) => a.labels.length < n.labels.length && a.labels.every((l, i) => n.labels[i].toLowerCase() === l.toLowerCase()));

/** The ids to SHOW for a typed search: every term with a label that
 *  contains it, and the path down to each. null = no search (show all). */
export function treeSearch<T extends TermLike>(nodes: T[], query: string): Set<string> | null {
  const q = query.trim().toLowerCase();
  if (q === "") return null;
  const show = new Set<string>();
  for (const n of nodes) {
    if (!n.labels[n.labels.length - 1].toLowerCase().includes(q)) continue;
    show.add(n.id);
    for (const a of ancestorsOf(nodes, n)) show.add(a.id);
  }
  return show;
}

/** The branches to OPEN when the tree first shows: down to the person's
 *  own site and department (matched by name, case-blind, at any depth),
 *  and down to anything already picked. Everything else starts closed. */
export function openBranches<T extends TermLike>(nodes: T[], profile: { site: string; department: string }, pickedIds: string[]): Set<string> {
  const open = new Set<string>();
  const names = [profile.site, profile.department].map((x) => x.trim().toLowerCase()).filter((x) => x !== "");
  const picked = new Set(pickedIds.map((id) => id.toLowerCase()));
  for (const n of nodes) {
    const last = n.labels[n.labels.length - 1].toLowerCase();
    const mine = names.includes(last);
    if (!mine && !picked.has(n.id.toLowerCase())) continue;
    for (const a of ancestorsOf(nodes, n)) open.add(a.id);
    // the person's own branch opens one level further — its children show
    if (mine) open.add(n.id);
  }
  return open;
}
