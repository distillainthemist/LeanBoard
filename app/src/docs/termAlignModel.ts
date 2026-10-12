// The cutover's pure parts (term-store-proposal §7.1 / §7.3, 2026-10-12):
// what an admin may decide about a term the app does not know, and the
// verdict a re-walk gives after a sync. SDK-free so the rules are tested.

import { OrgSyncPlan, pathKey } from "./model";

/** What to do with a term-set-only term: leave it (today's behaviour),
 *  retire it (deprecated, tags stay readable), or pair it with an app
 *  node the plan would otherwise CREATE — the term is then renamed in
 *  place on its GUID and bound, and the create drops out. */
export type OrphanDecision = { kind: "leave" } | { kind: "retire" } | { kind: "pair"; path: string[] };

/** The creates an orphan may be paired with: SIBLINGS only (the same
 *  parent path). A term cannot move between parents (the API has no
 *  move), so pairing across parents would rename a term that stays
 *  under the wrong branch — the honest road there is retire + create. */
export function pairableCreates(plan: OrgSyncPlan, orphan: string[]): string[][] {
  const parent = pathKey(orphan.slice(0, -1));
  return plan.creates.filter((c) => c.length === orphan.length && pathKey(c.slice(0, -1)) === parent);
}

export function decisionCounts(decisions: Map<string, OrphanDecision>): { pair: number; retire: number } {
  let pair = 0;
  let retire = 0;
  for (const d of decisions.values()) {
    if (d.kind === "pair") pair++;
    else if (d.kind === "retire") retire++;
  }
  return { pair, retire };
}

/** A create claimed by a pairing must not also be created. */
export function createsAfterPairings(plan: OrgSyncPlan, decisions: Map<string, OrphanDecision>): string[][] {
  const claimed = new Set<string>();
  for (const d of decisions.values()) if (d.kind === "pair") claimed.add(pathKey(d.path));
  return plan.creates.filter((c) => !claimed.has(pathKey(c)));
}

export interface AlignVerdict {
  aligned: boolean;
  /** Human lines: what still differs, or why the verdict is withheld. */
  lines: string[];
}

/** The verdict after a sync and a fresh walk: aligned when nothing is
 *  left to create or rename and no orphan awaits a decision. Retired
 *  terms do not count against it; failed steps always do. */
export function verdictFor(plan: OrgSyncPlan, failed: number, truncated = false): AlignVerdict {
  const lines: string[] = [];
  if (plan.error !== "") return { aligned: false, lines: [`Cannot compare: ${plan.error}.`] };
  if (truncated) lines.push("The term walk was cut short — the deepest levels were not compared.");
  if (failed > 0) lines.push(`${failed} step${failed === 1 ? "" : "s"} failed — reload and retry; the usual cause is term-store rights.`);
  if (plan.creates.length > 0) lines.push(`${plan.creates.length} still to create: ${plan.creates.slice(0, 5).map((p) => p.join(" › ")).join(", ")}${plan.creates.length > 5 ? ", …" : ""}.`);
  if (plan.renames.length > 0) lines.push(`${plan.renames.length} still to rename: ${plan.renames.slice(0, 5).map((r) => `${r.from[r.from.length - 1]} → ${r.to[r.to.length - 1]}`).join(", ")}${plan.renames.length > 5 ? ", …" : ""}.`);
  if (plan.orphanTerms.length > 0) lines.push(`${plan.orphanTerms.length} term${plan.orphanTerms.length === 1 ? "" : "s"} in the set the app does not know — pair or retire ${plan.orphanTerms.length === 1 ? "it" : "them"} in the drift report: ${plan.orphanTerms.slice(0, 5).map((t) => t.labels.join(" › ")).join(", ")}${plan.orphanTerms.length > 5 ? ", …" : ""}.`);
  const aligned = lines.length === 0;
  if (aligned) lines.push(`✓ Aligned — ${plan.matched} term${plan.matched === 1 ? "" : "s"} bound${plan.retiredTerms.length > 0 ? `, ${plan.retiredTerms.length} retired` : ""}.`);
  return { aligned, lines };
}
