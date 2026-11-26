// Reviewer seats — the half that talks to SharePoint and the ledger
// (reviewerSeatsModel.ts is the rule). The seat is the editors SITE
// group (membership takes effect at once, 5G3b); the record is the
// access ledger, as an entry of kind "reviewer", so a person seated for
// two documents keeps the seat until the second ends (releaseGrants).

import { AccessRequest, claimsLogin, markGranted, putEntries, readLedger, releaseGrants, reviewerSeatId, siteEditorsGroupId } from "./accessRequests";
import { controllerMembers, poolState } from "./accessGates";
import { appDocsConfig } from "./docsStore";
import { spErrorText } from "./model";
import { NO_SEATS, SeatOutcome, SeatPerson, needSeats } from "./reviewerSeatsModel";
import { addSiteGroupUser } from "./sp";

/** Everyone who can open a draft without a seat: the group and the
 *  controllers. null = the group is not linked or could not be read. */
async function insiders(): Promise<string[] | null> {
  const pool = await poolState().catch(() => ({ configured: false, members: null }));
  if (!pool.configured || pool.members === null) return null;
  const controllers = await controllerMembers().catch(() => []);
  return [...pool.members, ...controllers].map((m) => m.email);
}

export interface SeatDoc {
  listId: string;
  itemId: number;
  uniqueId: string;
  name: string;
}

/**
 * Seat the reviewers who need it. The person acting seats them when
 * SharePoint lets them (owners, approvers and controllers own the
 * group); when it refuses, the seat is recorded as a REQUEST the
 * document's owner answers in Document tasks. Never throws: a submit
 * that has landed is not undone by a seat.
 */
export async function seatReviewers(o: { doc: SeatDoc; reviewers: SeatPerson[]; owners: string[]; by: SeatPerson }): Promise<SeatOutcome> {
  try {
    const need = needSeats(o.reviewers, await insiders());
    if (need.length === 0) return NO_SEATS;
    const cfg = await appDocsConfig();
    const gid = await siteEditorsGroupId(cfg).catch(() => 0);
    if (gid <= 0) {
      return {
        seated: [],
        requested: [],
        unable: `${need.map((p) => p.name).join(", ")} cannot open the draft: outside the Owners & Approvers group, with no editors group set up to let them in (Settings → Access control).`,
      };
    }
    const when = new Date().toISOString();
    const seated: SeatPerson[] = [];
    const requested: SeatPerson[] = [];
    const entries: AccessRequest[] = [];
    for (const p of need) {
      const added = await addSiteGroupUser(cfg.siteUrl, gid, claimsLogin(p.email)).catch(() => ({ ok: false, status: "", data: null }));
      const entry: AccessRequest = {
        id: reviewerSeatId(o.doc.uniqueId, p.email),
        listId: o.doc.listId,
        itemId: o.doc.itemId,
        uniqueId: o.doc.uniqueId,
        name: o.doc.name,
        who: { id: "", name: p.name, email: p.email },
        owners: o.owners,
        reason: "Named as a reviewer",
        when,
        kind: "reviewer",
        askedBy: { name: o.by.name, email: o.by.email },
      };
      if (added.ok) {
        seated.push(p);
        entries.push({ ...entry, granted: { by: o.by.name, when } });
      } else {
        requested.push(p);
        entries.push(entry);
      }
    }
    try {
      await putEntries(entries);
    } catch (e) {
      return { seated, requested, unable: `The seats could not be recorded (${e instanceof Error ? e.message : String(e)}) — they will not be released by themselves at approval.` };
    }
    return { seated, requested, unable: "" };
  } catch (e) {
    return { seated: [], requested: [], unable: `Reviewers' access could not be checked: ${spErrorText(e instanceof Error ? e.message : String(e)).slice(0, 160)}` };
  }
}

/** The owner's "Let them in": seat the reviewer a request names.
 *  Returns "" or why it did not go. */
export async function seatFromRequest(req: AccessRequest, by: string): Promise<string> {
  const cfg = await appDocsConfig();
  const gid = await siteEditorsGroupId(cfg).catch(() => 0);
  if (gid <= 0) return "No editors group is set up (Settings → Access control).";
  const added = await addSiteGroupUser(cfg.siteUrl, gid, claimsLogin(req.who.email));
  if (!added.ok) return spErrorText(added.status).slice(0, 200) || "SharePoint refused the add.";
  await markGranted(req.id, by);
  return "";
}

/** The cycle is over (approved, or the revision cancelled): every
 *  reviewer seat on the document ends. Returns a warning ("" = clean). */
export async function releaseReviewerSeats(uniqueId: string): Promise<string> {
  const u = uniqueId.trim().toLowerCase();
  const mine = (await readLedger()).filter((e) => e.kind === "reviewer" && e.uniqueId.trim().toLowerCase() === u);
  if (mine.length === 0) return "";
  return releaseGrants(uniqueId, mine.map((e) => e.who.email));
}
