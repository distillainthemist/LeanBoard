// The org stamps on an action row (programme E13, 2026-11-25) — the
// store's half of actions/orgStamp.ts: working a row's two stamps out,
// and putting them right in bulk (a person who moved, an org renamed,
// the rows from before the stamp existed).
//
// It never imports store/actions.ts (which imports this for its write):
// the bulk passes read and write the two columns directly, and touch
// nothing else on the row — no history, no merge, no endorsement rule.

import { Ben_ltkactionsService } from "../generated/services/Ben_ltkactionsService";
import { Ben_ltkpeoplesService } from "../generated/services/Ben_ltkpeoplesService";
import { PRIORITY_KEY_PREFIX, homeBoardOf, orgMark, priorityOfKey } from "../../../shared/schema/actionLinks";
import { assigneeStamp, isStamped, NO_ORG_STAMP, OrgPlace, raisedStamp, renameInStamp, stampNeedle } from "../actions/orgStamp";
import { allWhere, eq, firstWhere, odata } from "./dv";
import { bumpChange, memoRead } from "./changes";

/** Open = what the organisation scope lists. */
export const OPEN_ACTIONS = "ben_status ne 'done' and ben_status ne 'cancelled'";

/** One person's placement on the roster; null when they are not on it,
 *  inactive, or have no site. Cached with the roster's own topic, so a
 *  person's move is seen at once. */
function placeOfPerson(whoId: string): Promise<OrgPlace | null> {
  return memoRead("people", `place:${whoId}`, async () => {
    const row = await firstWhere(Ben_ltkpeoplesService.getAll, eq("ben_whoid", whoId), ["ben_ltkpeopleid", "ben_site", "ben_department", "ben_area", "ben_active"]);
    if (!row || row.ben_active === false || (row.ben_site ?? "") === "") return null;
    return { site: row.ben_site ?? "", department: row.ben_department ?? "", area: row.ben_area ?? "" };
  });
}

/** Where each of these people sits. */
async function placesOf(whoIds: string[]): Promise<Map<string, OrgPlace | null>> {
  const out = new Map<string, OrgPlace | null>();
  const ids = [...new Set(whoIds.filter((x) => x !== ""))];
  for (let i = 0; i < ids.length; i += 8) {
    await Promise.all(ids.slice(i, i + 8).map(async (id) => out.set(id, await placeOfPerson(id).catch(() => null))));
  }
  return out;
}

/** The stamp of where these assignees sit. */
export async function assigneeStampFor(assignees: { whoId: string }[]): Promise<string> {
  const places = await placesOf(assignees.map((a) => a.whoId));
  return assigneeStamp(assignees, (id) => places.get(id) ?? null);
}

/** The org an action was raised at:
 *    a place — its priority's org at which it was raised, its
 *              initiative's org, or its board's site and department;
 *    null    — it has no home (a personal action);
 *    undefined — it could not be told (a read failed, the home is gone):
 *              the row keeps whatever it has. */
export async function homeOrgOf(a: { instanceId: string; initiativeId?: string }, boardId: string): Promise<OrgPlace | null | undefined> {
  try {
    if (a.instanceId.startsWith(PRIORITY_KEY_PREFIX)) {
      const id = priorityOfKey(a.instanceId);
      const mark = a.instanceId.slice(a.instanceId.indexOf("@") + 1);
      const [{ loadCascade }, { orgKey }] = await Promise.all([import("./priorities"), import("../priorities/model")]);
      const data = await memoRead("priorities", "cascade:all:stamp", () => loadCascade(""));
      const p = data.priorities.find((x) => x.id === id);
      if (!p) return undefined;
      // the org it was raised AT: the priority's own, or one that adopted it
      const at = [p.org, ...data.assignments.filter((x) => x.priorityId === id).map((x) => x.org)].find((o) => orgMark(orgKey(o)) === mark);
      return at ? { site: at.site, department: at.department, area: at.area } : undefined;
    }
    if ((a.initiativeId ?? "") !== "") {
      const { listInitiatives } = await import("./initiatives");
      const i = (await listInitiatives()).find((x) => x.id === a.initiativeId);
      return i ? { site: i.org.site, department: i.org.department, area: i.org.area } : undefined;
    }
    const board = boardId !== "" ? boardId : homeBoardOf(a.instanceId);
    if (board === "") return null;
    const { getBoard } = await import("./boards");
    const b = await getBoard(board);
    return b ? { site: b.site, department: b.department, area: "" } : undefined;
  } catch {
    return undefined;
  }
}

