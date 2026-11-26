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

/** The terms of a vocabulary that the leading pills do NOT show, in the
 *  vocabulary's own order — what "Show all" adds on a short vocabulary
 *  (one with no search box and no tree, where they had no way in). */
export function restAfterLead<T extends TermLike>(nodes: T[], shown: T[]): T[] {
  const have = new Set(shown.map((n) => n.id.toLowerCase()));
  return nodes.filter((n) => !have.has(n.id.toLowerCase()));
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

// ---- a site's default branches (Settings → Documents → Default filters) -----

/** Is `a` the label path of `b` or of one of its ancestors? Case-blind. */
function isPathPrefix(a: string[], b: string[]): boolean {
  return a.length <= b.length && a.every((l, i) => l.toLowerCase() === b[i].toLowerCase());
}

/** A row of the Default filters tick tree. */
export interface DefaultFilterRow {
  id: string;
  label: string;
  /** 1 = a company or top-level unit, 2 = a site beneath one. */
  depth: 1 | 2;
}

/**
 * What a site's default may tick. With a company level in the
 * Organisation set the tree is two deep: each company (or top-level
 * unit) with ITS SITES beneath — so a site under another company can be
 * ticked. Without one the sites are the top level. Never departments
 * (Ben, 2026-08-14, confirmed 2026-11-18).
 *
 * Until 2026-11-18 the list was ONE depth, sites only when the set had a
 * single top-level term; a second company turned it into a list of
 * companies and no site could be ticked at all.
 */
export function defaultFilterRows(nodes: TermLike[], companyLevel: boolean): DefaultFilterRow[] {
  const tops = nodes.filter((n) => n.labels.length === 1);
  if (!companyLevel) return tops.map((n) => ({ id: n.id, label: n.labels[0], depth: 1 }));
  const out: DefaultFilterRow[] = [];
  for (const top of tops) {
    out.push({ id: top.id, label: top.labels[0], depth: 1 });
    for (const n of nodes) {
      if (n.labels.length === 2 && isPathPrefix(top.labels, n.labels)) out.push({ id: n.id, label: n.labels[1], depth: 2 });
    }
  }
  return out;
}

/**
 * The branches a member's folders pane opens on: their OWN site first —
 * always, ticked or not, as the setting has always said ("their own
 * plus…") — then the mapped branches in the walk's order. It used to
 * lead with the site only when the site itself was ticked, so a default
 * of just a company made the whole company the member's default filter.
 */
export function defaultBranchRoots<T extends TermLike>(nodes: T[], siteTerm: T | null, mapped: string[]): T[] {
  const wanted = new Set(mapped.map((id) => id.toLowerCase()));
  const rest = nodes.filter((n) => wanted.has(n.id.toLowerCase()) && (siteTerm === null || n.id !== siteTerm.id));
  return siteTerm !== null ? [siteTerm, ...rest] : rest;
}

/**
 * What a first visit folds (label paths): every other mapped branch;
 * under a mapped branch that CONTAINS the member's site (their company)
 * the sites beside theirs, never the path down to it; and their site's
 * departments other than their own.
 */
export function firstVisitFolds(nodes: TermLike[], roots: TermLike[], myDepartment: string): string[][] {
  if (roots.length === 0) return [];
  const mine = roots[0].labels;
  const dept = myDepartment.trim().toLowerCase();
  const folds: string[][] = [];
  for (const r of roots.slice(1)) {
    if (!(r.labels.length < mine.length && isPathPrefix(r.labels, mine))) {
      folds.push(r.labels);
      continue;
    }
    // an ancestor of my site: fold what branches off the path to it
    for (const n of nodes) {
      const d = n.labels.length;
      if (d <= r.labels.length || d > mine.length) continue;
      if (isPathPrefix(mine.slice(0, d - 1), n.labels) && !isPathPrefix(n.labels, mine)) folds.push(n.labels);
    }
  }
  for (const n of nodes) {
    if (n.labels.length === mine.length + 1 && isPathPrefix(mine, n.labels) && n.labels[n.labels.length - 1].toLowerCase() !== dept) folds.push(n.labels);
  }
  return folds;
}

/**
 * The rows a term filter REALLY matches (issue review 2026-11-25,
 * report 5). The listing road asks SharePoint by the term's NAME, which
 * is fast and is wrong when two terms share one: a filter on Metal
 * Delivery › General also returned Casthouse › General. Each row has
 * carried its terms' IDs since v0.99.0 (`<col>#termid`), so the app
 * keeps a row only when one of its ids is among those picked. A row
 * with no ids on the filtered columns is kept, as it always was — the
 * name is then all there is to go by.
 */
export function matchesTermFilters(values: Record<string, string>, filters: { cols: string[]; ids: string[] }[]): boolean {
  for (const f of filters) {
    if (f.ids.length === 0) continue;
    const carried: string[] = [];
    for (const col of f.cols) {
      for (const id of (values[`${col}#termid`] ?? "").split(";")) {
        const t = id.trim().toLowerCase();
        if (t !== "") carried.push(t);
      }
    }
    if (carried.length === 0) continue;
    const picked = new Set(f.ids.map((x) => x.trim().toLowerCase()));
    if (!carried.some((id) => picked.has(id))) return false;
  }
  return true;
}
