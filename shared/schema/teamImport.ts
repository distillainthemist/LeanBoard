// Bulk-adding a site's people from the directory
// (docs/team-import-proposal-2026-10-31.md). Pure: the walker brings the
// directory people, this turns them into a reviewable plan — who to add,
// where to place them, what to flag. Decisions 2–3: departments come
// from the department / area OWNERS' reporting subtrees (the org editor's
// owners ARE the hierarchy), Entra's label is the fallback; a person on
// another site is shown unticked.

export interface DirectoryPerson {
  id: string;
  name: string;
  mail: string;
  jobTitle: string;
  department: string;
  officeLocation: string;
  accountEnabled: boolean;
  /** "Member" | "Guest" | "" */
  userType: string;
  /** the manager the walk reached this person through ("" for a root) */
  managerId: string;
  /** 0 for a root */
  depth: number;
}

export interface WalkResult {
  rootIds: string[];
  people: DirectoryPerson[];
  /** the walk stopped at a cap — the list is not the whole tree */
  truncated: boolean;
}

/** What the planner needs of the roster and the site. */
export interface RosterEntry {
  whoId: string;
  site: string;
  active: boolean;
}
export interface SiteShape {
  site: string;
  departments: { department: string; areas: string[] }[];
}
export interface OwnerRefs {
  site?: { whoId: string };
  departments: Record<string, { whoId: string }>;
  areas: Record<string, { whoId: string }>;
}

export type ImportFlag =
  | "disabled" // the account is disabled
  | "guest" // a guest account
  | "noMail" // no mailbox: a service or shared account
  | "onRoster" // already here, on this site
  | "otherSite" // on the roster under a different site — ticking moves them
  | "revoked" // an inactive roster row — never resurrected here
  | "outsideSite" // officeLocation names another site
  | "deep" // far down the tree — worth a look
  | "twoOwners"; // under two department owners — the nearer one placed them

export interface ImportRow {
  whoId: string;
  name: string;
  mail: string;
  jobTitle: string;
  entraDepartment: string;
  officeLocation: string;
  /** manager names from the root down to this person's manager */
  via: string[];
  depth: number;
  proposedDepartment: string;
  proposedArea: string;
  /** how the department was proposed */
  placedBy: "owner" | "label" | "none";
  include: boolean;
  flags: ImportFlag[];
  /** the roster site when onRoster / otherSite / revoked */
  rosterSite: string;
}

/** Labels compared blind to case, fullwidth ampersands, dash variants
 *  and runs of space — the term-store lesson (docs/model.ts labelKey)
 *  applied to directory strings. */
