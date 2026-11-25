// Actions IO — the central table on the standard channel: rollups for
// cards, boards and the viewer; upsert by action id (the alternate key's
// purpose, emulated through the generated client).

import { actionBelongsTo, actionVisibleTo, Assignee, holdOpenUntilAllParts, LtkAction, mergeComments, mergeParts, stampCompletion, visibleSetFor, settleFromParts } from "../../../shared/schema/actions";
import { applyEndorsementRule } from "../../../shared/schema/actionEndorsement";
import { ACTION_RULED_EVENT } from "../../../shared/ui/actionLinkProvider";
import { homeBoardOf, homeCardOf, homeForStamp, PRIORITY_KEY_PREFIX } from "../../../shared/schema/actionLinks";
import { bumpChange } from "./changes";
import { whenSettled } from "./inflight";
import { Ben_ltkactionsService } from "../generated/services/Ben_ltkactionsService";
import { allWhere, eq, firstWhere, odata, upsertWhere, writeKnown } from "./dv";
import { actionFromRow as mapActionRow, actionToRow, parseManifest } from "./mappers";
import type { Ben_ltkactions } from "../generated/models/Ben_ltkactionsModel";

/** The parts each action was READ with (shared actions, 2026-11-17): the
 *  write lays only what this screen changed over the row as it stands,
 *  so two people ticking their own parts never undo each other
 *  (`mergeParts`). Every read below goes through `actionFromRow`. */
const partsAsRead = new Map<string, Assignee[]>();
function actionFromRow(row: Ben_ltkactions): LtkAction {
  const a = mapActionRow(row);
  partsAsRead.set(a.id, a.assignees.map((x) => ({ ...x })));
  return a;
}

/** Run `work` over `items`, `size` at a time (a confidential shared
 *  action asks the directory for every assignee's manager). */
async function inBatches<T>(items: T[], size: number, work: (item: T) => Promise<void>): Promise<void> {
  for (let i = 0; i < items.length; i += size) await Promise.all(items.slice(i, i + size).map(work));
}
import { currentViewer } from "../runtime";
import { memoRead } from "./changes";
import { parseMeetingInfo } from "../../../shared/schema/meeting";
import { stampNeedle } from "../actions/orgStamp";
import { OPEN_ACTIONS, stampsFor } from "./actionOrgs";

// ---- confidential actions (2026-09-16): ONE choke point for every read ----
//
// A confidential action is seen by its creator, its assignees, their direct
// managers and super admins. Every read below passes through `visible`, so
// every surface — boards, badges, the hub, the Gantt, roll-ups, tiles —
// inherits it without knowing. App-level confidentiality, like initiatives:
// the row stays readable through Dataverse itself.

async function viewerContext(): Promise<{ whoId: string; superAdmin: boolean }> {
  const whoId = currentViewer()?.objectId ?? "";
  if (whoId === "") return { whoId, superAdmin: false };
  const role = await memoRead("people", `role|${whoId}`, () => import("./people").then((m) => m.viewerRole(whoId))).catch(() => "user");
  return { whoId, superAdmin: role === "superadmin" };
}

async function visible(actions: LtkAction[]): Promise<LtkAction[]> {
  if (!actions.some((a) => a.confidential === true)) return actions;
  const v = await viewerContext();
  return actions.filter((a) => actionVisibleTo(a, v.whoId, v.superAdmin));
}

export async function actionsForInstance(instanceId: string): Promise<LtkAction[]> {
  await whenSettled();
  const rows = await allWhere(Ben_ltkactionsService.getAll, eq("ben_instanceid", instanceId));
  return visible(rows.map(actionFromRow));
}

export async function actionsForBoard(boardId: string): Promise<LtkAction[]> {
  await whenSettled();
  const rows = await allWhere(Ben_ltkactionsService.getAll, eq("ben_boardid", boardId));
  return visible(rows.map(actionFromRow));
}

/** The initiative an action belongs to, from the board it lives on
 *  (`init-<initiativeId>` boards). "" when it isn't an initiative board. */
async function initiativeIdForBoard(boardId: string): Promise<string> {
  if (!boardId.startsWith("init-")) return "";
  const { listInitiatives } = await import("./initiatives");
  const i = (await listInitiatives().catch(() => [])).find((x) => x.boardId === boardId);
  return i?.id ?? "";
}

