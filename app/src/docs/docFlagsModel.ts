// Document flags (issue 23, Ben 2026-10-19) — the pure side. A flag is a
// Dataverse row pointing at a SharePoint document: any reader raises one
// (a review level from the app-managed list, a comment, an optional
// screenshot) without a check-out; the document's owners hear on Teams;
// controllers triage; Mark reviewed offers to close. vitest covers
// this module; the store (docFlags.ts) talks to Dataverse.

export interface DocFlag {
  id: string;
  site: string;
  /** Lowercased list GUID. */
  listId: string;
  itemId: number;
  /** Lowercased unique id ("" when the feed never carried it). */
  uid: string;
  docName: string;
  docVersion: string;
  level: string;
  comment: string;
  status: "open" | "closed";
  source: "register" | "ingestion";
  flaggerEmail: string;
  flaggerName: string;
  flaggedAt: string;
  closedByName: string;
  closedAt: string;
  resolution: string;
  hasScreenshot: boolean;
}

/** The levels a site starts with — edited under Settings → Documents →
 *  Review levels; an empty list means these. */
export const DEFAULT_REVIEW_LEVELS = ["Minor correction", "Content review", "Full rewrite", "Withdraw"];

export function reviewLevelsOf(cfg: { reviewLevels: string[] }): string[] {
  const own = cfg.reviewLevels.map((l) => l.trim()).filter((l) => l !== "");
  return own.length > 0 ? own : [...DEFAULT_REVIEW_LEVELS];
}

/** The register's key for a document: list + item. */
export function flagKey(listId: string, itemId: number): string {
  return `${listId.trim().toLowerCase()}:${itemId}`;
}

export function flagsByDoc(flags: DocFlag[]): Map<string, DocFlag[]> {
  const out = new Map<string, DocFlag[]>();
  for (const f of flags) {
    const k = flagKey(f.listId, f.itemId);
    out.set(k, [...(out.get(k) ?? []), f]);
  }
  return out;
}

/** The row's primary name: "<level> — <document>". */
export function flagTitle(level: string, docName: string): string {
  return `${level.trim()} — ${docName.trim()}`.slice(0, 290);
}

/** The flags that belong in a person's Document tasks: every open flag
 *  for a controller; for anyone else, the flags on documents they own
 *  (`ownerEmailsOf` = the fetched row's owner emails, null = the row
 *  could not be read, so nothing is assumed). Newest first. */
export function flagsForTasks(
  flags: DocFlag[],
  who: { myEmail: string; isController: boolean; ownerEmailsOf: (f: DocFlag) => string[] | null }
): DocFlag[] {
  const me = who.myEmail.trim().toLowerCase();
  return flags
    .filter((f) => f.status === "open")
    .filter((f) => who.isController || (me !== "" && (who.ownerEmailsOf(f) ?? []).some((e) => e.trim().toLowerCase() === me)))
    .sort((a, b) => (a.flaggedAt < b.flaggedAt ? 1 : a.flaggedAt > b.flaggedAt ? -1 : 0));
}

/** "⚑ 2 open flags" / "⚑ Content review". */
export function flagChipText(open: DocFlag[]): string {
  if (open.length === 0) return "";
  if (open.length === 1) return `⚑ ${open[0].level}`;
  return `⚑ ${open.length} open flags`;
}

/** The Teams card to the owners. */
export function flagNotice(f: { level: string; docName: string; flaggerName: string; comment: string }): { subject: string; message: string; quote: { label: string; text: string } } {
  return {
    subject: `Flagged for review: ${f.docName}`,
    message: `${f.flaggerName || "Someone"} flagged “${f.docName}” — ${f.level}. Open it in LeanBoard to see the flag and close it once dealt with.`,
    quote: { label: "Their comment", text: f.comment.trim() || "(no comment)" },
  };
}
