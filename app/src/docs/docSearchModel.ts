// The document search's pure half (2026-11-23, report 9): turning the
// per-library answers into one short list, and saying which libraries
// could not be read. No SDK imports — unit-tested.

export interface DocSearchHit<L> {
  uniqueId: string;
  name: string;
  docId: string;
  lib: L;
}

/** One library's answer: its rows, or `failed` when it could not be read. */
export interface DocSearchPage {
  rows: { uniqueId: string; name: string; values: Record<string, string> }[];
  failed: boolean;
}

/** The hits to offer, library by library in the order given, less the
 *  document being edited and anything already offered; and the names of
 *  the libraries that could not be read. */
export function mergeDocHits<L>(
  libraries: L[],
  pages: DocSearchPage[],
  o: { exclude: string; docIdInternal: string; max: number; nameOf: (l: L) => string }
): { hits: DocSearchHit<L>[]; unread: string[] } {
  const hits: DocSearchHit<L>[] = [];
  const unread: string[] = [];
  const seen = new Set<string>([o.exclude.toLowerCase()]);
  for (let i = 0; i < libraries.length; i++) {
    const page = pages[i];
    if (page === undefined || page.failed) {
      unread.push(o.nameOf(libraries[i]));
      continue;
    }
    for (const r of page.rows) {
      const k = r.uniqueId.toLowerCase();
      if (k === "" || seen.has(k) || hits.length >= o.max) continue;
      seen.add(k);
      hits.push({
        uniqueId: r.uniqueId,
        name: r.name,
        docId: o.docIdInternal !== "" ? (r.values[o.docIdInternal] ?? "").trim() : "",
        lib: libraries[i],
      });
    }
  }
  return { hits, unread };
}

/** The line under a hit's name: its library, and its document id. */
export function hitSubline(libraryName: string, docId: string): string {
  return docId !== "" ? `${libraryName} · ${docId}` : libraryName;
}

/** The line naming what could not be searched ("" = everything was). */
export function unreadWords(names: string[]): string {
  if (names.length === 0) return "";
  return `Could not search ${names.join(", ")}.`;
}
