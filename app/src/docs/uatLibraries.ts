// UAT-only libraries (2026-11-23, report 1). A library ticked "UAT only"
// in Settings → Documents → Libraries shows only to people in UAT mode:
// those assigned to a RUNNING UAT run, and super admins. Everyone else
// never hears of it — not in the register, the pickers, the cards, nor
// as a link on another document.
//
// This is the APP hiding a library. SharePoint's own permissions are
// unchanged: someone holding the library's address can still open it
// there.
//
// Pure, with one piece of session state: the list ids hidden from THIS
// viewer, set by the one library read (docsStore.docsConfig) and asked
// by whatever paints a link.

/** What the library's name carries for those who can see it. */
export const UAT_TAG = "UAT";

/** The name a UAT-only library shows under. */
export function uatTitle(title: string): string {
  return `${title} · ${UAT_TAG}`;
}

/** The name without the tag — what a card's "library" setting was
 *  typed against. */
export function uatBareTitle(title: string): string {
  const tag = ` · ${UAT_TAG}`;
  return title.endsWith(tag) ? title.slice(0, -tag.length) : title;
}

/** Split the exposed libraries for one viewer: what they see, and the
 *  list ids kept from them. */
export function splitUatLibraries<T extends { listId: string; config: { uatOnly?: boolean } }>(
  libraries: T[],
  inUatMode: boolean
): { visible: T[]; hidden: string[] } {
  if (inUatMode) return { visible: libraries, hidden: [] };
  const visible: T[] = [];
  const hidden: string[] = [];
  for (const l of libraries) {
    if (l.config.uatOnly === true) hidden.push(l.listId);
    else visible.push(l);
  }
  return { visible, hidden };
}

const key = (listId: string): string => listId.trim().replace(/^\{|\}$/g, "").toLowerCase();

let hiddenIds = new Set<string>();

/** Set by the library read: the list ids this viewer is not shown. */
export function setUatHidden(listIds: Iterable<string>): void {
  hiddenIds = new Set([...listIds].map(key).filter((k) => k !== ""));
}

/** Is this library kept from the viewer? */
export function isUatHidden(listId: string): boolean {
  return hiddenIds.size > 0 && hiddenIds.has(key(listId));
}

/** A document's links without those into a library the viewer is not
 *  shown: hidden entirely, not greyed (Ben, 2026-11-23). */
export function visibleLinks<T extends { listId: string }>(links: T[]): T[] {
  return hiddenIds.size === 0 ? links : links.filter((l) => !isUatHidden(l.listId));
}

/** What an editor that painted only the visible links must save: its
 *  own list, plus the hidden ones it never showed — a save by someone
 *  outside UAT must not strip them. */
export function withHiddenLinks<T extends { listId: string }>(original: T[], edited: T[]): T[] {
  if (hiddenIds.size === 0) return edited;
  return [...edited, ...original.filter((l) => isUatHidden(l.listId))];
}
