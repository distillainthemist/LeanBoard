// The initiative ↔ priority link rule, read for the signed-in viewer
// (issue round 2026-11-06, #2). The rule itself is pure —
// `canLinkInitiative` / `refusedNewLinks` in priorities/model.ts; this
// module gathers its inputs (the viewer's role and directory manager, the
// org owners, every company's cascade) so the initiative form's picker
// and the store's write ask the same question.

import { currentViewer } from "../runtime";
import { managerOf, viewerPerson } from "./people";
import { orgOwnersMap } from "./config";
import { loadCascade } from "./priorities";
import { canLinkInitiative, OrgRef, refusedNewLinks, Viewer } from "../priorities/model";

export type LinkRule = (p: { id: string; org: OrgRef }) => boolean;

/** The viewer as the priorities rules see them, manager included. */
export async function viewerForRules(): Promise<Viewer> {
  const whoId = currentViewer()?.objectId ?? "";
  const [me, managerId] = await Promise.all([
    whoId !== "" ? viewerPerson(whoId).catch(() => null) : Promise.resolve(null),
    whoId !== "" ? managerOf(whoId).catch(() => "") : Promise.resolve(""),
  ]);
  return {
    whoId,
    role: me?.role === "superadmin" || me?.role === "siteadmin" ? me.role : "user",
    site: me?.site ?? "",
    managerId,
  };
}

async function ruleInputs() {
  const [viewer, owners, cascade] = await Promise.all([
    viewerForRules(),
    orgOwnersMap().catch(() => ({})),
    loadCascade("").catch(() => null),
  ]);
  const assignments = cascade?.assignments ?? [];
  const rule: LinkRule = (p) => canLinkInitiative(viewer, p, owners, assignments);
  return { rule, priorities: cascade?.priorities ?? [] };
}

/** The link rule for the signed-in viewer. A failed read of the owners
 *  or the cascade denies (never more rights than the data shows). */
export async function linkRuleForViewer(): Promise<LinkRule> {
  return (await ruleInputs()).rule;
}

/** The store's backstop: throws when an initiative write ADDS a link the
 *  rule refuses. Links the initiative already had are kept whatever the
 *  rule says (Ben, 2026-11-06). */
export async function assertNewLinksAllowed(before: string[], after: string[]): Promise<void> {
  const had = new Set(before);
  if (after.every((id) => had.has(id))) return;
  const { rule, priorities } = await ruleInputs();
  const byId = new Map(priorities.map((p) => [p.id, p]));
  const refused = refusedNewLinks(before, after, (id) => {
    const p = byId.get(id);
    return p !== undefined && rule(p);
  });
  if (refused.length > 0) {
    const names = refused.map((id) => `“${(byId.get(id)?.statement ?? id).slice(0, 60)}”`).join(", ");
    throw new Error(
      `You can link an initiative only to priorities at an organisation you manage — ${names} ${refused.length === 1 ? "is" : "are"} not. Pull the priority to your organisation first (Priorities → ＋ Priority → Pull from above).`
    );
  }
}
