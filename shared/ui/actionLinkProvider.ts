// Where the action dialog learns what an action may be linked to. The
// host registers ONE provider at boot (the app: rituals and initiatives
// the viewer may see); every dialog — a card's, the hub's, quick add's —
// reads it, so no control needs the list handed to it. No provider (a
// standalone control): the dialog shows no link field. Tiny on purpose —
// the shell imports it without pulling the dialog in.

import { LinkTarget } from "../schema/actionLinks";
import type { EndorseContext } from "../schema/actionEndorsement";
import type { RescheduleSettings } from "../schema/reschedule";

export interface ActionLinkContext {
  targets: LinkTarget[];
  /** The viewer — an unlinked action returns to their personal channel. */
  personalWho: string;
  /** The board on screen, null off the boards. */
  openBoardId: string | null;
  /** The card on screen as an instance key ("board:card"), "" when none —
   *  the home of an action raised there that carries no key yet. */
  openHome: string;
  /** The open board's title, so the chip can NAME an initiative the
   *  viewer's list does not carry (action-link-review-2026-10-30). */
  openBoardTitle?: string;
}

let provider: (() => Promise<ActionLinkContext>) | null = null;

export function setActionLinkProvider(p: (() => Promise<ActionLinkContext>) | null): void {
  provider = p;
}

export function actionLinkProvider(): (() => Promise<ActionLinkContext>) | null {
  return provider;
}

/** Fired after a save that moved an action to another home — the host
 *  showing the list it left refreshes. */
export const ACTION_MOVED_EVENT = "ltk-action-moved";

/** Who is using the app — the author of a comment written in the action
 *  dialog. The host registers it once; a standalone control passes
 *  `viewer` to the dialog instead, or comments are read-only there. */
let viewerProvider: (() => { whoId: string; who: string } | null) | null = null;

export function setActionViewerProvider(p: (() => { whoId: string; who: string } | null) | null): void {
  viewerProvider = p;
}

export function actionViewer(): { whoId: string; who: string } | null {
  try {
    return viewerProvider ? viewerProvider() : null;
  } catch {
    return null;
  }
}

/** Does closing this action need an endorsement, and may the viewer give
 *  it? Answered at once from what the host already knows (null = not on
 *  an initiative, or not known yet — the store applies the rule again at
 *  the write, so nothing slips through). */
let endorsementLookup: ((a: { initiativeId?: string; instanceId: string }) => EndorseContext | null) | null = null;

export function setEndorsementLookup(f: ((a: { initiativeId?: string; instanceId: string }) => EndorseContext | null) | null): void {
  endorsementLookup = f;
}

export function endorsementFor(a: { initiativeId?: string; instanceId: string }): EndorseContext | null {
  try {
    return endorsementLookup ? endorsementLookup(a) : null;
  } catch {
    return null;
  }
}

/** Due-date moves: which actions ask for a reason, and the reasons
 *  offered. The host registers the organisation's settings; null = no
 *  host (a standalone control) or a failed read — the asker falls back
 *  to the defaults (`currentRescheduleSettings` in reschedulePrompt.ts;
 *  the registry stays type-only so the shell carries no rule code). */
let rescheduleProvider: (() => Promise<RescheduleSettings>) | null = null;

export function setRescheduleProvider(p: (() => Promise<RescheduleSettings>) | null): void {
  rescheduleProvider = p;
}

export async function hostRescheduleSettings(): Promise<RescheduleSettings | null> {
  try {
    return rescheduleProvider ? await rescheduleProvider() : null;
  } catch {
    return null;
  }
}

/** Adding someone from the directory while assigning an action (issue
 *  12, 2026-11-16). The host registers the road — and decides who is
 *  offered it (admins); null = not offered to this viewer, or no host. */
export interface ActionDirectoryRoad {
  search: (q: string) => Promise<{ objectId: string; displayName: string; mail: string }[]>;
  add: (hit: { objectId: string; displayName: string; mail: string }) => Promise<{ whoId: string; who: string }>;
}
let directoryProvider: (() => Promise<ActionDirectoryRoad | null>) | null = null;

export function setActionDirectoryProvider(p: (() => Promise<ActionDirectoryRoad | null>) | null): void {
  directoryProvider = p;
}

export async function actionDirectory(): Promise<ActionDirectoryRoad | null> {
  try {
    return directoryProvider ? await directoryProvider() : null;
  } catch {
    return null;
  }
}

/** Fired when the endorsement rule changed an action at the write (a
 *  closing road that could not apply it itself) — open lists refresh. */
export const ACTION_RULED_EVENT = "ltk-action-ruled";
