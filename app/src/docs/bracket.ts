// The check-out bracket's one failure rule (issue review 2026-11-25,
// reports 14 and 16): every step that writes inside a check-out —
// lifecycle steps, edit requests, Edit properties — ends a refusal
// here, so a half-finished step never leaves a document locked by
// someone who did not ask for it. NOT used by Add document: a file that
// has never been checked in is DELETED by a discard.

import { spErrorText } from "./model";
import { AfterRefusal, holderIsMe, lockHolder, lockWords, refusalLine } from "./refusal";
import { undoCheckOut } from "./sp";
import { currentViewer } from "../runtime";

export interface BracketState {
  site: string;
  serverUrl: string;
  /** The step took the check-out itself (false = the person held it). */
  took: boolean;
  /** How many times this dialog has been refused by Word's lock. */
  locks: number;
}

export function newBracket(site: string, serverUrl: string): BracketState {
  return { site, serverUrl, took: false, locks: 0 };
}

/** A sign-in address as a name, where the roster knows the person. */
async function shownHolder(holder: string): Promise<string> {
  const h = holder.trim().toLowerCase();
  if (h === "" || !h.includes("@")) return holder;
  try {
    const { listPeople } = await import("../store/people");
    const hit = (await listPeople(true)).find((p) => p.email.trim().toLowerCase() === h);
    return hit && hit.who.trim() !== "" ? hit.who : holder;
  } catch {
    return holder;
  }
}

/**
 * The words for a refused step, having released the check-out when the
 * step took it. `inBracket` false = refused before any check-out (the
 * check-out itself, a read): nothing to release.
 */
export async function refused(b: BracketState, what: string, why: string, inBracket = true): Promise<string> {
  const text = spErrorText(why);
  const holder = lockHolder(text);
  let reason: string;
  if (holder !== null) {
    const v = currentViewer();
    const mine = holder === "" || holderIsMe(holder, { email: v?.email ?? "", name: v?.name ?? "" });
    reason = lockWords({ mine, shown: mine ? "" : await shownHolder(holder), again: b.locks > 0 });
    b.locks += 1;
  } else {
    reason = `${what}: ${text.slice(0, 300)}`;
  }
  let after: AfterRefusal = "none";
  if (inBracket) {
    if (!b.took) after = "held";
    else {
      const undo = await undoCheckOut(b.site, b.serverUrl).catch(() => ({ ok: false, status: "", data: null }));
      const gone = undo.ok || /not checked out/i.test(spErrorText(undo.status));
      after = gone ? "released" : "stuck";
      if (gone) b.took = false;
    }
  }
  return refusalLine(reason, after);
}

/** A refusal outside any bracket (Check in…, Check out, Discard): the
 *  lock in plain words, else SharePoint's own sentence. */
export async function plainRefusal(why: string): Promise<string> {
  const text = spErrorText(why);
  const holder = lockHolder(text);
  if (holder === null) return text;
  const v = currentViewer();
  const mine = holder === "" || holderIsMe(holder, { email: v?.email ?? "", name: v?.name ?? "" });
  return lockWords({ mine, shown: mine ? "" : await shownHolder(holder), again: false });
}
