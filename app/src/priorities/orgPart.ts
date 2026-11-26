// A department's part of a shared priority (2026-11-27, R5 of the
// 2026-11-25 round, report 22). A priority shows on pages other than
// its owner's — a site priority on a department's page — and its popup
// listed every initiative under it whatever page it was opened from.
// On a page that is not the owner's it now lists the initiatives that
// are THAT org's: filed under it or within it, or naming it (or
// something within it) in "Also shown in" — the Improvement tab's own
// rule (`orgsOf(i).some(inScope)`), settled with Ben in phase 2 in
// place of any rule by owner, sponsor or team.
//
// The tile is NOT scoped (its circles and status are the whole
// priority's): "2 of 5" is what explains the difference.

import { OrgRef, sameOrg } from "./model";

/** At `scope` or anywhere below it. An empty level of the scope is "any". */
export function orgWithin(o: OrgRef, scope: OrgRef): boolean {
  return (
    (scope.company === "" || o.company === scope.company) &&
    (scope.site === "" || o.site === scope.site) &&
    (scope.department === "" || o.department === scope.department) &&
    (scope.area === "" || o.area === scope.area)
  );
}

/** Is an initiative part of what `page` sees of a priority owned by
 *  `owner`? On the owner's own page everything is. `orgs` = the org the
 *  initiative is filed under, then its "Also shown in" list. */
export function inPart(orgs: OrgRef[], page: OrgRef, owner: OrgRef): boolean {
  return sameOrg(page, owner) || orgs.some((o) => orgWithin(o, page));
}

/** "2 of 5 are Casting's" */
export function partLine(mine: number, total: number, org: string): string {
  return `${mine} of ${total} ${mine === 1 ? "is" : "are"} ${org}’s`;
}

/** What an empty part says: why, and how an initiative comes to show. */
export function partNone(total: number, org: string): string {
  return `None of this priority’s ${total} initiative${total === 1 ? " is" : "s are"} ${org}’s. An initiative shows here when it is filed under ${org}, or names it in “Also shown in”.`;
}

/** "Show all" is the person's for the session — one switch for the
 *  popup and the executive summary. */
export const partView = { all: false };
