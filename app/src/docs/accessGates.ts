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
import { appDocsConfig } from "./docsStore";

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
    const cfg = await appDocsConfig();
    if (cfg.ownersGroupId === "") return { configured: false, members: null };
    try {
      return { configured: true, members: await groupMembers(cfg.ownersGroupId) };
    } catch {
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
  search: (q: string) => Promise<{ mail: string; displayName: string }[]>;
}

export async function poolPeopleSource(): Promise<PeopleSource> {
  const pool = await poolState();
  if (pool.configured && pool.members !== null) {
    const all = pool.members
      .filter((m) => m.email !== "")
      .map((m) => ({ mail: m.email, displayName: m.name }));
    return {
      restricted: true,
      hint: "",
      search: (q) => {
        const l = q.trim().toLowerCase();
        return Promise.resolve(
          all.filter(
            (p) =>
              l === "" ||
              p.displayName.toLowerCase().includes(l) ||
              p.mail.toLowerCase().includes(l)
          )
        );
      },
    };
  }
  const { searchEntra } = await import("../store/people");
  return {
    restricted: false,
    hint: pool.configured
      ? "The owners & approvers group could not be read just now — searching everyone instead."
      : "",
    search: async (q) =>
      (await searchEntra(q)).map((h) => ({ mail: h.mail, displayName: h.displayName })),
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
  const matches = (p: { mail: string; displayName: string }, l: string) =>
    l === "" || p.displayName.toLowerCase().includes(l) || p.mail.toLowerCase().includes(l);
  return {
    restricted: false,
    hint: members.length > 0 ? "Reviewers may be anyone — the owners & approvers group and the document controllers list first." : "",
    search: async (q) => {
      const l = q.trim().toLowerCase();
      const first = members.filter((p) => matches(p, l));
      if (l.length < 2) return first;
      let rest: { mail: string; displayName: string }[] = [];
      try {
        rest = (await searchEntra(q)).map((h) => ({ mail: h.mail, displayName: h.displayName }));
      } catch {
        rest = [];
      }
      const seen = new Set(first.map((p) => p.mail.toLowerCase()));
      return [...first, ...rest.filter((p) => p.mail !== "" && !seen.has(p.mail.toLowerCase()))];
    },
  };
}

let controllersCache: Promise<GroupMember[]> | null = null;
/** The document controllers group's members, read once per session —
 *  the reviewer picker lists them up front. */
export function controllerMembers(): Promise<GroupMember[]> {
  controllersCache ??= (async () => {
    const cfg = await appDocsConfig();
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
      const cfg = await appDocsConfig();
      if (cfg.controllersGroupId === "") return false;
      const yes = await isGroupMember(cfg.controllersGroupId, entraId);
      controllerLookupErr = false;
      return yes;
    })().catch(() => {
      controllerLookupErr = true;
      return false;
    });
    controllerCache.set(entraId, hit);
  }
  return hit;
}
