// Adding someone to the app from the directory, while assigning them
// (issue 12, 2026-11-16). The priority owner picker could do it; the
// initiative role pickers and the action dialog could not, and there
// were five separate copies of "search the directory, add, select" with
// different guards. This is the ONE piece they all take.
//
// The rule (Ben, 2026-10-02 and again 2026-11-16): ADMINS ONLY — a super
// admin, or a site admin, who adds people into their OWN site (v0.81.0).
// Nobody else is offered the directory: only an admin's add can grant
// app access, and a person listed but locked out is worse than a person
// not listed.
//
// Never overwrites: someone already on the roster is simply chosen; a
// person whose access was REVOKED is not quietly restored with their
// site and role reset (the priority owner copy did that) — the picker
// says to restore them in Settings → Users.

import type { RosterPerson } from "../store/mappers";
import { currentViewer } from "../runtime";
import { searchEntra, upsertPerson, viewerPerson } from "../store/people";

export interface DirectoryHit {
  objectId: string;
  displayName: string;
  mail: string;
}

export interface DirectoryRoad {
  search: (q: string) => Promise<DirectoryHit[]>;
  add: (hit: DirectoryHit) => Promise<{ whoId: string; who: string }>;
}

/** Where a person added by this viewer lands — null = they may not add.
 *  A super admin places them at the context (the org being worked on); a
 *  site admin's add is pinned to the admin's own site, with the context's
 *  department only when the context IS that site. Pure. */
export function placementFor(viewer: { role: string; site: string }, context: { site: string; department: string }): { site: string; department: string } | null {
  if (viewer.role === "superadmin") return { site: context.site, department: context.department };
  if (viewer.role === "siteadmin" && viewer.site !== "") return { site: viewer.site, department: context.site === viewer.site ? context.department : "" };
  return null;
}

/** What an add does with someone the app already knows. Pure. */
export function existingOutcome(existing: { who: string; active: boolean } | null): "add" | "choose" | "revoked" {
  if (existing === null) return "add";
  return existing.active ? "choose" : "revoked";
}

/** The directory road for a viewer whose role the caller already holds
 *  (undefined = not offered). `roster` is the caller's own list: a person
 *  added or found is pushed onto it so the picker shows them at once. */
export function directoryRoad(viewer: { role: string; site: string }, context: { site: string; department: string }, roster: RosterPerson[]): DirectoryRoad | undefined {
  const place = placementFor(viewer, context);
  if (place === null) return undefined;
  return {
    search: searchEntra,
    add: async (hit) => {
      const existing = await viewerPerson(hit.objectId).catch(() => null);
      const outcome = existingOutcome(existing);
      if (outcome === "revoked") throw new Error(`${existing!.who} had their access revoked. Restore them in Settings → Users first.`);
      const person: RosterPerson =
        existing ??
        ({
          whoId: hit.objectId,
          who: hit.displayName,
          email: hit.mail,
          site: place.site,
          department: place.department,
          area: "",
          role: "user",
          active: true,
        } as RosterPerson);
      if (outcome === "add") await upsertPerson(person);
      if (!roster.some((p) => p.whoId === person.whoId)) roster.push(person);
      return { whoId: person.whoId, who: person.who };
    },
  };
}

/** The same, for a caller that does not hold the viewer's role: read once
 *  (the signed-in person's own roster row). Any failure = not offered. */
export async function myDirectoryRoad(context: { site: string; department: string }, roster: RosterPerson[]): Promise<DirectoryRoad | undefined> {
  const id = currentViewer()?.objectId ?? "";
  if (id === "") return undefined;
  const me = roster.find((p) => p.whoId === id) ?? (await myRow(id));
  return me ? directoryRoad({ role: me.role, site: me.site }, context, roster) : undefined;
}

// every action dialog asks: the viewer's own row is read once a minute,
// not once a dialog
let mine: { id: string; at: number; row: Promise<RosterPerson | null> } | null = null;
function myRow(id: string): Promise<RosterPerson | null> {
  if (mine === null || mine.id !== id || Date.now() - mine.at > 60_000) mine = { id, at: Date.now(), row: viewerPerson(id).catch(() => null) };
  return mine.row;
}
