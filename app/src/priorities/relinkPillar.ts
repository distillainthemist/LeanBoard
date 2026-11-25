// A re-parented priority ALWAYS takes its new parent's sub-pillar (Ben,
// 2026-11-25, programme D9 — the dialog's "Also take the parent's
// sub-pillar" tick is gone). And so does everything made from it, so the
// family stays in one column.
//
//   - from the year in view: earlier years keep the column they had
//     (`moveFrom`, the rule every sub-pillar move has followed since
//     v0.97);
//   - a parent with no sub-pillar in that year moves nothing;
//   - a priority already in that sub-pillar is left alone.
//
// PURE: the popup hands in the rows; it writes what this returns.

import { descendantPriorities, moveFrom, PeriodSettings, placedIn, Priority, PriorityPlacement } from "./model";

export interface PillarMove {
  priority: Priority;
  pillarId: string;
  placements: PriorityPlacement[];
}

export interface RelinkPillarPlan {
  /** The sub-pillar the family moves to ("" = the parent has none: no move). */
  pillarId: string;
  /** The linked priority's own move, or null when it is there already. */
  child: PillarMove | null;
  /** The priorities made from it that move with it. */
  below: PillarMove[];
}

export function relinkPillarPlan(settings: PeriodSettings, child: Priority, parent: Priority, all: Priority[], year: string): RelinkPillarPlan {
  const to = placedIn(settings, parent, year);
  if (to === "") return { pillarId: "", child: null, below: [] };
  const move = (p: Priority): PillarMove | null => {
    if (placedIn(settings, p, year) === to) return null;
    const next = moveFrom(settings, p, year, to);
    return { priority: p, pillarId: next.pillarId, placements: next.placements };
  };
  return {
    pillarId: to,
    child: move(child),
    below: descendantPriorities(child, all)
      .map(move)
      .filter((m): m is PillarMove => m !== null),
  };
}

/** What the link dialog says will move: "" when nothing does. */
export function relinkPillarWords(plan: RelinkPillarPlan, pillarName: string): string {
  if (plan.pillarId === "" || (plan.child === null && plan.below.length === 0)) return "";
  const name = pillarName.trim() !== "" ? pillarName.trim() : "the parent's sub-pillar";
  const n = plan.below.length;
  const also = n === 0 ? "" : plan.child === null ? `${n} ${n === 1 ? "priority" : "priorities"} made from it ${n === 1 ? "moves" : "move"} to ${name}.` : ` ${n} ${n === 1 ? "priority" : "priorities"} made from it ${n === 1 ? "moves" : "move"} with it.`;
  return plan.child === null ? also : `It moves to ${name}.${also}`;
}
