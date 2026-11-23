// A controller sees their own site (2026-11-23, report 4). Flags,
// ingestion tasks, edit-access requests and the Document Control Health
// report used to show a controller every site's work. Now:
//
//   - the controller's site is the site on their LeanBoard person row;
//     none = they see everything, as every super admin does
//   - a DOCUMENT's site is read from its Organisation unit: the site's
//     own term in the Organisation set and everything under it. A
//     document with no Organisation unit belongs to nobody's site, so
//     it shows to EVERY controller
//   - an ingestion task carries its own site; one without shows to all
//   - there is no "All sites" switch — that is what a super admin is for
//
// This is what the app SHOWS. A controller's SharePoint rights are
// unchanged. What a person owns, was asked to do, or raised themselves
// is theirs whatever the site. Pure — unit-tested.

export interface SiteBranch {
  /** The site as the person row names it. */
  site: string;
  /** The site's term and every term under it (ids, lower-cased). */
  ids: Set<string>;
  /** The same terms' own labels, lower-cased — for a feed with no ids. */
  labels: Set<string>;
  /** Every label the walk knows, lower-cased: a label outside this is
   *  not evidence of another site (the walk may be partial). */
  known: Set<string>;
}

const norm = (s: string): string => s.trim().toLowerCase();
const idKey = (s: string): string => s.trim().replace(/^\{|\}$/g, "").toLowerCase();

/** Who is scoped, and to which site: "" = sees everything. */
export function scopedSite(who: { isController: boolean; isSuper: boolean; site: string }): string {
  return who.isController && !who.isSuper ? who.site.trim() : "";
}

/** The site's branch of the Organisation set: its own term (by label,
 *  the SHALLOWEST match, so a department named like the site never
 *  wins) and all beneath it. null = the set does not know the site, so
 *  nothing can be judged and nothing is hidden. */
export function siteBranchOf(site: string, orgNodes: { id: string; labels: string[] }[]): SiteBranch | null {
  const s = norm(site);
  if (s === "") return null;
  const hits = orgNodes
    .filter((n) => n.labels.length > 0 && norm(n.labels[n.labels.length - 1]) === s)
    .sort((a, b) => a.labels.length - b.labels.length);
  if (hits.length === 0) return null;
  const root = hits[0];
  const depth = root.labels.length;
  const key = (p: string[]) => p.map(norm).join("¦");
  const prefix = key(root.labels);
  const ids = new Set<string>();
  const labels = new Set<string>();
  const known = new Set<string>();
  for (const n of orgNodes) {
    if (n.labels.length === 0) continue;
    known.add(norm(n.labels[n.labels.length - 1]));
    if (n.labels.length >= depth && key(n.labels.slice(0, depth)) === prefix) {
      ids.add(idKey(n.id));
      labels.add(norm(n.labels[n.labels.length - 1]));
    }
  }
  return { site: site.trim(), ids, labels, known };
}

export type SiteVerdict = "mine" | "other" | "none";

/** Whose a document is, from its Organisation unit value (display
 *  labels, ";"-separated) and the term ids the feed gave beside it.
 *   - "none": no Organisation unit, or nothing the walk can place —
 *     shown to every controller
 *   - "mine": any of its terms sits in the branch
 *   - "other": every term is known and none is in the branch */
export function docSiteVerdict(orgValue: string, termIds: string[], b: SiteBranch): SiteVerdict {
  const ids = termIds.map(idKey).filter((x) => x !== "");
  const labels = orgValue.split(";").map(norm).filter((x) => x !== "");
  if (ids.length === 0 && labels.length === 0) return "none";
  if (ids.some((id) => b.ids.has(id))) return "mine";
  // ids are the firm evidence; labels stand in only when the feed gave
  // none (a department name can repeat across sites)
  if (ids.length > 0) return "other";
  if (labels.some((l) => b.labels.has(l))) return "mine";
  return labels.every((l) => b.known.has(l)) ? "other" : "none";
}

/** Does a scoped controller see this ingestion task? Its own site, a
 *  task with no site, and anything they made or were assigned. */
export function taskInSite(
  t: { site: string; createdByEmail: string; assignees: { email: string }[] },
  mySite: string,
  myEmail: string
): boolean {
  const mine = norm(mySite);
  if (mine === "" || norm(t.site) === "" || norm(t.site) === mine) return true;
  const me = norm(myEmail);
  return me !== "" && (norm(t.createdByEmail) === me || t.assignees.some((a) => norm(a.email) === me));
}