/** The board an action lives on: the stamped one, else the instance key's
 *  prefix ("board:card"; the hub's personal keys don't count). */
function boardOf(action: LtkAction, boardId?: string): string {
  if (boardId) return boardId;
  const k = action.instanceId;
  // a priority's key names no board (2026-11-18)
  if (k.includes(":") && !k.startsWith("hub") && !k.startsWith(PRIORITY_KEY_PREFIX)) return k.split(":")[0];
  return "";
}

/** The board column for a write. A channel key is authoritative: a
 *  board's channel ("<board>:board") lives on that board and a personal
 *  key on none. A card key takes the caller's board (an action surface
 *  may roll up another board), and keeps the stamped one when the caller
 *  gives none (hub edits across boards). */
function stampedBoard(instanceId: string, boardId?: string): string | undefined {
  // a personal key and a priority's key live on no board
  if (instanceId.startsWith("hub") || instanceId.startsWith(PRIORITY_KEY_PREFIX)) return "";
  if (homeCardOf(instanceId) === "" && homeBoardOf(instanceId) !== "") return homeBoardOf(instanceId);
  return boardId;
}

/** Rows written before the initiative id was stamped at the write: heal
 *  them once per session (fire-and-forget, chunked). */
const healed = new Set<string>();
async function healInitiativeIds(actions: LtkAction[]): Promise<void> {
  const fixed = actions.filter((a) => a.initiativeId && !healed.has(a.id));
  for (const a of fixed) healed.add(a.id);
  for (let i = 0; i < fixed.length; i += 10) {
    await Promise.all(fixed.slice(i, i + 10).map((a) => upsertWhere(Ben_ltkactionsService, eq("ben_actionid", a.id), (row) => row.ben_ltkactionid, { ben_initiativeid: a.initiativeId ?? "" }).catch(() => undefined)));
  }
}

/** Every action linked to ANY initiative — one query for the cascade's
 *  R/A/G rollups and the Improvement rows (P6b). Reads the stamped id AND
 *  (2026-09-23) anything living on an initiative board, healing the id
 *  onto rows that predate the stamp. */
export async function actionsForInitiatives(): Promise<LtkAction[]> {
  await whenSettled();
  const rows = await allWhere(
    Ben_ltkactionsService.getAll,
    "(ben_initiativeid ne null and ben_initiativeid ne '') or startswith(ben_boardid,'init-') or startswith(ben_instanceid,'init-')"
  );
  const actions = rows.map(actionFromRow);
  // in-memory first (this read sees them right), then the rows
  for (const a of actions) if (!a.initiativeId && boardOf(a).startsWith("init-")) a.initiativeId = await initiativeIdForBoard(boardOf(a));
  // rows that lacked the id but resolved to one: write it back once
  void healInitiativeIds(actions.filter((a) => a.initiativeId && !rows.find((r) => r.ben_actionid === a.id)?.ben_initiativeid)).catch(() => undefined);
  return visible(actions);
}

/** Every action raised directly on a PRIORITY (2026-11-18): one small
 *  read for the Priorities page — its status rule and its Actions tabs.
 *  Each is keyed to the priority and the org it was raised at. */
export async function actionsForPriorities(): Promise<LtkAction[]> {
  await whenSettled();
  const rows = await allWhere(Ben_ltkactionsService.getAll, `startswith(ben_instanceid,'${PRIORITY_KEY_PREFIX}')`);
  return visible(rows.map(actionFromRow));
}

/** The viewer's rollup for LeanHub — their whoId appears in assignees,
 *  or among the supporters (2026-11-16: the hub lists those apart, under
 *  "Supporting"; every to-do count still reads assignees alone). */
export async function actionsForViewer(whoId: string): Promise<LtkAction[]> {
  await whenSettled();
  const needle = odata(`"whoId":"${whoId}"`);
  const rows = await allWhere(
    Ben_ltkactionsService.getAll,
    `contains(ben_assigneesjson, '${needle}') or contains(ben_supportersjson, '${needle}')`
  );
  return visible(rows.map(actionFromRow));
}

/** Every open action (not done / cancelled) — the whole-company scope,
 *  which no filter makes smaller. `onPage`: each page as it arrives, so
 *  the list paints while the rest loads (programme E13). */