/** The two stamps for a row about to be written. `raised` is absent when
 *  the home could not be told — an update then leaves the column alone,
 *  a new row is stamped "no home". */
export async function stampsFor(a: { instanceId: string; initiativeId?: string; assignees: { whoId: string }[] }, boardId: string, isNew: boolean): Promise<{ ben_assigneeorgs: string; ben_raisedorg?: string }> {
  const [assignees, home] = await Promise.all([assigneeStampFor(a.assignees), homeOrgOf(a, boardId)]);
  if (home === undefined) return isNew ? { ben_assigneeorgs: assignees, ben_raisedorg: NO_ORG_STAMP } : { ben_assigneeorgs: assignees };
  return { ben_assigneeorgs: assignees, ben_raisedorg: raisedStamp(home) };
}

// ---- putting stamps right in bulk -------------------------------------------------

const STAMP_COLUMNS = ["ben_ltkactionid", "ben_actionid", "ben_instanceid", "ben_boardid", "ben_initiativeid", "ben_assigneesjson", "ben_assigneeorgs", "ben_raisedorg"];

export interface RestampResult {
  /** Rows looked at. */
  total: number;
  /** Rows whose stamp was wrong or missing, and is now written. */
  changed: number;
  /** Rows that could not be written. */
  failed: number;
}

type StampRow = { ben_ltkactionid: string; ben_instanceid?: string; ben_boardid?: string; ben_initiativeid?: string; ben_assigneesjson?: string; ben_assigneeorgs?: string; ben_raisedorg?: string };

const assigneesOf = (raw: string | undefined): { whoId: string }[] => {
  try {
    const v = JSON.parse(raw || "[]") as unknown;
    return Array.isArray(v) ? v.filter((x) => x && typeof x === "object").map((x) => ({ whoId: typeof (x as { whoId?: unknown }).whoId === "string" ? (x as { whoId: string }).whoId : "" })) : [];
  } catch {
    return [];
  }
};

/** Work each row's stamps out afresh and write the ones that differ. */
async function restampRows(rows: StampRow[], onProgress?: (done: number, total: number) => void): Promise<RestampResult> {
  const out: RestampResult = { total: rows.length, changed: 0, failed: 0 };
  let done = 0;
  for (let i = 0; i < rows.length; i += 8) {
    await Promise.all(
      rows.slice(i, i + 8).map(async (r) => {
        try {
          const want = await stampsFor({ instanceId: r.ben_instanceid ?? "", initiativeId: r.ben_initiativeid ?? "", assignees: assigneesOf(r.ben_assigneesjson) }, r.ben_boardid ?? "", !isStamped(r.ben_raisedorg));
          const fields: Record<string, string> = {};
          if (want.ben_assigneeorgs !== (r.ben_assigneeorgs ?? "")) fields.ben_assigneeorgs = want.ben_assigneeorgs;
          if (want.ben_raisedorg !== undefined && want.ben_raisedorg !== (r.ben_raisedorg ?? "")) fields.ben_raisedorg = want.ben_raisedorg;
          if (Object.keys(fields).length > 0) {
            const res = await Ben_ltkactionsService.update(r.ben_ltkactionid, fields as never);
            if (res.success === false) throw new Error(res.error?.message ?? "update failed");
            out.changed++;
          }
        } catch {
          out.failed++;
        }
        done++;
      })
    );
    onProgress?.(done, rows.length);
  }
  if (out.changed > 0) bumpChange("actions");
  return out;
}

