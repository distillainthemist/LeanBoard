// What a refused step says (issue review 2026-11-25, reports 14 and 16).
// Pure.
//
//  - Word holds a LOCK on a file that is open in it, quite apart from a
//    check-out. A step that writes then comes back "The file … is locked
//    for exclusive use by <who>" — which read as a fault in the app
//    (Ben, 2026-11-24). One rule says it plainly, for every step.
//  - A step that took the check-out ITSELF releases it when it fails, so
//    the step is all or nothing; one the person already held is left
//    alone, with their work in it. The words say which.

/** Who SharePoint says holds the lock, as it wrote them ("" = a lock
 *  with no name); null = this refusal is not a lock. */
export function lockHolder(text: string): string | null {
  const m = text.match(/locked for (?:exclusive|shared) use(?: by\s+([^\n"”<>]*))?/i);
  if (!m) return null;
  return (m[1] ?? "")
    .trim()
    .replace(/[.\s]+$/, "")
    .replace(/^i:0#\.[fw]\|[^|]*\|/i, "");
}

/** Is the holder the person acting? An address or a display name. */
export function holderIsMe(holder: string, me: { email: string; name: string }): boolean {
  const h = holder.trim().toLowerCase();
  if (h === "") return false;
  return h === me.email.trim().toLowerCase() || h === me.name.trim().toLowerCase();
}

/** The lock, in plain words. `shown`: the holder as the reader should
 *  see them — a name where the app knows one, else what SharePoint gave.
 *  `again`: this dialog has been refused by the lock before. */
export function lockWords(o: { mine: boolean; shown: string; again: boolean }): string {
  const first =
    o.mine || o.shown.trim() === ""
      ? "This document is open in Word. Close it there, then press again."
      : `${o.shown.trim()} has this document open in Word. Ask them to close it, then press again.`;
  return o.again ? `${first} Word can hold a document for a moment after it is closed. Wait a few seconds and press again.` : first;
}

/** How the check-out stands after a refusal.
 *   - "released": the step took it and has given it back;
 *   - "stuck": the step took it and the release was refused;
 *   - "held": the person held it before the step, and still does;
 *   - "none": the step never held one. */
export type AfterRefusal = "released" | "stuck" | "held" | "none";

/** The whole line. `reason` is the lock's words, or "<what>: <why>". */
export function refusalLine(reason: string, after: AfterRefusal): string {
  const r = reason.trim();
  if (after === "released") return `Nothing was changed. ${r}`;
  if (after === "stuck") return `${r} It is still checked out to you. Use Check in or Discard from the document's menu.`;
  if (after === "held") return `${r} It was already checked out, and still is.`;
  return r;
}