export async function openActions(onPage?: (soFar: LtkAction[]) => void): Promise<LtkAction[]> {
  await whenSettled();
  if (!onPage) return await visible((await allWhere(Ben_ltkactionsService.getAll, OPEN_ACTIONS)).map(actionFromRow));
  const out: LtkAction[] = [];
  let skipToken: string | undefined;
  for (;;) {
    const result = await Ben_ltkactionsService.getAll({ filter: OPEN_ACTIONS, maxPageSize: SCOPE_PAGE, ...(skipToken ? { skipToken } : {}) });
    if (result.success === false) throw new Error(result.error?.message ?? "the actions could not be read");
    const page = result.data ?? [];
    out.push(...(await visible(page.map(actionFromRow))));
    onPage(out);
    const next = (result as { skipToken?: string }).skipToken;
    if (!next || page.length === 0 || out.length >= 50_000) return out;
    skipToken = next;
  }
}

/** How many rows the whole-company scope asks for at a time. */
const SCOPE_PAGE = 500;

/** The organisation scope, filtered BY THE SERVER (programme E13,
 *  2026-11-25): the open actions whose assignees sit at `token`'s org
 *  (actions/orgStamp.ts `scopeToken`), and those RAISED there. Until
 *  2026-11-25 the scope read every open action in the environment and
 *  matched assignees to the roster in the browser. */
export async function openActionsInOrg(token: string): Promise<{ assigned: LtkAction[]; raised: LtkAction[]; unstamped: LtkAction[] }> {
  await whenSettled();
  const needle = odata(stampNeedle(token));
  const [assigned, raised, unstamped] = await Promise.all([
    allWhere(Ben_ltkactionsService.getAll, `${OPEN_ACTIONS} and contains(ben_assigneeorgs, '${needle}')`),
    allWhere(Ben_ltkactionsService.getAll, `${OPEN_ACTIONS} and contains(ben_raisedorg, '${needle}')`),
    // rows from before the stamp: read whole and matched the old way by
    // the caller, until "Re-stamp actions" has emptied this set
    allWhere(Ben_ltkactionsService.getAll, `${OPEN_ACTIONS} and (ben_assigneeorgs eq null or ben_assigneeorgs eq '')`),
  ]);
  const [a, r, u] = await Promise.all([visible(assigned.map(actionFromRow)), visible(raised.map(actionFromRow)), visible(unstamped.map(actionFromRow))]);
  return { assigned: a, raised: r, unstamped: u };
}

/** The owners of boards whose Escalation viewer sources `boardId` — an
 *  escalated confidential action extends its visibility to them (Ben's
 *  decision 4, 2026-09-16). */
async function escalationTargetOwners(boardId: string): Promise<string[]> {
  if (boardId === "") return [];
  const boards = await memoRead("boards", "all", () => import("./boards").then((m) => m.listBoards())).catch(() => []);
  const out: string[] = [];
  for (const b of boards) {
    const slots = parseManifest(b.manifestRaw).slots;
    const sources = slots.filter((s) => s.cardType === "EscalationViewer").some((s) => JSON.stringify((s.settings.config ?? {}) as Record<string, unknown>).includes(boardId));
    if (!sources) continue;
    const owner = parseMeetingInfo(b.occurrenceSettingsRaw)?.owner?.whoId ?? "";
    if (owner !== "") out.push(owner);
  }
  return out;
}

/** Stamp the creator and, for a confidential action, its visible set
 *  (creator + assignees + their managers + escalation targets). */
async function stampVisibility(action: LtkAction, boardId?: string): Promise<void> {
  const me = currentViewer()?.objectId ?? "";
  if (!action.createdBy && me !== "") action.createdBy = me;
  if (action.confidential !== true) {
    delete action.visibleTo;
    return;
  }
  const { managerOf } = await import("./people");
  const managers = new Map<string, string>();
  await inBatches(action.assignees, 4, async (x) => {
    managers.set(x.whoId, await managerOf(x.whoId).catch(() => ""));
  });
  const extra = action.escalated ? await escalationTargetOwners(boardId ?? "").catch(() => []) : [];
  action.visibleTo = visibleSetFor(action, (id) => managers.get(id) ?? "", extra);
}

