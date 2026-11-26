// 5G1 membership plumbing — session-cached answers to "who is this
// user to the document groups". Two rules, both from the plan:
//
//   - CONTROLLERS fail CLOSED: a failed lookup contributes nothing, and
//     the Dataverse super/site-admin role stands alone as the fallback —
//     an outage must never elevate anyone.
//   - The POOL fails to an EXPLANATION: pickers fall back to plain
//     Entra search with a hint, and gates that would hide affordances
//     stay open on "unknown" — SharePoint is the hard gate there, and a
//     transient Graph failure must not strand a legitimate user.

import { searchEntra } from "../store/people";
import { GroupMember, groupMembers, isGroupMember } from "../store/accessGroup";
import { docsConfig } from "./docsStore";
import { markTiming, now } from "./timing";

/** The documents config, from the SAME session-cached read the
 *  register opens on (2026-11-01: the gates used to read the row afresh
 *  — a Dataverse round trip before the Graph one, serialised, on every
 *  open). Settings saves invalidate that cache, so a relink lands. */
const gateConfig = async () => (await docsConfig()).app;

export interface PoolState {
  /** An owners & approvers group is linked in Settings → Access control. */
  configured: boolean;
  /** Its user members — null = the lookup FAILED (fall back + hint);
   *  [] = the group is genuinely empty. */
  members: GroupMember[] | null;
}

let poolCache: Promise<PoolState> | null = null;
const controllerCache = new Map<string, Promise<boolean>>();
let controllerLookupErr = false;
/** Did the last controllers-group lookup FAIL (as opposed to answer
 *  no)? A surface that fails closed can then say why (issue 2). */
export function controllerLookupFailed(): boolean {
  return controllerLookupErr;
}

/** Settings saves call this so a relink lands without a reload. */
export function invalidateAccessGates(): void {
  poolCache = null;
  controllerCache.clear();
  controllersCache = null;
}

/** The eligibility pool (owners & approvers group), read once per
 *  session — the pickers' source and the add-target gate's evidence. */
export function poolState(): Promise<PoolState> {
  poolCache ??= (async (): Promise<PoolState> => {
    const cfg = await gateConfig();
    if (cfg.ownersGroupId === "") return { configured: false, members: null };
    const t0 = now();
    try {
      const members = await groupMembers(cfg.ownersGroupId);
      markTiming("app", t0, `owners & approvers group, ${members.length} members`);
      return { configured: true, members };
    } catch {
      markTiming("app", t0, "owners & approvers group", true);
      return { configured: true, members: null };
    }
  })();
  poolCache.catch(() => (poolCache = null)); // a failed read must not stick
  return poolCache;
}

/** Is this user in the pool? null = unknown (not configured, or the
 *  lookup failed) — callers gate OPEN on unknown. */
export async function viewerInPool(entraId: string): Promise<boolean | null> {
  if (entraId === "") return null;
  const pool = await poolState();
  if (!pool.configured || pool.members === null) return null;
  return pool.members.some((m) => m.id === entraId);
}

/** What a role-bound person picker searches. When the pool is known,
 *  results come from the owners & approvers group's members (filtered
 *  locally); otherwise plain Entra search with an explanatory hint —
 *  a Graph hiccup must degrade to "searching everyone", never to a
 *  picker that finds nobody. */
export interface PeopleSource {
  /** true = results are the pool's members. */
  restricted: boolean;
  /** Painted under the search box when non-empty. */
  hint: string;
  /** The people already in memory (the pool's members, the document
   *  controllers): a type-ahead shows their matches at once
   *  (`docs/peopleField.ts`, tranche 5, 2026-11-27). */
  held: DocPerson[];
  /** The directory behind them, asked after a pause; null when the
   *  picker is bound to the pool. */
  directory: ((q: string) => Promise<DocPerson[]>) | null;
}

export interface DocPerson {
  mail: string;
  displayName: string;
}

/** A person column bound to no role: the directory alone. */
export function directoryPeopleSource(): PeopleSource {
  return {
    restricted: false,
    hint: "",
    held: [],
    directory: async (q) => (await searchEntra(q)).map((h) => ({ mail: h.mail, displayName: h.displayName })),
  };
}

export async function poolPeopleSource(): Promise<PeopleSource> {
  const pool = await poolState();
  if (pool.configured && pool.members !== null) {
    const all = pool.members
      .filter((m) => m.email !== "")
      .map((m) => ({ mail: m.email, displayName: m.name }));
    return { restricted: true, hint: "", held: all, directory: null };
  }
  return {
    ...directoryPeopleSource(),
    hint: pool.configured
      ? "The owners & approvers group could not be read just now — searching everyone instead."
      : "",
  };
}

/** The dictionary roles whose pickers select from the pool. */
export const POOL_ROLES = new Set(["owner", "approvers", "reviewers"]);

/** C2 (feedback round 1): a REVIEWER may be anyone in the directory —
 *  document controllers included. The pool's members list first, the
 *  directory fills in behind them; nothing is refused. */
export async function reviewerPeopleSource(): Promise<PeopleSource> {
  const pool = await poolState().catch(() => ({ configured: false, members: null }) as PoolState);
  // document controllers list up front too (issue 9, 2026-10-18 round)
  const controllers = await controllerMembers().catch(() => [] as GroupMember[]);
  const seenFirst = new Set<string>();
  const members = [...(pool.members ?? []), ...controllers]
    .filter((m) => m.email !== "" && !seenFirst.has(m.email.toLowerCase()) && seenFirst.add(m.email.toLowerCase()))
    .map((m) => ({ mail: m.email, displayName: m.name }));
  return {
    restricted: false,
    hint: members.length > 0 ? "Reviewers may be anyone — the owners & approvers group and the document controllers list first." : "",
    held: members,
    directory: directoryPeopleSource().directory,
  };
}

let controllersCache: Promise<GroupMember[]> | null = null;
/** The document controllers group's members, read once per session —
 *  the reviewer picker lists them up front. */
export function controllerMembers(): Promise<GroupMember[]> {
  controllersCache ??= (async () => {
    const cfg = await gateConfig();
    if (cfg.controllersGroupId === "") return [];
    return groupMembers(cfg.controllersGroupId);
  })();
  controllersCache.catch(() => (controllersCache = null));
  return controllersCache;
}

/** Controllers-group membership, merged into the admin gates BESIDE the
 *  Dataverse role. Strictly false on any failure — fail closed. */
export function viewerIsController(entraId: string): Promise<boolean> {
  if (entraId === "") return Promise.resolve(false);
  let hit = controllerCache.get(entraId);
  if (!hit) {
    hit = (async () => {
      const cfg = await gateConfig();
      if (cfg.controllersGroupId === "") return false;
      const t0 = now();
      try {
        const yes = await isGroupMember(cfg.controllersGroupId, entraId);
        markTiming("app", t0, "controllers group");
        controllerLookupErr = false;
        return yes;
      } catch (e) {
        markTiming("app", t0, "controllers group", true);
        throw e;
      }
    })().catch(() => {
      controllerLookupErr = true;
      return false;
    });
    controllerCache.set(entraId, hit);
  }
  return hit;
}
