// The priority popup's Actions tab, the pure half (issues 5 and 11,
// 2026-11-16): which actions it shows, the heading each sits under, where
// a new one may land, and which rows a change touched. UI-free, tested.

import { actionBelongsTo, boardChannelKey, LtkAction } from "../../../shared/schema/actions";

export interface TabInitiative {
  id: string;
  title: string;
  boardId: string;
}

/** The actions of these initiatives, out of every initiative action. */
export function actionsOfInitiatives(initiatives: TabInitiative[], actions: LtkAction[]): LtkAction[] {
  return actions.filter((a) => initiatives.some((i) => actionBelongsTo(i, a)));
}

/** The initiative an action sits under (its heading in the list, its tag
 *  on a kanban card); null when none of them claims it. */
export function initiativeOf(initiatives: TabInitiative[], a: Pick<LtkAction, "initiativeId" | "instanceId">): TabInitiative | null {
  return initiatives.find((i) => actionBelongsTo(i, a)) ?? null;
}

/** Where an action raised for an initiative is keyed: its board's own
 *  channel, or — a single-action initiative has no board — the
 *  Improvement tab's key for it. */
export function homeKeyFor(i: TabInitiative): string {
  return i.boardId !== "" ? boardChannelKey(i.boardId) : `improvement:${i.id}`;
}

/** The label of a priority's own actions, wherever they are grouped. */
export const OWN_LABEL = "This priority";

/** The homes a new action may be given: the priority itself first (when
 *  the viewer may raise on it — `ownKey` is then its action key), then
 *  the initiatives in title order. */
export function homesFor(initiatives: TabInitiative[], ownKey = ""): { key: string; label: string; initiativeId: string }[] {
  const own = ownKey !== "" ? [{ key: ownKey, label: OWN_LABEL, initiativeId: "" }] : [];
  return [...own, ...[...initiatives].sort((a, b) => a.title.localeCompare(b.title)).map((i) => ({ key: homeKeyFor(i), label: i.title, initiativeId: i.id }))];
}

/** What the tab lists: the priority's own actions first, then its
 *  initiatives'. An action is never listed twice. */
export function tabActions(own: LtkAction[], initiatives: TabInitiative[], actions: LtkAction[]): LtkAction[] {
  const mine = new Set(own.map((a) => a.id));
  return [...own, ...actionsOfInitiatives(initiatives, actions).filter((a) => !mine.has(a.id))];
}

/** How many of a priority's own actions are still open (the warning on
 *  Complete and Archive counts them). */
export function openOwn(own: Pick<LtkAction, "status">[]): number {
  return own.filter((a) => a.status !== "done" && a.status !== "cancelled").length;
}

/** Give a newly raised action its home and its initiative. An action the
 *  dialog already keyed keeps that key; one with none takes the first
 *  home (the only one, when the dialog offered no choice). */
export function stampNew(a: LtkAction, homes: { key: string; initiativeId: string }[]): void {
  if (homes.length === 0) return;
  const home = homes.find((h) => h.key === a.instanceId) ?? (a.instanceId === "" ? homes[0] : null);
  if (home === null) return;
  a.instanceId = home.key;
  if (!a.initiativeId && home.initiativeId !== "") a.initiativeId = home.initiativeId;
}

/** What each action looked like, to tell later which ones changed. */
export function snapshotOf(actions: LtkAction[]): Map<string, string> {
  return new Map(actions.map((a) => [a.id, JSON.stringify(a)]));
}

/** The actions that are new or differ from the snapshot — the rows a
 *  change must write (the card reports its whole list every time). */
export function changedSince(before: Map<string, string>, now: LtkAction[]): LtkAction[] {
  return now.filter((a) => before.get(a.id) !== JSON.stringify(a));
}