/** Upsert the emitted set — one row per action, keyed by action id. */
export async function upsertActions(
  actions: LtkAction[],
  boardId?: string
): Promise<void> {
  let ruled = false;
  const who = currentViewer();
  for (const action of actions) {
    // ANY action raised on an initiative board belongs to that initiative
    // (Ben, 2026-09-23) — stamped here, at the one write path, FROM THE
    // ACTION'S OWN KEY: a personal key is never re-linked from the
    // caller's board (action-link-review-2026-10-30, finding 6)
    const home = homeForStamp(action.instanceId, boardId);
    if (!action.initiativeId && home.startsWith("init-")) action.initiativeId = await initiativeIdForBoard(home);
    // the key decides when it names a channel (a link made in the dialog
    // moved the action — even from a card editor that passes ITS board)
    const stamped = stampedBoard(action.instanceId, boardId);
    // the row as it stands NOW — read once: what others wrote since
    // this screen loaded is merged in (comments since 2026-11-16, parts
    // since 2026-11-17), and the endorsement backstop needs its status
    const existing = await firstWhere(Ben_ltkactionsService.getAll, eq("ben_actionid", action.id));
    const rowNow = existing ? mapActionRow(existing) : null;
    if (rowNow) {
      // shared actions: lay only the parts THIS screen changed over the
      // row's — two people ticking their own parts must not undo each other
      action.assignees = mergeParts(rowNow.assignees, action.assignees, partsAsRead.get(action.id));
      // comments are everyone's: this screen's over the row's own, so a
      // save never drops what someone else wrote since it loaded
      action.comments = mergeComments(rowNow.comments, action.comments, who?.objectId ?? "");
    }
    // a shared action closes only when EVERY part is done (2026-11-17),
    // the BACKSTOP — a road that closed it over outstanding parts is
    // put back open, against the parts as they stand now
    holdOpenUntilAllParts(action);
    // every part done = done, the BACKSTOP (2026-10-06) — a road that
    // marks parts without the rule still writes a closed action
    settleFromParts(action, { reopen: false });
    // endorsement, the BACKSTOP (2026-09-30): the dialog and the tick
    // apply the rule themselves; a road that could not (a kanban drop, a
    // screen opened before the rule was known, the last part of a shared
    // action ticked from a stale screen) is put right here, against the
    // status the row actually holds
    if (who && who.objectId !== "" && (action.status === "done" || action.verified !== undefined)) {
      const { endorsementAtWrite } = await import("../actions/endorsement");
      const ctx = await endorsementAtWrite(action);
      if (ctx?.on) {
        const prior = rowNow ? rowNow.status : null;
        if (applyEndorsementRule(action, prior, ctx, { whoId: who.objectId, who: who.name }, new Date().toISOString())) ruled = true;
      }
    }
    // when it was completed, and each part (issues 2 and 10): stamped at
    // the ONE write path, cleared on a reopen
    stampCompletion(action);
    await stampVisibility(action, stamped);
    // where its assignees sit and where it was raised (programme E13,
    // 2026-11-25): stamped at the ONE write path, so the organisation
    // scope is the server's filter. A stamp that cannot be worked out
    // (the roster did not answer) leaves the row's own as it was — a new
    // row then reads as unstamped and is found the old way.
    const orgs = await stampsFor(action, stamped ?? existing?.ben_boardid ?? home, existing === null).catch(() => null);
    await writeKnown(Ben_ltkactionsService, existing, (row) => row.ben_ltkactionid, { ...actionToRow(action, stamped), ...(orgs ?? {}) });
    partsAsRead.set(action.id, action.assignees.map((x) => ({ ...x })));
  }
  bumpChange("actions");
  // the rule changed what the screen believes: open lists refresh
  if (ruled && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(ACTION_RULED_EVENT));
    window.dispatchEvent(new CustomEvent("ltk-actions-changed"));
  }
}

/** Endorsement was switched OFF on an initiative: what was waiting for an
 *  endorser closes (Ben, 2026-09-30). Returns how many closed. */
export async function closeAwaitingEndorsement(i: { id: string; boardId: string }): Promise<number> {
  const waiting = (await actionsForInitiatives()).filter((a) => a.status === "verify" && actionBelongsTo(i, a));
  for (const a of waiting) {
    a.status = "done";
    a.pdca = "closed";
    for (const x of a.assignees) x.done = true;
    stampCompletion(a);
    await upsertWhere(Ben_ltkactionsService, eq("ben_actionid", a.id), (row) => row.ben_ltkactionid, actionToRow(a, undefined));
  }
  if (waiting.length > 0) bumpChange("actions");
  return waiting.length;
}
