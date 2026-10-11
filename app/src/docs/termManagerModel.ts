// The term manager's pure parts (term-store-proposal-2026-10.md §3,
// built 2026-10-12): a term's labels by language (default + synonyms),
// composing the collection back for one PATCH, the tree from a walk,
// and which rows a search shows. SDK-free, tested.

export interface TermLabel {
  name: string;
  languageTag: string;
  isDefault: boolean;
}

export interface LanguageLabels {
  /** The default label in this language ("" when none). */
  name: string;
  synonyms: string[];
}

/** Labels grouped by language, every working language present even
 *  when the term has nothing in it yet; unknown tags are kept too (a
 *  label in a language the store no longer lists must not be lost). */
export function labelsByLanguage(labels: TermLabel[], languages: string[]): Map<string, LanguageLabels> {
  const out = new Map<string, LanguageLabels>();
  for (const l of languages) out.set(l, { name: "", synonyms: [] });
  for (const l of labels) {
    const tag = (l.languageTag ?? "").trim() || languages[0] || "en-US";
    const slot = out.get(tag) ?? { name: "", synonyms: [] };
    const name = (l.name ?? "").trim();
    if (name === "") continue;
    if (l.isDefault && slot.name === "") slot.name = name;
    else slot.synonyms.push(name);
    out.set(tag, slot);
  }
  return out;
}

/** The collection to write: one default per language that has a name,
 *  synonyms after it, blanks dropped, duplicates (case-insensitive,
 *  within a language) dropped, the default kept over a same-named
 *  synonym. A term with no default label anywhere is refused by the
 *  store, so the result is empty when nothing remains. */
export function composeLabels(byLang: Map<string, LanguageLabels>): TermLabel[] {
  const out: TermLabel[] = [];
  for (const [tag, slot] of byLang) {
    const seen = new Set<string>();
    const name = slot.name.trim();
    if (name !== "") {
      out.push({ name, languageTag: tag, isDefault: true });
      seen.add(name.toLowerCase());
    }
    for (const raw of slot.synonyms) {
      const s = raw.trim();
      if (s === "" || seen.has(s.toLowerCase())) continue;
      seen.add(s.toLowerCase());
      out.push({ name: s, languageTag: tag, isDefault: false });
    }
  }
  return out.some((l) => l.isDefault) ? out : [];
}

export interface TreeNode {
  id: string;
  /** Full label path from the set root. */
  path: string[];
  /** The id of the parent, "" at the root. */
  parentId: string;
  depth: number;
}

/** A walk's flat nodes as a tree index: parent ids resolved by path. */
export function buildTree(nodes: { id: string; labels: string[] }[]): { nodes: TreeNode[]; childrenOf: Map<string, TreeNode[]> } {
  const byPath = new Map<string, string>();
  const key = (p: string[]) => p.map((s) => s.trim().toLowerCase()).join("¦");
  for (const n of nodes) byPath.set(key(n.labels), n.id);
  const out: TreeNode[] = nodes.map((n) => ({
    id: n.id,
    path: n.labels,
    parentId: n.labels.length > 1 ? (byPath.get(key(n.labels.slice(0, -1))) ?? "") : "",
    depth: n.labels.length - 1,
  }));
  const childrenOf = new Map<string, TreeNode[]>();
  for (const n of out) childrenOf.set(n.parentId, [...(childrenOf.get(n.parentId) ?? []), n]);
  for (const list of childrenOf.values()) list.sort((a, b) => a.path[a.path.length - 1].localeCompare(b.path[b.path.length - 1], undefined, { sensitivity: "base", numeric: true }));
  return { nodes: out, childrenOf };
}

/** The ids a search shows: every node whose own label contains the
 *  query, plus its ancestors so the hit sits in its branch. Null = no
 *  query, show everything. */
export function visibleIds(nodes: TreeNode[], query: string): Set<string> | null {
  const q = query.trim().toLowerCase();
  if (q === "") return null;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const out = new Set<string>();
  for (const n of nodes) {
    if (!n.path[n.path.length - 1].toLowerCase().includes(q)) continue;
    let cur: TreeNode | undefined = n;
    while (cur && !out.has(cur.id)) {
      out.add(cur.id);
      cur = byId.get(cur.parentId);
    }
  }
  return out;
}

/** The label a tree row shows for a node: its own last path segment. */
export const nodeLabel = (n: TreeNode): string => n.path[n.path.length - 1] ?? "";
