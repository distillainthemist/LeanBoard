// What counts toward a priority from BELOW it, apart from initiatives
// (Ben, 2026-11-24, programme C1): a late action raised on a priority
// that was cascaded from this one, and a metric of that priority's own
// that is off plan, make THIS priority off track — as an initiative
// under a cascaded priority already does.
//
// The actions still SHOW only where they were raised (decision 2 of
// 2026-11-18). They COUNT upward. Two shapes of "cascaded from":
//   - a child row (customised, or cascaded as its own row): everything
//     of its own counts, wherever it sits — the lineage rule the
//     initiatives follow;
//   - the SAME row adopted as-is at an org below the one in view: the
//     actions raised on it there count. Its metrics are the row's own,
//     so they are counted already. An org that is not below the one in
//     view never counts — nothing rolls down or sideways.
//
// Pure: the page hands in what it has loaded.

import type { LtkAction } from "../../../shared/schema/actions";
import { priorityKey, priorityOfKey } from "../../../shared/schema/actionLinks";
import { ActionCounts, actionCounts, PriorityOwnAt, StatusMetric } from "../improvement/status";
import { countedDescendants, isDescendant, orgKey, orgName, OrgRef, Priority, PriorityAssignment } from "./model";

export interface OwnBelowInput {
  p: Priority;
  /** The org whose own actions on `p` are already counted as its own:
   *  the org in view when `p` shows there adopted, else `p.org`. */
  view: OrgRef;
  all: Priority[];
  assignments: Pick<PriorityAssignment, "priorityId" | "org" | "status" | "childPriorityId">[];
  /** Every action raised on a priority. */
  actions: LtkAction[];
  /** A priority's own metrics with their lights. */
  metricsOf: (p: Priority) => StatusMetric[];
  today: string;
}

/** The orgs that took `id` as-is. */
function adopters(id: string, assignments: OwnBelowInput["assignments"]): OrgRef[] {
  return assignments.filter((a) => a.priorityId === id && a.status === "accepted" && a.childPriorityId === "").map((a) => a.org);
}

export function ownBelow(o: OwnBelowInput): PriorityOwnAt[] {
  const kids = countedDescendants(o.p, o.all);
  const ids = new Set([o.p.id, ...kids.map((k) => k.id)]);
  const byKey = new Map<string, LtkAction[]>();
  for (const a of o.actions) {
    if (!ids.has(priorityOfKey(a.instanceId))) continue;
    const list = byKey.get(a.instanceId);
    if (list) list.push(a);
    else byKey.set(a.instanceId, [a]);
  }
  // one entry per place, in the order met
  const places = new Map<string, { place: string; actions: LtkAction[]; metrics: StatusMetric[] }>();
  const at = (org: OrgRef) => {
    const k = orgKey(org);
    let e = places.get(k);
    if (!e) {
      e = { place: orgName(org), actions: [], metrics: [] };
      places.set(k, e);
    }
    return e;
  };
  const addActions = (id: string, org: OrgRef) => {
    const list = byKey.get(priorityKey(id, orgKey(org)));
    if (list && list.length > 0) at(org).actions.push(...list);
  };
  // the same row, adopted at an org below the one in view
  for (const org of adopters(o.p.id, o.assignments)) {
    if (isDescendant(org, o.view)) addActions(o.p.id, org);
  }
  // every counted child row: its own actions where it sits and where it
  // was adopted, and its own metrics
  for (const k of kids) {
    addActions(k.id, k.org);
    for (const org of adopters(k.id, o.assignments)) {
      if (orgKey(org) !== orgKey(k.org)) addActions(k.id, org);
    }
    const metrics = o.metricsOf(k);
    if (metrics.length > 0) at(k.org).metrics.push(...metrics);
  }
  const out: PriorityOwnAt[] = [];
  for (const e of places.values()) {
    const counts: ActionCounts = actionCounts(e.actions, o.today);
    if (counts.total === 0 && e.metrics.length === 0) continue;
    out.push({ place: e.place, actions: counts, metrics: e.metrics });
  }
  return out;
}
