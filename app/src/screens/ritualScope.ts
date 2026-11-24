// Who sees a ritual in Settings › Rituals, and who may change it
// (programme G8, Ben 2026-11-24). ONE rule, asked by the list for its
// buttons and by the wizard as the backstop.
//
//   - a super admin manages every ritual;
//   - the ritual's owner manages it, wherever it sits;
//   - a site admin manages the rituals whose PRIMARY site is theirs;
//   - a site admin at a site the ritual is ALSO shown in sees it, and
//     opens it, but does not change it — Edit, Replicate and Archive are
//     the primary site's. (Ben chose this over the initiative rule, where
//     a site admin has admin over an initiative that also spans their
//     site: a ritual is run by one site.)
//
// PURE.

export type RitualStanding = "manage" | "view" | "none";

export interface RitualViewer {
  role: string;
  site: string;
  whoId: string;
}

export interface RitualPlace {
  /** The primary site (the board's site column). */
  site: string;
  ownerId: string;
  /** The sites of the organisations it is also shown in. */
  alsoSites: string[];
}

export function ritualStanding(v: RitualViewer, r: RitualPlace): RitualStanding {
  if (v.role === "superadmin") return "manage";
  if (v.whoId !== "" && r.ownerId === v.whoId) return "manage";
  if (v.role !== "siteadmin") return "none";
  if (r.site === v.site) return "manage";
  return v.site !== "" && r.alsoSites.includes(v.site) ? "view" : "none";
}

/** The note on a ritual a site admin only sees. */
export function sharedRitualNote(primarySite: string): string {
  return primarySite.trim() !== "" ? `Also at your site, from ${primarySite.trim()}` : "Also at your site, from another site";
}
