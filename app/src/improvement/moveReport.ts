// Why due dates slip (programme E10, 2026-11-25): the due-date moves on
// the actions of the initiatives in view, counted by the reason given.
// Every move is already on its action's history (reschedule.ts, v0.94);
// nothing added them up.
//
//   - a move to a LATER date only: that is the slip a reason is asked
//     for; an earlier date is recorded silently and is not counted;
//   - by the reason's own label — the note after it is not part of it
//     ("Waiting on parts — the gearbox" counts under "Waiting on parts",
//     and every "Other — …" under "Other");
//   - a move recorded with no reason has a row of its own, last;
//   - inside the year in view, by the day the move was made.
//
// PURE: the Improvement tab hands in the actions it already holds.

import type { ActionHistoryEntry, LtkAction } from "../../../shared/schema/actions";
import { dueMoves, isLaterMove } from "../../../shared/schema/reschedule";

export const NO_REASON = "No reason given";

export interface MoveReport {
  /** Every counted move. */
  total: number;
  /** Most common first; "No reason given" last. */
  byReason: { reason: string; count: number }[];
  /** The initiatives with the most moves, most first. */
  byInitiative: { id: string; title: string; count: number }[];
}

/** The reason's label: what stands before the note. */
export function reasonLabel(reason: string): string {
  const r = reason.trim();
  if (r === "") return NO_REASON;
  const cut = r.indexOf(" — ");
  return (cut > 0 ? r.slice(0, cut) : r).trim();
}

/** The local day a move was made (yyyy-mm-dd), "" when it carries none. */
function dayOf(when: string): string {
  if (!/T/.test(when)) return when.slice(0, 10);
  const d = new Date(when);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function moveReport(
  actions: Pick<LtkAction, "history" | "initiativeId" | "instanceId">[],
  /** The initiative an action belongs to WHEN it is in view; else null. */
  initiativeOf: (a: Pick<LtkAction, "history" | "initiativeId" | "instanceId">) => { id: string; title: string } | null,
  /** The days counted, inclusive; null = every move ever made. */
  window: { from: string; to: string } | null,
  top = 10
): MoveReport {
  const reasons = new Map<string, { reason: string; count: number }>();
  const inits = new Map<string, { id: string; title: string; count: number }>();
  let total = 0;
  const counted = (h: ActionHistoryEntry): boolean => {
    if (!isLaterMove(h.from ?? "", h.to ?? "")) return false;
    if (window === null) return true;
    const day = dayOf(h.when ?? "");
    return day !== "" && day >= window.from && day <= window.to;
  };
  for (const a of actions) {
    const i = initiativeOf(a);
    if (i === null) continue;
    for (const h of dueMoves(a)) {
      if (!counted(h)) continue;
      total++;
      const label = reasonLabel(h.reason ?? "");
      const key = label.toLowerCase();
      const r = reasons.get(key);
      if (r) r.count++;
      else reasons.set(key, { reason: label, count: 1 });
      const n = inits.get(i.id);
      if (n) n.count++;
      else inits.set(i.id, { id: i.id, title: i.title, count: 1 });
    }
  }
  const last = (r: { reason: string }) => (r.reason === NO_REASON ? 1 : 0);
  return {
    total,
    byReason: [...reasons.values()].sort((a, b) => last(a) - last(b) || b.count - a.count || a.reason.localeCompare(b.reason)),
    byInitiative: [...inits.values()].sort((a, b) => b.count - a.count || a.title.localeCompare(b.title)).slice(0, top),
  };
}
