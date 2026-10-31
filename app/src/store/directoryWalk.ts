// The reporting-tree walk behind "Import a site's team…"
// (team-import-proposal-2026-10-31.md): breadth-first over DirectReports
// from the chosen roots, one connector call per manager, a few at a
// time, with caps (decision 5: 1500 people, 8 levels, 4 calls at once).
// Returns directory people for the pure planner; never throws for one
// failed manager — that branch is noted and the walk goes on.
import { Office365UsersService } from "../generated/services/Office365UsersService";
import type { GraphUser_V1 } from "../generated/models/Office365UsersModel";
import { DirectoryPerson, WalkResult } from "../../../shared/schema/teamImport";

export const WALK_MAX_PEOPLE = 1500;
export const WALK_MAX_DEPTH = 8;
export const WALK_CONCURRENCY = 4;
const SELECT = "id,displayName,mail,userPrincipalName,jobTitle,department,officeLocation,accountEnabled,userType";

export interface WalkProgress {
  people: number;
  managers: number;
  level: number;
  /** managers whose reports could not be read */
  failed: string[];
}

function person(u: GraphUser_V1, managerId: string, depth: number): DirectoryPerson | null {
  if (!u.id) return null;
  return {
    id: u.id,
    name: u.displayName ?? u.userPrincipalName ?? u.id,
    mail: u.mail ?? u.userPrincipalName ?? "",
    jobTitle: u.jobTitle ?? "",
    department: u.department ?? "",
    officeLocation: u.officeLocation ?? "",
    accountEnabled: u.accountEnabled !== false,
    userType: u.userType ?? "",
    managerId,
    depth,
  };
}

async function withRetry<T>(f: () => Promise<T>): Promise<T> {
  try {
    return await f();
  } catch (e) {
    // one retry after a pause: the connector throttles bursts
    await new Promise((r) => setTimeout(r, 1500));
    return f();
  }
}

/** One root's own profile — a root is a person of the plan too. */
export async function directoryPerson(id: string): Promise<DirectoryPerson | null> {
  const res = await withRetry(() => Office365UsersService.UserProfile_V2(id, SELECT));
  return res.data ? person(res.data, "", 0) : null;
}

export async function walkReports(
  rootIds: string[],
  onProgress?: (p: WalkProgress) => void,
  caps: { maxPeople?: number; maxDepth?: number; concurrency?: number } = {}
): Promise<WalkResult & { failed: string[] }> {
  const maxPeople = caps.maxPeople ?? WALK_MAX_PEOPLE;
  const maxDepth = caps.maxDepth ?? WALK_MAX_DEPTH;
  const concurrency = caps.concurrency ?? WALK_CONCURRENCY;
  const people: DirectoryPerson[] = [];
  const seen = new Set<string>();
  const failed: string[] = [];
  let truncated = false;
  let managers = 0;

  // roots first, as people of depth 0
  for (const id of rootIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    try {
      const me = await directoryPerson(id);
      if (me) people.push(me);
    } catch {
      failed.push(id);
    }
  }
  let frontier = people.map((p) => p.id);
  let level = 0;
  const report = () => onProgress?.({ people: people.length, managers, level, failed: [...failed] });
  report();

  while (frontier.length > 0 && level < maxDepth && !truncated) {
    level++;
    const next: string[] = [];
    let i = 0;
    const worker = async () => {
      while (i < frontier.length && !truncated) {
        const managerId = frontier[i++];
        const manager = people.find((p) => p.id === managerId);
        try {
          const res = await withRetry(() => Office365UsersService.DirectReports_V2(managerId, SELECT, 999));
          managers++;
          for (const u of res.data?.value ?? []) {
            const dp = person(u, managerId, level);
            if (!dp || seen.has(dp.id)) continue; // cycles and dotted lines: first road wins
            if (people.length >= maxPeople) {
              truncated = true;
              break;
            }
            seen.add(dp.id);
            people.push(dp);
            next.push(dp.id);
          }
        } catch {
          failed.push(manager?.name ?? managerId);
        }
        report();
      }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, frontier.length) }, worker));
    frontier = next;
  }
  if (frontier.length > 0 && level >= maxDepth) truncated = true;
  report();
  return { rootIds, people, truncated, failed };
}