export function labelKey(s: string): string {
  return s
    .replace(/＆/g, "&")
    .replace(/[‐-―−]/g, "-")
    .replace(/[   ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export const DEEP_FROM = 6;

const EXCLUDING: ReadonlySet<ImportFlag> = new Set<ImportFlag>(["disabled", "guest", "noMail", "onRoster", "otherSite", "revoked", "outsideSite"]);

export function planImport(walk: WalkResult, roster: RosterEntry[], site: SiteShape, owners: OwnerRefs, allSites: string[]): ImportRow[] {
  const byId = new Map(walk.people.map((p) => [p.id, p]));
  const rosterById = new Map(roster.map((r) => [r.whoId, r]));
  const deptOwner = new Map<string, string>(); // owner whoId → department
  for (const [d, ref] of Object.entries(owners.departments)) if (ref.whoId !== "") deptOwner.set(ref.whoId, d);
  const areaOwner = new Map<string, { department: string; area: string }>(); // owner whoId → area
  for (const [key, ref] of Object.entries(owners.areas)) {
    if (ref.whoId === "") continue;
    // area keys are "department/area" (the org editor) — tolerate a bare area name
    const slash = key.indexOf("/");
    const dept = slash >= 0 ? key.slice(0, slash) : site.departments.find((d) => d.areas.includes(key))?.department ?? "";
    const area = slash >= 0 ? key.slice(slash + 1) : key;
    if (dept !== "") areaOwner.set(ref.whoId, { department: dept, area });
  }
  const deptByKey = new Map(site.departments.map((d) => [labelKey(d.department), d.department]));
  const otherSiteKeys = new Map(allSites.filter((s) => s !== site.site).map((s) => [labelKey(s), s]));
  const thisSiteKey = labelKey(site.site);

  const rows: ImportRow[] = [];
  for (const p of walk.people) {
    const flags: ImportFlag[] = [];
    if (!p.accountEnabled) flags.push("disabled");
    if (p.userType.toLowerCase() === "guest") flags.push("guest");
    if (p.mail.trim() === "") flags.push("noMail");
    const r = rosterById.get(p.id);
    let rosterSite = "";
    if (r) {
      rosterSite = r.site;
      if (!r.active) flags.push("revoked");
      else if (labelKey(r.site) === thisSiteKey) flags.push("onRoster");
      else flags.push("otherSite");
    }
    const loc = labelKey(p.officeLocation);
    if (loc !== "" && loc !== thisSiteKey && otherSiteKeys.has(loc)) flags.push("outsideSite");
    if (p.depth >= DEEP_FROM) flags.push("deep");

    // placement: the NEAREST owner up the chain (the deeper owner wins);
    // a second department owner further up is noted
    const via: string[] = [];
    let proposedDepartment = "";
    let proposedArea = "";
    let placedBy: ImportRow["placedBy"] = "none";
    const seen = new Set<string>([p.id]);
    // the person's own ownership places them too: an owner of Casting IS in Casting
    const chain: DirectoryPerson[] = [p];
    let cur = byId.get(p.managerId);
    while (cur && !seen.has(cur.id)) {
      seen.add(cur.id);
      chain.push(cur);
      via.unshift(cur.name);
      cur = byId.get(cur.managerId);
    }
    // the departments the owners along the chain stand for, nearest first
    const ownerDepts: { department: string; area: string }[] = [];
    for (const node of chain) {
      const a = areaOwner.get(node.id);
      if (a && deptByKey.has(labelKey(a.department))) ownerDepts.push(a);
      const d = deptOwner.get(node.id);
      if (d !== undefined && deptByKey.has(labelKey(d))) ownerDepts.push({ department: d, area: "" });
    }
    if (ownerDepts.length > 0) {
      proposedDepartment = ownerDepts[0].department;
      proposedArea = ownerDepts[0].area;
      placedBy = "owner";
      if (new Set(ownerDepts.map((x) => labelKey(x.department))).size > 1) flags.push("twoOwners");
    }
    if (placedBy === "none") {
      const hit = deptByKey.get(labelKey(p.department));
      if (hit !== undefined) {
        proposedDepartment = hit;
        placedBy = "label";
      }
    }
    rows.push({
      whoId: p.id,
      name: p.name,
      mail: p.mail,
      jobTitle: p.jobTitle,
      entraDepartment: p.department,
      officeLocation: p.officeLocation,
      via,
      depth: p.depth,
      proposedDepartment,
      proposedArea,
      placedBy,
      include: !flags.some((f) => EXCLUDING.has(f)),
      flags,
      rosterSite,
    });
  }
  rows.sort((a, b) => a.depth - b.depth || a.name.localeCompare(b.name));
  return rows;
}

export interface ImportSummary {
  toAdd: number;
  toMove: number;
  alreadyHere: number;
  otherSite: number;
  skipped: number;
  total: number;
}

export function summarize(rows: ImportRow[]): ImportSummary {
  const s: ImportSummary = { toAdd: 0, toMove: 0, alreadyHere: 0, otherSite: 0, skipped: 0, total: rows.length };
  for (const r of rows) {
    const other = r.flags.includes("otherSite");
    if (r.include) {
      if (other) s.toMove++;
      else s.toAdd++;
    } else if (r.flags.includes("onRoster")) s.alreadyHere++;
    else if (other) s.otherSite++;
    else s.skipped++;
  }
  return s;
}

export const FLAG_LABEL: Record<ImportFlag, string> = {
  disabled: "account disabled",
  guest: "guest",
  noMail: "no mailbox",
  onRoster: "already here",
  otherSite: "on another site",
  revoked: "revoked here",
  outsideSite: "office elsewhere",
  deep: "far down the tree",
  twoOwners: "under two owners",
};
