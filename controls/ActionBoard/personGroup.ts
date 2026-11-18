// The kanban's "By person" grouping (Ben, 2026-10-22; built 2026-11-18):
// a column per person who holds an action, the Gantt grouped the same
// way. Pure — the editor draws it.

import { LtkAction, isShared } from "../../shared/schema/actions";

/** The column of actions nobody holds. */
export const UNASSIGNED_KEY = "";

export interface PersonColumn {
  key: string;
  label: string;
  /** null = the Unassigned column. */
  person: { whoId: string; who: string } | null;
  items: LtkAction[];
}

/** One person, one column: by id, or by name where the action carries
 *  only a name (a typed assignee). */
export function personKey(p: { whoId: string; who: string }): string {
  return p.whoId !== "" ? p.whoId : `name:${p.who.trim().toLowerCase()}`;
}

/**
 * A column per person holding at least one of these actions, by name,
 * then "Unassigned" when anything is. A SHARED action stands in the
 * column of every person on it — each owes a part — so the columns'
 * counts add up to more than the actions. Supporters get no column:
 * they owe nothing.
 */
export function personColumns(actions: LtkAction[]): PersonColumn[] {
  const cols = new Map<string, PersonColumn>();
  const none: LtkAction[] = [];
  for (const a of actions) {
    const people = a.assignees.filter((p) => p.whoId !== "" || p.who.trim() !== "");
    if (people.length === 0) {
      none.push(a);
      continue;
    }
    for (const p of people) {
      const key = personKey(p);
      let col = cols.get(key);
      if (!col) {
        col = { key, label: p.who.trim() !== "" ? p.who.trim() : "(no name)", person: { whoId: p.whoId, who: p.who }, items: [] };
        cols.set(key, col);
      }
      if (!col.items.includes(a)) col.items.push(a);
    }
  }
  const out = [...cols.values()].sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
  if (none.length > 0) out.push({ key: UNASSIGNED_KEY, label: "Unassigned", person: null, items: none });
  return out;
}

/** Is this person's own part of the action done? */
export function partDoneBy(a: LtkAction, key: string): boolean {
  return a.assignees.some((p) => personKey(p) === key && p.done);
}

/**
 * A card dropped in another person's column: the action is theirs now.
 * Only an action ONE person holds (or nobody) moves this way; a shared
 * one is refused with the reason — who is on it is settled in the
 * action itself, where each part can be seen. Returns the refusal, or
 * null when the action was reassigned.
 */
export function reassignTo(a: LtkAction, person: { whoId: string; who: string } | null): string | null {
  if (isShared(a)) return `That action is shared by ${a.assignees.length} people. Change who is on it from the action itself.`;
  const done = a.status === "done" || a.status === "verify";
  const was = a.assignees[0];
  a.assignees = person === null ? [] : [{ whoId: person.whoId, who: person.who, done, ...(done && was?.doneAt !== undefined ? { doneAt: was.doneAt } : {}) }];
  return null;
}