/** How many open actions have never been stamped. */
export async function countUnstamped(): Promise<number> {
  return (await allWhere(Ben_ltkactionsService.getAll, `${OPEN_ACTIONS} and (ben_assigneeorgs eq null or ben_assigneeorgs eq '')`, ["ben_ltkactionid"])).length;
}

/** Every open action, stamped afresh from the roster and its home — the
 *  backfill for rows from before the stamp, and the repair for one that
 *  drifted (Settings → Organisation, super admins). */
export async function restampAllOpen(onProgress?: (done: number, total: number) => void): Promise<RestampResult> {
  const rows = (await allWhere(Ben_ltkactionsService.getAll, OPEN_ACTIONS, STAMP_COLUMNS)) as StampRow[];
  return restampRows(rows, onProgress);
}

/** A person moved org: their open actions are stamped afresh. */
export async function restampPerson(whoId: string): Promise<RestampResult> {
  if (whoId === "") return { total: 0, changed: 0, failed: 0 };
  const needle = odata(`"whoId":"${whoId}"`);
  const rows = (await allWhere(Ben_ltkactionsService.getAll, `${OPEN_ACTIONS} and contains(ben_assigneesjson, '${needle}')`, STAMP_COLUMNS)) as StampRow[];
  return restampRows(rows, undefined);
}

/** People whose open actions are waiting to be stamped afresh. One at a
 *  time, each once: a team import that places thousands of people must
 *  not fire thousands of reads at once. */
const restampQueue: string[] = [];
let restamping = false;

/** Queue a person's open actions for a fresh stamp (behind a roster
 *  write — it never fails or slows it). */
export function queueRestampPerson(whoId: string): void {
  if (whoId === "" || restampQueue.includes(whoId)) return;
  restampQueue.push(whoId);
  if (restamping) return;
  restamping = true;
  void (async () => {
    try {
      for (;;) {
        const next = restampQueue.shift();
        if (next === undefined) break;
        await restampPerson(next).catch((err) => console.warn("action org stamps: restamp failed", err));
      }
    } finally {
      restamping = false;
    }
  })();
}

/** An org was renamed: on every open action carrying the old token (in
 *  either stamp), that token and everything under it takes the new name.
 *  Text for text — the roster and the boards were renamed by the same
 *  step, an initiative's own org was not, so the stamp is moved, never
 *  worked out again. */
export async function renameOrgStamps(from: string, to: string, onProgress?: (done: number, total: number) => void): Promise<RestampResult> {
  const out: RestampResult = { total: 0, changed: 0, failed: 0 };
  if (from === "" || from === to) return out;
  const hit = (col: string) => `contains(${col}, '${odata(stampNeedle(from))}') or contains(${col}, '${odata(`|${from}>`)}')`;
  const rows = (await allWhere(Ben_ltkactionsService.getAll, `${OPEN_ACTIONS} and (${hit("ben_assigneeorgs")} or ${hit("ben_raisedorg")})`, STAMP_COLUMNS)) as StampRow[];
  out.total = rows.length;
  let done = 0;
  for (let i = 0; i < rows.length; i += 8) {
    await Promise.all(
      rows.slice(i, i + 8).map(async (r) => {
        try {
          const fields: Record<string, string> = {};
          const a = renameInStamp(r.ben_assigneeorgs ?? "", from, to);
          const h = renameInStamp(r.ben_raisedorg ?? "", from, to);
          if (a !== (r.ben_assigneeorgs ?? "")) fields.ben_assigneeorgs = a;
          if (h !== (r.ben_raisedorg ?? "")) fields.ben_raisedorg = h;
          if (Object.keys(fields).length > 0) {
            const res = await Ben_ltkactionsService.update(r.ben_ltkactionid, fields as never);
            if (res.success === false) throw new Error(res.error?.message ?? "update failed");
            out.changed++;
          }
        } catch {
          out.failed++;
        }
        done++;
      })
    );
    onProgress?.(done, rows.length);
  }
  if (out.changed > 0) bumpChange("actions");
  return out;
}
