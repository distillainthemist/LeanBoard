// Cascaded priorities — the lifecycle UI (build item 2 / design §3, §6,
// §10, §11): the cascade review list behind the toolbar chip, the reason
// dialogs (hold / reject / close), re-parenting after the fact, and the
// priority detail overlay with its right rail. Pure decisions live in
// model.ts; writes go through store/priorities.ts.
//
// P2 stand-ins until initiatives exist (P5): the Initiatives, Charter and
// Actions tabs state that plainly; `Add initiative` is shown disabled so
// the overlay keeps its one solid primary in the right place.

import type { AdminScope } from "../improvement/initiativeModel";
import { el, clear } from "../../../shared/ui/dom";
import type { RosterPerson } from "../store/mappers";
import {
  appendEvent,
  CascadeData,
  decideAssignment,
  listEvents,
  saveAssignment,
  savePriority,
  newPriority,
  relinkParent,
} from "../store/priorities";
import { addModeToggle, modal, field, OrgTree, childOrgs, priorityDialog, cascadeTargetList, CascadeTarget } from "./dialogs";
import { rememberBoardOrigin } from "../improvement/boardOrigin";
import { popupTabFor, rememberPopupTab } from "../sessionView";
import { promptConfirm } from "../prompts";
import { initiativeRow, initiativeRowHead, rowRank } from "../improvement/initiativeRow";
import { offerStepMessage } from "./stepMessage";
import {
  CLOSE_REASONS,
  CloseReason,
  DECLINED_PREFIX,
  isDeclined,
  isPulledProposal,
  lineageFor,
  spreadOf,
  OrgRef,
  orgLevel,
  orgPath,
  parentCandidates,
  priorityLiveIn,
  pullCandidates,
  orgKey,
  orgName,
  orgParent,
  parentClosed,
  Priority,
  PriorityAssignment,
  PriorityEvent,
  PrioritySettings,
  Rag,
  ragPaletteKey,
  reviewQueue,
  sameOrg,
  senderFlags,
} from "./model";

/** What the screen hands the lifecycle UI — its live state and callbacks. */
export interface LifecycleCtx {
  host: HTMLElement;
  data: () => CascadeData;
  tree: OrgTree;
  roster: RosterPerson[];
  settings: PrioritySettings;
  /** A status state's colour, through the site palette and the status
   *  settings (the status rule, 2026-11-17). */
  stateColour: (state: import("../improvement/status").PriorityState) => string;
  palette: Record<string, string>;
  actor: () => { whoId: string; who: string };
  canManage: (org: OrgRef) => boolean;
  /** May the viewer ACCEPT what lands on this org's board — its owner or
   *  an admin, not the owner's direct reports (model `canApproveAt`,
   *  issue 13, 2026-11-16)? */
  canApprove: (org: OrgRef) => boolean;
  /** May the viewer hang an initiative under this priority? The one rule
   *  (`canLinkInitiative`, issue round 2026-11-06): a priority at an org
   *  they manage, or adopted at one. */
  canLink: (p: Priority) => boolean;
  /** Site setting: may this org "Accept & customise" (vs adopt as-is)? */
  canCustomise: (org: OrgRef) => boolean;
  ownerNameFor: (org: OrgRef) => string;
  /** The org's owner from organisation settings, or null. */
  ownerFor: (org: OrgRef) => { whoId: string; who: string } | null;
  /** The owner picker's suggested people + directory road for an org. */
  ownerPickerFor: (org: OrgRef) => import("./dialogs").OwnerPickerExtras;
  periodsOnOffer: () => string[];
  currentPeriod: string;
  /** The status of every initiative counted under a priority (its own
   *  and its counted descendants'), by the ONE status rule. */
  statusesFor: (p: Priority) => import("../improvement/status").StatusResult[];
  /** The initiatives behind a priority (direct + through children), for
   *  the overlay's Initiatives/Actions tabs (P6b). */
  initiativesFor: (p: Priority) => {
    id: string;
    title: string;
    stageName: string;
    pdcaFg: string;
    pdcaBg: string;
    /** The current stage's PDCA quadrant ("" = none: a single action). */
    stagePdca: string;
    /** Every owner as one label, and all of them for a tooltip. */
    ownerName: string;
    ownerTitle: string;
    orgName: string;
    open: number;
    overdue: number;
    /** Done / future / late over its own actions. */
    counts: import("../improvement/status").ActionCounts;
    /** On track / flagged / off track, with its reasons. */
    status: import("../improvement/status").StatusResult;
    /** What a flagged initiative has asked for. */
    flagNote: string;
    /** Its metrics, ★ starred first (the summary's sparkline tiles). */
    metrics: import("../improvement/metricValues").MetricValue[];
    boardId: string;
    inheritedFrom: string;
    confidentialHidden: boolean;
  }[];
  /** The raw initiatives + actions behind a priority — the Actions tab's
   *  Gantt (P8). Confidential initiatives are excluded outright. */
  ganttFor: (p: Priority) => {
    initiatives: import("../improvement/initiativeModel").Initiative[];
    actions: import("../../../shared/schema/actions").LtkAction[];
    stateFor: (i: import("../improvement/initiativeModel").Initiative) => import("../improvement/status").StatusState;
  };
  /** The priority's primary initiative AS IT COUNTS NOW (model
   *  `livePrimaryId`: still linked, active or completed) — null = none.
   *  Every tab that shows the primary's charter, metrics or commentary
   *  asks this, never the stored id (issue 1, 2026-11-16). */
  primaryOf: (p: Priority) => { id: string; title: string; completed: boolean } | null;
  /** A stored primary that no longer counts, and why. */
  stalePrimaryOf: (p: Priority) => { id: string; title: string; why: "archived" | "unlinked" | "gone" } | null;
  /** With no primary: the metrics its objectives may be picked from —
   *  the initiatives under the priority that carry any (issue 8). */
  metricChoicesFor: (p: Priority) => {
    initiativeId: string;
    title: string;
    inheritedFrom: string;
    metrics: { key: string; name: string; objective: string; plan: string; actual: string; rag: "green" | "amber" | "red" | null }[];
  }[];
  /** After any write: reload the cascade and repaint (scroll preserved). */
  changed: () => Promise<void>;
  /** The initiative behind a popup row (null = not loaded / confidential
   *  and hidden) — the row menu and the Metrics card act on it (issue 32). */
  initiativeById: (id: string) => import("../improvement/initiativeModel").Initiative | null;
  /** Super or site admin — may act on any initiative. */
  viewerAdminScope: AdminScope;
  /** After an initiative write from the popup: re-read the initiatives
   *  (rows, tallies) and repaint. */
  initiativesChanged: () => Promise<void>;
  /** Open the detail overlay for a priority (used by the review list). */
  open: (p: Priority) => void;
}

const btn = (label: string, cls = "app-btn"): HTMLButtonElement => {
  const b = el("button", cls, label) as HTMLButtonElement;
  b.type = "button";
  return b;
};

// ---- reason dialogs (§10) ------------------------------------------------------

export function reasonDialog(host: HTMLElement, title: string, note: string, placeholder: string): Promise<string | null> {
  return new Promise((resolve) => {
    const m = modal(host, title, note);
    const ta = el("textarea", "app-input") as HTMLTextAreaElement;
    ta.rows = 3;
    ta.placeholder = placeholder;
    m.body.appendChild(ta);
    const err = el("div", "app-cp-err", "");
    m.body.appendChild(err);
    const done = (v: string | null) => {
      m.close();
      resolve(v);
    };
    const cancel = btn("Cancel", "app-link");
    cancel.addEventListener("click", () => done(null));
    const ok = btn("Send", "app-btn app-btn-primary");
    ok.addEventListener("click", () => {
      if (ta.value.trim() === "") {
        err.textContent = "A reason is needed — the sender sees it.";
        ta.focus();
        return;
      }
      done(ta.value.trim());
    });
    m.footer.append(cancel, ok);
    ta.focus();
  });
}

/** "Why is this closing?" — reason picklist + optional note. */
export function closeDialog(
  host: HTMLElement,
  p: Priority,
  mode: "complete" | "archive"
): Promise<{ reason: CloseReason; note: string } | null> {
  return new Promise((resolve) => {
    const m = modal(host, mode === "complete" ? "Complete priority" : "Archive priority", `“${p.statement.slice(0, 120)}”`);
    m.body.appendChild(el("div", "app-cp-q", "Why is this closing?"));
    const list = el("div", "app-cp-reasons");
    let chosen: CloseReason | null = null;
    const paint = () => {
      list.querySelectorAll(".app-cp-reason").forEach((b) => b.classList.toggle("app-cp-reason-on", b.textContent === chosen));
    };
    for (const r of CLOSE_REASONS) {
      const b = btn(r, "app-cp-reason");
      b.addEventListener("click", () => {
        chosen = r;
        paint();
      });
      list.appendChild(b);
    }
    m.body.appendChild(list);
    const note = el("textarea", "app-input") as HTMLTextAreaElement;
    note.rows = 2;
    note.placeholder = "Optional note";
    m.body.appendChild(field("Note", note));
    const err = el("div", "app-cp-err", "");
    m.body.appendChild(err);
    const done = (v: { reason: CloseReason; note: string } | null) => {
      m.close();
      resolve(v);
    };
    const cancel = btn("Cancel", "app-link");
    cancel.addEventListener("click", () => done(null));
    const ok = btn(mode === "complete" ? "Complete" : "Archive", "app-btn app-btn-primary");
    ok.addEventListener("click", () => {
      if (chosen === null) {
        err.textContent = "Pick a reason.";
        return;
      }
      done({ reason: chosen, note: note.value.trim() });
    });
    m.footer.append(cancel, ok);
  });
}

// ---- lifecycle writes -------------------------------------------------------------

export async function closePriority(
  ctx: LifecycleCtx,
  p: Priority,
  mode: "complete" | "archive",
  r: { reason: CloseReason; note: string }
): Promise<void> {
  const data = ctx.data();
  p.status = mode === "complete" ? "completed" : "archived";
  p.statusReason = r.note !== "" ? `${r.reason} — ${r.note}` : r.reason;
  // the span's END: the period this closes in (2026-10-02)
  p.toPeriod = ctx.currentPeriod;
  await savePriority(p, data);
  await appendEvent(p, mode === "complete" ? "completed" : "archived", { reason: r.reason, note: r.note }, ctx.actor());
  await ctx.changed();
}

/** Set a completed / archived priority back to active — its span opens
 *  again (the stamped end clears). */
/** The primary initiative's charter (its Canvas card, bound fields
 *  included) or its Metrics card — one per tab (Ben, 2026-09-14) —
 *  mounted read-only from the initiative board with the board's own
 *  renderers. */
/** The primary initiative's commentary (2026-09-29): the latest update in
 *  full, the earlier ones beneath — and the team adds and edits here as
 *  on the initiative's own board (the same dialog, the same writes). */
async function mountPrimaryCommentary(
  host: HTMLElement,
  initiativeId: string,
  actor: { whoId: string; who: string },
  priorityId = "",
  recencyDays?: number,
  /** An update raised or cleared the flag — the screen's picture is stale. */
  onFlagChanged?: () => void
): Promise<void> {
  host.appendChild(el("div", "app-cp-muted", "Loading…"));
  const [{ listInitiatives, listInitiativeEvents }, { listPeople }, { myRoles, adminOver }, { updatesFrom, staleDays }, { renderUpdateCard, renderTrail, openUpdateDialog }, { addUpdate, editUpdate }, { todayIso }] = await Promise.all([
    import("../store/initiatives"),
    import("../store/people"),
    import("../improvement/initiativeModel"),
    import("../improvement/commentaryModel"),
    import("../improvement/commentary"),
    import("../improvement/commentaryActions"),
    import("../../../shared/schema/id"),
  ]);
  if (!host.isConnected) return;
  const [all, roster] = await Promise.all([listInitiatives(), listPeople().catch(() => [])]);
  const i = all.find((x) => x.id === initiativeId) ?? null;
  if (!host.isConnected) return;
  clear(host);
  if (!i) {
    host.appendChild(el("div", "app-cp-muted", "The primary initiative no longer exists — ★ another on the Initiatives tab."));
    return;
  }
  const role = roster.find((p) => p.whoId === actor.whoId)?.role ?? "user";
  const canComment = i.status === "active" && (myRoles(i, actor.whoId).length > 0 || role === "superadmin" || role === "siteadmin");
  // who a flag raised from an update would notify
  const sponsors = (i.roles.sponsor ?? []).map((p) => ({ name: p.who, email: roster.find((r) => r.whoId === p.whoId)?.email ?? "" })).filter((p) => p.email !== "");
  const head = el("div", "app-cp-ov-charterhead");
  head.append(el("span", "app-cp-ov-chartertitle", `★ ${i.title}`), el("span", "app-cp-muted", i.description));
  const open = btn("Open board ↗", "app-link");
  open.disabled = i.boardId === "";
  open.addEventListener("click", () => {
    rememberBoardOrigin("#/priorities", priorityId);
    window.location.hash = `#/board/${i.boardId}`;
  });
  head.appendChild(open);
  host.appendChild(head);
  const bodyEl = el("div", "app-cm-tab");
  host.appendChild(bodyEl);
  const paint = async () => {
    const events = await listInitiativeEvents(i).catch(() => []);
    if (!bodyEl.isConnected) return;
    clear(bodyEl);
    const list = updatesFrom(events);
    const today = todayIso();
    const bar = el("div", "app-cm-tabhead");
    bar.appendChild(el("span", "app-sb-h", list.length > 0 ? `Commentary · ${list.length}` : "Commentary"));
    const stale = i.status === "active" ? staleDays(list[0]?.at ?? "", events.length > 0 ? events[events.length - 1].at : "", today, recencyDays) : null;
    if (stale !== null) bar.appendChild(el("span", "app-sb-stale", `⚠ No update for ${stale} days`));
    bar.appendChild(el("span", "app-bar-gap"));
    const edit = (u: (typeof list)[number]) =>
      openUpdateDialog({
        existing: u,
        onSave: async (fields) => {
          await editUpdate(u, fields, actor);
          await paint();
        },
      });
    if (canComment) {
      const add = btn("＋ Add update", "app-btn app-btn-primary app-sb-btn");
      add.addEventListener("click", () =>
        openUpdateDialog({
          flag: { up: i.flag !== "", sponsors },
          onSave: async (fields, choice) => {
            const raising = choice.change === "raise" && i.flag === "";
            await addUpdate(i, fields, choice, actor);
            await paint();
            onFlagChanged?.();
            if (!raising || choice.notify === "") return;
            const [{ sendFlagNotice, flagOrgLine }, { boardUrl }] = await Promise.all([import("../improvement/escalate"), import("../links")]);
            return `✓ Saved and flagged. ${await sendFlagNotice(choice.notify, sponsors, i.title, flagOrgLine(actor.who, i), fields.support.trim(), boardUrl(i.boardId))}`;
          },
        })
      );
      bar.appendChild(add);
    }
    bodyEl.appendChild(bar);
    if (list.length === 0) {
      bodyEl.appendChild(el("div", "app-cp-muted", "No commentary yet."));
      return;
    }
    const lead = renderUpdateCard(list[0], today, canComment ? () => edit(list[0]) : null);
    lead.classList.add("app-cm-lead");
    bodyEl.appendChild(lead);
    if (list.length > 1) {
      bodyEl.appendChild(el("div", "app-sb-h app-cm-earlier", "Earlier updates"));
      bodyEl.appendChild(renderTrail({ list, today, canEdit: canComment, onEdit: edit, skipLatest: true }));
    }
  };
  await paint();
}

async function mountPrimaryCard(
  host: HTMLElement,
  initiativeId: string,
  cardType: "CanvasCard" | "MetricsCard",
  who: { actor: { whoId: string; who: string }; adminScope: AdminScope; priorityId?: string }
): Promise<void> {
  host.appendChild(el("div", "app-cp-muted", "Loading…"));
  const [{ listInitiatives }, { getBoard }, { parseManifest }, { liveRow, ensureLiveRow, saveCard }, { cardMounter }, { makeInitiativeBinding }, { defaultTheme }, { myRoles, adminOver }, { upsertActions }] = await Promise.all([
    import("../store/initiatives"),
    import("../store/boards"),
    import("../store/mappers"),
    import("../store/cards"),
    import("../cardRegistry"),
    import("../improvement/binding"),
    import("../../../shared/tokens"),
    import("../improvement/initiativeModel"),
    import("../store/actions"),
  ]);
  if (!host.isConnected) return;
  const i = (await listInitiatives()).find((x) => x.id === initiativeId) ?? null;
  clear(host);
  if (!i) {
    host.appendChild(el("div", "app-cp-muted", "The primary initiative no longer exists — ★ another on the Initiatives tab."));
    return;
  }
  const head = el("div", "app-cp-ov-charterhead");
  head.append(el("span", "app-cp-ov-chartertitle", `★ ${i.title}`), el("span", "app-cp-muted", i.description));
  const open = btn("Open board ↗", "app-link");
  open.disabled = i.boardId === "";
  open.addEventListener("click", () => {
    rememberBoardOrigin("#/priorities", who.priorityId ?? "");
    window.location.hash = `#/board/${i.boardId}`;
  });
  head.appendChild(open);
  host.appendChild(head);
  if (i.boardId === "") {
    host.appendChild(el("div", "app-cp-muted", cardType === "CanvasCard" ? "A single-action initiative — no charter or board." : "A single-action initiative — no metrics."));
    return;
  }
  const board = await getBoard(i.boardId);
  if (!board || !host.isConnected) return;
  const slots = parseManifest(board.manifestRaw).slots;
  const theme = defaultTheme();
  const binding = (await makeInitiativeBinding(i.boardId, () => undefined)) ?? undefined;
  // the Metrics card is WRITABLE here for whoever may add commentary —
  // a role on the initiative, or an admin, while it is active (issue 32,
  // Ben 2026-10-19); the charter stays read-only (it is edited on the board)
  const canEdit = cardType === "MetricsCard" && i.status === "active" && (myRoles(i, who.actor.whoId).length > 0 || adminOver(i, who.adminScope));
  const mountRO = async (cardType: string, title: string) => {
    const slot = slots.find((s) => s.cardType === cardType);
    const mounter = slot ? cardMounter(cardType) : null;
    if (!slot || !mounter) return;
    let row = await liveRow(i.boardId, slot.cardId).catch(() => null);
    if (!row && canEdit) {
      // no document row yet — make one so the first value lands
      row = await ensureLiveRow(i.boardId, slot.cardId, cardType)
        .then(() => liveRow(i.boardId, slot.cardId))
        .catch(() => null);
    }
    const card = el("div", `app-cp-ov-chartercard${cardType === "MetricsCard" ? " app-cp-ov-chartercard-scroll" : ""}`);
    host.appendChild(card);
    const rowId = row?.id ?? "";
    mounter({
      host: card,
      title,
      boardId: i.boardId,
      cardId: slot.cardId,
      outputJson: row?.outputJson ?? "",
      people: [],
      theme,
      readOnly: !canEdit || rowId === "",
      settings: slot.settings,
      instanceKey: `${i.boardId}:${slot.cardId}`,
      instanceWhen: "",
      binding,
      actions: [],
      sources: [],
      viewer: who.actor,
      onSave: (outputJson, tileSvg) => {
        if (!canEdit || rowId === "") return;
        void saveCard(rowId, outputJson, tileSvg);
      },
      onTile: () => undefined,
      onActions: (actions) => {
        if (!canEdit) return;
        void upsertActions(actions, i.boardId);
      },
    });
  };
  if (!slots.some((s) => s.cardType === cardType)) {
    host.appendChild(el("div", "app-cp-muted", cardType === "CanvasCard" ? "This initiative's board has no charter card." : "This initiative's board has no Metrics card yet — Edit details adds one on save."));
    return;
  }
  await mountRO(cardType, cardType === "CanvasCard" ? "Charter" : "Metrics");
}

/** An ACCEPTED priority goes back to proposed (Ben, 2026-11-16) — its
 *  owner or an admin only, behind a confirmation that says what follows:
 *  it stops counting at once, like any proposal; orgs that adopted it
 *  as-is lose it from their boards until it is accepted again; customised
 *  copies below are left alone. No reason is asked. */
export async function moveBackToProposed(ctx: LifecycleCtx, p: Priority): Promise<boolean> {
  if (p.status !== "active" || !ctx.canApprove(p.org)) return false;
  const data = ctx.data();
  const spread = spreadOf(p, data.priorities, data.assignments);
  const n = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;
  const note = [
    "It leaves the Priorities row for the Proposed row and stops counting: its initiatives no longer feed objectives, ratings or tallies until it is accepted again.",
    spread.adopted > 0 ? `${n(spread.adopted, "org adopted it as-is: it leaves that org's board", "orgs adopted it as-is: it leaves their boards")} too, and returns when it is accepted.` : "",
    spread.customised > 0 ? `${n(spread.customised, "customised copy below stays as it is", "customised copies below stay as they are")} — each is that org's own priority.` : "",
    spread.waiting > 0 ? `${n(spread.waiting, "cascade still waiting on an org stays", "cascades still waiting on orgs stay")} waiting.` : "",
  ]
    .filter((x) => x !== "")
    .join(" ");
  const ok = await promptConfirm({ title: `Move “${p.statement.slice(0, 60)}” back to proposed?`, note, confirmLabel: "Move back to proposed" });
  if (!ok) return false;
  p.status = "proposed";
  p.statusReason = "";
  await savePriority(p, data);
  await appendEvent(p, "proposed", { back: "yes" }, ctx.actor());
  await ctx.changed();
  return true;
}

export async function reopenPriority(ctx: LifecycleCtx, p: Priority): Promise<void> {
  const was = p.status;
  p.status = "active";
  p.statusReason = "";
  p.toPeriod = "";
  await savePriority(p, ctx.data());
  await appendEvent(p, "reopened", { from: was }, ctx.actor());
  await ctx.changed();
}

/** Send (or re-send) a priority to orgs: a fresh assignment for new
 *  targets; a declined / parked one goes back to proposed (its old reason
 *  and decision stay in History via the event). */
export async function sendCascade(ctx: LifecycleCtx, p: Priority, targets: OrgRef[]): Promise<void> {
  const data = ctx.data();
  const mine = data.assignments.filter((a) => a.priorityId === p.id);
  const sent: string[] = [];
  const resent: string[] = [];
  for (const org of targets) {
    const prior = mine.find((a) => orgKey(a.org) === orgKey(org));
    if (!prior) {
      await saveAssignment(
        { id: "", priorityId: p.id, org, status: "proposed", reason: "", decidedById: "", decidedByName: "", decidedAt: "", childPriorityId: "" },
        data
      );
      sent.push(orgName(org));
    } else if (prior.status === "rejected" || prior.status === "onhold") {
      await saveAssignment({ ...prior, status: "proposed", reason: "", decidedById: "", decidedByName: "", decidedAt: "", childPriorityId: "" }, data);
      resent.push(orgName(org));
    }
  }
  if (sent.length > 0) await appendEvent(p, "cascaded", { to: sent }, ctx.actor());
  if (resent.length > 0) await appendEvent(p, "cascaded", { to: resent, resent: true }, ctx.actor());
  // offered, never sent by itself: the owners of the orgs it went to
  const went = targets.filter((o) => sent.includes(orgName(o)) || resent.includes(orgName(o)));
  if (went.length > 0) {
    offerStepMessage(
      { step: "cascaded", statement: p.statement, org: p.org, toOrgs: went, to: went.map((o) => ctx.ownerFor(o)?.whoId ?? ""), linkOrg: went[0], period: ctx.currentPeriod },
      ctx.actor(),
      ctx.roster
    );
  }
}

/** Cascade-only dialog (overlay rail): tick child/peer orgs. */
export function cascadeDialog(ctx: LifecycleCtx, p: Priority): void {
  const data = ctx.data();
  const kids = childOrgs(ctx.tree, p.org);
  const parent = orgParent(p.org);
  const peers = parent ? childOrgs(ctx.tree, parent).filter((o) => !sameOrg(o, p.org)) : [];
  const targets: CascadeTarget[] = [
    ...kids.map((o) => ({ org: o, ownerName: ctx.ownerNameFor(o), kind: "child" as const })),
    ...peers.map((o) => ({ org: o, ownerName: ctx.ownerNameFor(o), kind: "peer" as const })),
  ];
  const already = new Map(data.assignments.filter((a) => a.priorityId === p.id).map((a) => [orgKey(a.org), { status: a.status, reason: a.reason }]));
  const m = modal(ctx.host, "Cascade to…", "Children receive it to cascade down; peers receive it to share sideways. Each is a request to accept.");
  const { box: list, picked } = cascadeTargetList(targets, already, p.org, (set) => {
    confirm.textContent = set.size > 0 ? `This will send the priority to ${set.size} org${set.size === 1 ? "" : "s"} for acceptance.` : "";
  });
  m.body.appendChild(list);
  const confirm = el("div", "app-cp-confirm", "");
  m.body.appendChild(confirm);
  const cancel = btn("Cancel", "app-link");
  cancel.addEventListener("click", () => m.close());
  const ok = btn("Send", "app-btn app-btn-primary");
  ok.addEventListener("click", () => {
    const chosen = targets.map((t) => t.org).filter((o) => picked.has(orgKey(o)));
    m.close();
    if (chosen.length === 0) return;
    void (async () => {
      await sendCascade(ctx, p, chosen);
      await ctx.changed();
    })();
  });
  m.footer.append(cancel, ok);
}

// ---- cascade review list (§3) -------------------------------------------------------

/** Answer a cascade (or a pull proposed by a direct report) waiting at
 *  `org`: accept as-is, hold, or decline. Hold and Decline ask why — the
 *  sender reads the reason. True when an answer was recorded. The one
 *  road for the priority popup's buttons (2026-11-18), the executive
 *  summary's last step and the phone's list. */
export async function decideCascade(ctx: LifecycleCtx, org: OrgRef, a: PriorityAssignment, p: Priority, status: "accepted" | "onhold" | "rejected"): Promise<boolean> {
  let reason = "";
  if (status !== "accepted") {
    const r = await reasonDialog(
      ctx.host,
      status === "onhold" ? "Hold this priority" : "Decline this priority",
      `Tell ${orgName(p.org)} why — they'll see this on their view.`,
      "e.g. no capacity until Q3"
    );
    if (r === null) return false;
    reason = r;
  }
  // who raised it, read BEFORE the answer overwrites the row's "decided by"
  const pulledBy = isPulledProposal(a) ? a.decidedById : "";
  await decideAssignment(a, status, reason, ctx.actor(), "", ctx.data());
  await appendEvent(p, status === "accepted" ? "accepted" : status === "onhold" ? "held" : "rejected", { org: orgName(org), reason }, ctx.actor());
  await ctx.changed();
  // the answer is offered to whoever is waiting on it: the direct report
  // who proposed the pull, or the priority's owner who cascaded it
  if (pulledBy !== "") {
    offerStepMessage({ step: status === "accepted" ? "proposal-accepted" : status === "onhold" ? "proposal-held" : "proposal-declined", statement: p.statement, org, reason, to: [pulledBy], linkOrg: org, period: ctx.currentPeriod }, ctx.actor(), ctx.roster);
  } else {
    offerStepMessage({ step: status === "accepted" ? "accepted" : status === "onhold" ? "held" : "declined", statement: p.statement, org, reason, to: [p.ownerId], linkOrg: p.org, period: ctx.currentPeriod }, ctx.actor(), ctx.roster);
  }
  return true;
}

export function cascadeReview(ctx: LifecycleCtx, org: OrgRef): void {
  const m = modal(ctx.host, "Cascades to accept", `Sent to ${orgName(org)} from above or beside. Accept as-is, accept and customise the wording, hold, or decline — the sender sees your reason.`, true);
  const list = el("div", "app-cp-review");
  m.body.appendChild(list);
  renderReviewList(ctx, org, list);
  const close = btn("Close", "app-link");
  close.addEventListener("click", () => m.close());
  m.footer.appendChild(close);
}

/** The review list itself — the modal above and the walk's final
 *  "Cascades to accept" step (§15) both render it. Repaints in place
 *  after every decision. */
export function renderReviewList(ctx: LifecycleCtx, org: OrgRef, list: HTMLElement): void {
  const paint = () => {
    clear(list);
    const data = ctx.data();
    const queue = reviewQueue(org, data.assignments);
    if (queue.length === 0) {
      list.appendChild(el("div", "app-cp-muted", "Nothing waiting on this org."));
      return;
    }
    let lastStatus = "";
    for (const a of queue) {
      const p = data.priorities.find((x) => x.id === a.priorityId);
      if (!p) continue;
      if (a.status !== lastStatus) {
        list.appendChild(el("div", "app-cp-menu-h", a.status === "proposed" ? "Awaiting your decision" : "Parked (on hold)"));
        lastStatus = a.status;
      }
      const row = el("div", "app-cp-review-row");
      const main = el("div", "app-cp-review-main");
      main.appendChild(el("div", "app-cp-review-statement", p.statement));
      const pillar = data.pillars.find((x) => x.id === p.pillarId);
      const parentL1 = pillar ? data.pillars.find((x) => x.id === pillar.parentId) : undefined;
      const lin = lineageFor(p, data.priorities, data.assignments);
      const pulled = isPulledProposal(a);
      const meta = [
        pulled ? `Pulled from ${orgName(p.org)} by ${a.decidedByName !== "" ? a.decidedByName : "a team member"} — proposed` : `Cascaded from ${orgName(p.org)}${p.ownerName !== "" ? ` · ${p.ownerName}` : ""}`,
        pillar ? `${parentL1 ? parentL1.name + " › " : ""}${pillar.name}` : "",
        lin.from ? `↑ ${orgName(lin.from)}` : "",
        p.period,
        a.status === "onhold" && a.reason !== "" ? `parked — “${a.reason}”` : "",
      ].filter((s) => s !== "");
      main.appendChild(el("div", "app-cp-review-meta", meta.join(" · ")));
      row.appendChild(main);
      const acts = el("div", "app-cp-review-acts");
      // a cascade sent from above: any manager decides, as before; a pull
      // proposed by someone who cannot approve: the owner or an admin
      const can = pulled ? ctx.canApprove(org) : ctx.canManage(org);
      const accept = btn("Accept", "app-btn app-btn-primary");
      const customise = btn("Accept & customise");
      const hold = btn(a.status === "onhold" ? "Update hold" : "Hold");
      // "Decline", the proposals' word (2026-11-18 — it read "Reject")
      const reject = btn("Decline…", "app-btn");
      for (const b of [accept, customise, hold, reject]) b.disabled = !can;
      accept.addEventListener("click", () => void decide(a, p, "accepted"));
      customise.addEventListener("click", () => void acceptCustomised(a, p));
      hold.addEventListener("click", () => void decide(a, p, "onhold"));
      reject.addEventListener("click", () => void decide(a, p, "rejected"));
      // the site's customisation floor (Settings → Priorities): below it a
      // cascade is adopted as-is — no customise button, a quiet note instead
      if (ctx.canCustomise(org)) acts.append(accept, customise, hold, reject);
      else {
        acts.append(accept, hold, reject);
        main.appendChild(el("div", "app-cp-muted app-cp-review-note", "Cascades to this level are adopted as-is — customising is set off for this site."));
      }
      row.appendChild(acts);
      list.appendChild(row);
    }
  };

  const decide = async (a: PriorityAssignment, p: Priority, status: "accepted" | "onhold" | "rejected") => {
    if (await decideCascade(ctx, org, a, p, status)) paint();
  };

  const acceptCustomised = async (a: PriorityAssignment, p: Priority) => {
    if (await customiseInto(ctx, org, p, a, `Accept & customise — from ${orgName(p.org)}`)) paint();
  };

  paint();
}

// ---- customise / pull / drop (issue round 2026-11-06, #2) -------------------------

/** The org's own customised child of `p`: the priority dialog prefilled
 *  from it, then the assignment (p × org) recorded as accepted with the
 *  child — the existing one when there is one, a new one otherwise (a
 *  pull, or customising a priority adopted as-is). True when saved. */
export async function customiseInto(
  ctx: LifecycleCtx,
  org: OrgRef,
  p: Priority,
  a: PriorityAssignment | null,
  title: string,
  /** The person may add but not approve: the customised copy waits as a
   *  proposal (a pull by an owner's direct report — issue 13). */
  asProposal = false
): Promise<boolean> {
  const data = ctx.data();
  const draft = newPriority(org, p.period);
  draft.statement = p.statement;
  draft.pillarId = p.pillarId;
  draft.parentId = p.id;
  // the receiving org's owner by default, else whoever accepts
  const owner = ctx.ownerFor(org) ?? ctx.actor();
  draft.ownerId = owner.whoId;
  draft.ownerName = owner.who;
  draft.order = data.priorities.filter((x) => orgKey(x.org) === orgKey(org) && x.pillarId === p.pillarId).length + 1;
  const r = await priorityDialog({
    host: ctx.host,
    title,
    priority: draft,
    pillars: data.pillars,
    periods: ctx.periodsOnOffer(),
    roster: ctx.roster,
    // a proposal is not cascaded: that waits for its acceptance
    cascadeTargets: asProposal ? [] : childOrgs(ctx.tree, org).map((o) => ({ org: o, ownerName: ctx.ownerNameFor(o), kind: "child" as const })),
    alreadyCascaded: [],
    ownerPicker: ctx.ownerPickerFor(org),
  });
  if (!r) return false;
  if (asProposal) r.priority.status = "proposed";
  r.priority.rowId = await savePriority(r.priority, data);
  data.priorities.push(r.priority);
  await appendEvent(r.priority, asProposal ? "proposed" : "created", { statement: r.priority.statement, customisedFrom: p.id }, ctx.actor());
  // a copy that is only PROPOSED has not been taken on: the parent is
  // marked customised when the proposal is accepted (the popup's Accept),
  // not now — the sender read "✓ customised" for something its org's
  // owner had not seen, and went on reading it if the owner declined
  // (found 2026-11-18)
  if (!asProposal) {
    await recordAccepted(ctx, org, p, a, r.priority.id);
    await appendEvent(p, "customised", { org: orgName(org), child: r.priority.id, statement: r.priority.statement }, ctx.actor());
  }
  for (const o of r.cascadeTo) {
    await saveAssignment(
      { id: "", priorityId: r.priority.id, org: o, status: "proposed", reason: "", decidedById: "", decidedByName: "", decidedAt: "", childPriorityId: "" },
      data
    );
  }
  if (r.cascadeTo.length > 0) await appendEvent(r.priority, "cascaded", { to: r.cascadeTo.map(orgName) }, ctx.actor());
  await ctx.changed();
  if (asProposal) {
    offerStepMessage({ step: "proposed", statement: r.priority.statement, org, to: [ctx.ownerFor(org)?.whoId ?? ""], linkOrg: org, period: ctx.currentPeriod }, ctx.actor(), ctx.roster);
  } else {
    offerStepMessage({ step: "customised", statement: p.statement, org, to: [p.ownerId], linkOrg: p.org, period: ctx.currentPeriod }, ctx.actor(), ctx.roster);
  }
  return true;
}

/** p × org recorded as accepted (child "" = adopted as-is): the given or
 *  existing assignment is decided, else a new one is written. */
export async function recordAccepted(ctx: LifecycleCtx, org: OrgRef, p: Priority, a: PriorityAssignment | null, childId: string): Promise<void> {
  const data = ctx.data();
  const row = a ?? data.assignments.find((x) => x.priorityId === p.id && orgKey(x.org) === orgKey(org)) ?? null;
  if (row) {
    await decideAssignment(row, "accepted", "", ctx.actor(), childId, data);
    return;
  }
  const by = ctx.actor();
  await saveAssignment(
    { id: "", priorityId: p.id, org: { ...org }, status: "accepted", reason: "", decidedById: by.whoId, decidedByName: by.who, decidedAt: new Date().toISOString(), childPriorityId: childId },
    data
  );
}

/**
 * ＋ Priority → Pull from above: an active priority at an org above this
 * one (never a peer), adopted as-is or customised. Below the site's
 * customisation floor the pull adopts as-is only. Nothing is sent: the
 * receiving org's own decision is recorded and the sender sees it in its
 * Cascade tab and history.
 */
export function pullFromAbove(ctx: LifecycleCtx, org: OrgRef, opts: { onNew?: () => void } = {}): void {
  const data = ctx.data();
  const cands = pullCandidates(org, data.priorities, data.assignments);
  const customise = ctx.canCustomise(org);
  // the org's owner or an admin adopts; anyone else who may add PROPOSES
  // the pull (issue 13, 2026-11-16)
  const approves = ctx.canApprove(org);
  const m = modal(
    ctx.host,
    opts.onNew ? "Add priority" : `Pull a priority to ${orgName(org)}`,
    customise
      ? `Active priorities set above ${orgName(org)}. Adopt one as-is, or adopt and customise its wording for this org — either way it stays linked to its parent.`
      : `Active priorities set above ${orgName(org)}. Cascades to this level are adopted as-is (the site's customisation setting).`
  ); // the narrow box, like New priority — the dialog keeps one size whichever face shows (Ben, 2026-11-06)
  if (opts.onNew) {
    const onNew = opts.onNew;
    m.body.appendChild(
      addModeToggle("pull", () => {
        m.close();
        onNew();
      })
    );
  }
  let chosen: Priority | null = null;
  const search = el("input", "app-input") as HTMLInputElement;
  search.type = "search";
  search.placeholder = `Search ${cands.length} ${cands.length === 1 ? "priority" : "priorities"}…`;
  search.setAttribute("aria-label", "Search priorities");
  const list = el("div", "app-cp-cascade");
  m.body.append(search, list);
  // Adopt as-is is the primary (Ben, 2026-11-06)
  const adopt = btn(approves ? "Adopt as-is" : "Propose as-is", "app-btn app-btn-primary");
  const custom = btn(approves ? "Adopt & customise…" : "Propose & customise…", "app-btn");
  if (!approves) m.body.appendChild(el("div", "app-cp-muted", `A pull you make is PROPOSED: it waits for ${orgName(org)}'s owner or an admin to accept.`));
  const draw = () => {
    clear(list);
    const q = search.value.trim().toLowerCase();
    const shown = cands.filter((p) => q === "" || p.statement.toLowerCase().includes(q) || orgName(p.org).toLowerCase().includes(q));
    if (shown.length === 0) {
      list.appendChild(el("div", "app-cp-muted", cands.length === 0 ? "Nothing to pull — every active priority above is already here, or none is set." : "Nothing matches."));
    }
    let lastOrg = "";
    for (const p of shown) {
      if (orgKey(p.org) !== lastOrg) {
        lastOrg = orgKey(p.org);
        list.appendChild(el("div", "app-cp-menu-h", `${orgName(p.org)}${orgLevel(p.org) === "company" ? " (company)" : ""}`));
      }
      const pillar = data.pillars.find((x) => x.id === p.pillarId);
      const b = btn(`${p.statement.slice(0, 110)}${pillar ? ` · ${pillar.name}` : ""}`, "app-cp-reason app-cp-parentopt" + (chosen?.id === p.id ? " app-cp-reason-on" : ""));
      b.title = p.statement;
      b.addEventListener("click", () => {
        chosen = p;
        draw();
      });
      list.appendChild(b);
    }
    adopt.disabled = chosen === null;
    custom.disabled = chosen === null;
  };
  search.addEventListener("input", draw);
  draw();
  setTimeout(() => search.focus(), 0);
  const cancel = btn("Cancel", "app-link");
  cancel.addEventListener("click", () => m.close());
  adopt.addEventListener("click", () => {
    const p = chosen;
    if (!p) return;
    m.close();
    void (async () => {
      if (approves) {
        await recordAccepted(ctx, org, p, null, "");
        await appendEvent(p, "pulled", { org: orgName(org) }, ctx.actor());
      } else {
        // waits in the org's "to accept" queue, naming who pulled it — the
        // owner or an admin decides (isPulledProposal)
        const by = ctx.actor();
        const prior = data.assignments.find((x) => x.priorityId === p.id && orgKey(x.org) === orgKey(org)) ?? null;
        await saveAssignment(
          { id: prior?.id ?? "", priorityId: p.id, org: { ...org }, status: "proposed", reason: "", decidedById: by.whoId, decidedByName: by.who, decidedAt: new Date().toISOString(), childPriorityId: "" },
          data
        );
        await appendEvent(p, "proposed", { org: orgName(org), pulled: "yes" }, by);
        offerStepMessage({ step: "proposed", statement: p.statement, org, to: [ctx.ownerFor(org)?.whoId ?? ""], linkOrg: org, period: ctx.currentPeriod }, by, ctx.roster);
      }
      await ctx.changed();
    })();
  });
  custom.addEventListener("click", () => {
    const p = chosen;
    if (!p) return;
    m.close();
    void customiseInto(ctx, org, p, null, `Adopt & customise — from ${orgName(p.org)}`, !approves);
  });
  if (customise) m.footer.append(cancel, custom, adopt);
  else m.footer.append(cancel, adopt);
}

/** Drop a priority this org adopted as-is: the assignment turns
 *  declined with the reason, which the sender sees on its view. */
async function dropAdopted(ctx: LifecycleCtx, org: OrgRef, p: Priority): Promise<boolean> {
  const data = ctx.data();
  const a = data.assignments.find((x) => x.priorityId === p.id && orgKey(x.org) === orgKey(org) && x.status === "accepted" && x.childPriorityId === "");
  if (!a) return false;
  const reason = await reasonDialog(
    ctx.host,
    `Drop from ${orgName(org)}`,
    `“${p.statement.slice(0, 80)}” leaves ${orgName(org)}'s view. Tell ${orgName(p.org)} why — they'll see this on their view.`,
    "e.g. covered by our own priority"
  );
  if (reason === null) return false;
  await decideAssignment(a, "rejected", reason, ctx.actor(), "", data);
  await appendEvent(p, "dropped", { org: orgName(org), reason }, ctx.actor());
  await ctx.changed();
  return true;
}

// ---- detail overlay (§6) -------------------------------------------------------------

/** `adoptedAt`: the org whose matrix showed this priority as ADOPTED
 *  as-is (the parent's row) — its managers get Customise and Drop.
 *  `decideAt`: the org this priority WAITS on (a cascade sent to it, or a
 *  pull one of its people proposed) — the answer is given here. */
export function openPriorityOverlay(ctx: LifecycleCtx, p: Priority, onEdit: (p: Priority) => void, adoptedAt: OrgRef | null = null, decideAt: OrgRef | null = null): () => void {
  const scrim = el("div", "app-cp-scrim");
  const box = el("div", "app-cp-overlay");
  scrim.appendChild(box);
  ctx.host.appendChild(scrim);
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      close();
    }
  };
  const close = () => {
    scrim.remove();
    document.removeEventListener("keydown", onKey, true);
    // the matrix behind the popup shows tallies too
    if (actionsTouched) {
      actionsTouched = false;
      void ctx.changed();
    }
  };
  document.addEventListener("keydown", onKey, true);
  scrim.addEventListener("pointerdown", (e) => {
    if (e.target === scrim) close();
  });

  // the tab it was left on, for the session — returning from a board
  // reopens the popup where the person was (issue 9, 2026-11-16)
  let tab: "initiatives" | "actions" | "commentary" | "metrics" | "cascade" | "charter" | "history" = (popupTabFor(p.id) as "initiatives" | null) ?? "initiatives";
  /** The Actions tab wrote something the screen's tallies have not seen. */
  let actionsTouched = false;
  let events: PriorityEvent[] | null = null;

  const paint = () => {
    clear(box);
    const data = ctx.data();
    const live = data.priorities.find((x) => x.id === p.id) ?? p;
    const primary = ctx.primaryOf(live);
    const pillar = data.pillars.find((x) => x.id === live.pillarId);
    const parentL1 = pillar ? data.pillars.find((x) => x.id === pillar.parentId) : undefined;
    const can = ctx.canManage(live.org);

    // header (Ben, 2026-08-24): chip ABOVE the title (a chip, not a
    // button — pill, tinted with the pillar's colour), the old rail-foot
    // actions promoted to the header's right
    const head = el("div", "app-cp-ov-head");
    const headText = el("div", "app-cp-ov-headtext");
    const chip = el("span", "app-cp-ov-pillar", pillar ? `${parentL1 ? parentL1.name + " › " : ""}${pillar.name}` : "No sub-pillar");
    const colour = pillar?.color || parentL1?.color || "";
    if (colour !== "") {
      chip.style.background = `color-mix(in srgb, ${colour} 14%, white)`;
      chip.style.color = `color-mix(in srgb, ${colour} 82%, black)`;
    }
    headText.appendChild(chip);
    headText.appendChild(el("h2", "app-cp-ov-statement", live.statement));
    // waiting on the org in view: a cascade from above, or a pull one of
    // its people proposed (the answer was a separate pop-up list)
    const waiting = decideAt ? (reviewQueue(decideAt, data.assignments).find((a) => a.priorityId === live.id) ?? null) : null;
    const waitingPulled = waiting !== null && isPulledProposal(waiting);
    const mayDecide = waiting !== null && decideAt !== null && (waitingPulled ? ctx.canApprove(decideAt) : ctx.canManage(decideAt));
    if (waiting !== null && decideAt !== null) {
      const what = waitingPulled
        ? `Proposed for ${orgName(decideAt)}${waiting.decidedByName !== "" ? ` by ${waiting.decidedByName}` : ""}`
        : `Cascaded to ${orgName(decideAt)}`;
      const held = waiting.status === "onhold" ? ` — on hold${waiting.reason !== "" ? `: “${waiting.reason}”` : ""}` : "";
      const whose = mayDecide ? " — yours to accept or decline" : waitingPulled ? " — waiting for the org's owner or an admin" : " — waiting for someone who manages the org";
      headText.appendChild(el("div", "app-cp-ov-proposedpill", `${what}${held}${whose}`));
    } else if (live.status === "proposed") {
      headText.appendChild(el("div", "app-cp-ov-proposedpill", ctx.canApprove(live.org) ? "Proposed — yours to accept or decline" : "Proposed — waiting for the org's owner or an admin"));
    } else if (isDeclined(live)) {
      headText.appendChild(el("div", "app-cp-ov-proposedpill app-cp-ov-declinedpill", live.statusReason));
    }
    headText.appendChild(
      el("div", "app-cp-ov-meta", [orgName(live.org), live.period, live.ownerName !== "" ? `owner ${live.ownerName}` : "no owner", primary !== null ? `★ ${primary.title}${primary.completed ? " (completed)" : ""}` : "", live.status !== "active" ? live.status : ""].filter((s) => s !== "").join(" · "))
    );
    head.appendChild(headText);
    const headBtns = el("div", "app-cp-ov-headbtns");
    const add = btn("Add initiative", "app-btn app-btn-primary");
    // the one link rule (issue round 2026-11-06): only under a priority
    // at an org the viewer manages, or adopted at one
    const mayLink = ctx.canLink(live);
    add.title = mayLink
      ? "Create an initiative linked to this priority"
      : `Initiatives link to priorities at an org you manage — pull this priority to your org first (＋ Priority → Pull from above)`;
    // initiatives may hang under a proposal too (issue 13)
    add.disabled = (live.status !== "active" && live.status !== "proposed") || !mayLink;
    add.addEventListener("click", () => {
      // hand the priority to the Improvement tab's create flow (design 1.3:
      // pre-filled and locked to the source priority)
      try {
        sessionStorage.setItem("ltk-pending-init-priority", JSON.stringify({ priorityId: live.id, label: live.statement.slice(0, 60) }));
      } catch {
        /* fine */
      }
      close();
      window.location.hash = "#/improvement";
    });
    if (waiting !== null && decideAt !== null) {
      // ONE solid button: Accept. The rest are outline, and Hold and
      // Decline ask why. Nothing to link an initiative to until it is
      // taken on, so "Add initiative" gives way.
      if (mayDecide) {
        const at = decideAt;
        const w = waiting;
        const answer = (status: "accepted" | "onhold" | "rejected") => {
          void decideCascade(ctx, at, w, live, status).then((done) => {
            if (done) close();
          });
        };
        const decline = btn("Decline…", "app-btn");
        decline.addEventListener("click", () => answer("rejected"));
        const hold = btn(w.status === "onhold" ? "Update hold…" : "Hold…", "app-btn");
        hold.addEventListener("click", () => answer("onhold"));
        headBtns.append(decline, hold);
        if (ctx.canCustomise(at)) {
          const customise = btn("Accept & customise…", "app-btn");
          customise.addEventListener("click", () => {
            void customiseInto(ctx, at, live, w, `Accept & customise — from ${orgName(live.org)}`).then((ok) => {
              if (ok) close();
            });
          });
          headBtns.appendChild(customise);
        }
        const accept = btn("Accept", "app-btn app-btn-primary");
        accept.title = ctx.canCustomise(at) ? "Take it on as it is written" : "Cascades to this level are adopted as written";
        accept.addEventListener("click", () => answer("accepted"));
        headBtns.appendChild(accept);
      }
    } else {
      headBtns.appendChild(add);
    }
    // adopted as-is at the viewed org: its managers may customise it into
    // their own linked row (renameable, unlinkable) or drop it
    const adoptOrg = adoptedAt && !sameOrg(adoptedAt, live.org) && ctx.canManage(adoptedAt) && live.status === "active" ? adoptedAt : null;
    /** The adopting org's two items — on their own ⋮, or appended to the
     *  owner's menu when the viewer manages the priority's org too. */
    const adoptItems = (item: (label: string, run: () => void) => void) => {
      if (!adoptOrg) return;
      if (ctx.canCustomise(adoptOrg)) {
        item(`Customise for ${orgName(adoptOrg)}…`, () => {
          void customiseInto(ctx, adoptOrg, live, null, `Customise for ${orgName(adoptOrg)} — from ${orgName(live.org)}`).then((ok) => {
            if (ok) close();
          });
        });
      }
      item(`Drop from ${orgName(adoptOrg)}…`, () => {
        void dropAdopted(ctx, adoptOrg, live).then((ok) => {
          if (ok) close();
        });
      });
    };
    if (adoptOrg && !(can && live.status === "active")) {
      const more = btn("⋮", "app-btn app-cp-ov-morebtn");
      more.title = `Adopted by ${orgName(adoptOrg)} · Customise · Drop`;
      more.addEventListener("click", () => {
        const menu = el("div", "app-cp-menu");
        const item = (label: string, run: () => void) => {
          const b = btn(label, "app-cp-menu-item");
          b.addEventListener("click", () => {
            menu.remove();
            run();
          });
          menu.appendChild(b);
        };
        adoptItems(item);
        const r = more.getBoundingClientRect();
        menu.style.top = `${r.bottom + 4}px`;
        menu.style.left = `${Math.min(r.left, window.innerWidth - 240)}px`;
        document.body.appendChild(menu);
        const off = (e: PointerEvent) => {
          if (!menu.contains(e.target as Node)) {
            menu.remove();
            document.removeEventListener("pointerdown", off, true);
          }
        };
        setTimeout(() => document.addEventListener("pointerdown", off, true), 0);
      });
      headBtns.appendChild(more);
    }
    if (live.status === "proposed") {
      // a proposal (issue 13, 2026-11-16): the org's owner or an admin
      // accepts or declines; whoever may add can still edit the wording
      const approves = ctx.canApprove(live.org);
      if (can) {
        const edit = btn("Edit…", "app-btn");
        edit.addEventListener("click", () => {
          close();
          onEdit(live);
        });
        headBtns.appendChild(edit);
      }
      if (approves) {
        const decline = btn("Decline…", "app-btn");
        decline.addEventListener("click", () => {
          void (async () => {
            const reason = await reasonDialog(ctx.host, "Decline this proposal", `“${live.statement.slice(0, 80)}” leaves the Proposed row. It stays on record as declined and can be proposed again.`, "Why it is not being taken on");
            if (reason === null) return;
            live.status = "archived";
            live.statusReason = `${DECLINED_PREFIX}${reason}`;
            live.toPeriod = ctx.currentPeriod;
            await savePriority(live, ctx.data());
            await appendEvent(live, "declined", { reason }, ctx.actor());
            await ctx.changed();
            offerStepMessage({ step: "proposal-declined", statement: live.statement, org: live.org, reason, to: [live.ownerId], linkOrg: live.org, period: ctx.currentPeriod }, ctx.actor(), ctx.roster);
            events = null;
            if (scrim.isConnected) paint();
          })();
        });
        const accept = btn("Accept", "app-btn app-btn-primary");
        accept.title = "Take it on: it joins the board's priorities and counts from now";
        accept.addEventListener("click", () => {
          void (async () => {
            live.status = "active";
            live.statusReason = "";
            await savePriority(live, ctx.data());
            await appendEvent(live, "approved", {}, ctx.actor());
            // a proposed customised copy of a priority from above: taking
            // it on is what answers the parent (see customiseInto)
            const parent = live.parentId !== "" ? ctx.data().priorities.find((x) => x.id === live.parentId) : undefined;
            if (parent && !sameOrg(parent.org, live.org) && !ctx.data().assignments.some((x) => x.priorityId === parent.id && orgKey(x.org) === orgKey(live.org) && x.status === "accepted")) {
              await recordAccepted(ctx, live.org, parent, null, live.id);
              await appendEvent(parent, "customised", { org: orgName(live.org), child: live.id, statement: live.statement }, ctx.actor());
            }
            offerStepMessage({ step: "proposal-accepted", statement: live.statement, org: live.org, to: [live.ownerId], linkOrg: live.org, period: ctx.currentPeriod }, ctx.actor(), ctx.roster);
            await ctx.changed();
            events = null;
            if (scrim.isConnected) paint();
          })();
        });
        headBtns.append(decline, accept);
      }
    } else if (can && isDeclined(live) && !ctx.canApprove(live.org)) {
      // a declined proposal is not "reopened" into an accepted priority
      // by someone who cannot approve — they may propose it again
      const again = btn("Propose again", "app-btn");
      again.addEventListener("click", () => {
        void (async () => {
          live.status = "proposed";
          live.statusReason = "";
          live.toPeriod = "";
          await savePriority(live, ctx.data());
          await appendEvent(live, "proposed", { again: "yes" }, ctx.actor());
          await ctx.changed();
          events = null;
          if (scrim.isConnected) paint();
        })();
      });
      headBtns.appendChild(again);
    } else if (can && live.status !== "active") {
      const reopen = btn("Reopen", "app-btn");
      reopen.title = "Set back to active";
      reopen.addEventListener("click", () => {
        void reopenPriority(ctx, live).then(() => {
          events = null;
          if (scrim.isConnected) paint();
        });
      });
      headBtns.appendChild(reopen);
    }
    if (can && live.status === "active") {
      const more = btn("⋮", "app-btn app-cp-ov-morebtn");
      more.title = "Cascade · Edit · Complete · Archive";
      more.addEventListener("click", () => {
        const menu = el("div", "app-cp-menu");
        const item = (label: string, run: () => void) => {
          const b = btn(label, "app-cp-menu-item");
          b.addEventListener("click", () => {
            menu.remove();
            run();
          });
          menu.appendChild(b);
        };
        item("Cascade to…", () => cascadeDialog(ctx, live));
        item("Edit…", () => {
          close();
          onEdit(live);
        });
        item("Complete…", () => void doClose(live, "complete"));
        item("Archive…", () => void doClose(live, "archive"));
        // the undo of Accept — for whoever may accept
        if (ctx.canApprove(live.org)) {
          item("Move back to proposed…", () => {
            void moveBackToProposed(ctx, live).then((moved) => {
              if (!moved) return;
              events = null;
              if (scrim.isConnected) paint();
            });
          });
        }
        item("Delete…", () => {
          void (async () => {
            const kids = data.priorities.filter((x) => x.parentId === live.id).length;
            const linked = ctx.ganttFor(live).initiatives.filter((x) => x.priorities.some((l) => l.priorityId === live.id)).length;
            const bits = [
              "This removes the priority and its cascade records for good — history events remain.",
              kids > 0 ? `${kids} customised child priorit${kids === 1 ? "y" : "ies"} will stand alone.` : "",
              linked > 0 ? `${linked} linked initiative${linked === 1 ? "" : "s"} will be unlinked (they keep running).` : "",
            ].filter((x) => x !== "");
            const yes = await promptConfirm({
              title: `Delete “${live.statement.slice(0, 60)}”?`,
              note: bits.join(" "),
              confirmLabel: "Delete priority",
              danger: true,
            });
            if (!yes) return;
            const [{ deletePriority }, { unlinkPriorityEverywhere }] = await Promise.all([
              import("../store/priorities"),
              import("../store/initiatives"),
            ]);
            await unlinkPriorityEverywhere(live.id).catch(() => 0);
            await deletePriority(live, data);
            close();
            await ctx.changed();
          })();
        });
        adoptItems(item);
        const r = more.getBoundingClientRect();
        menu.style.top = `${r.bottom + 4}px`;
        menu.style.left = `${Math.min(r.left, window.innerWidth - 240)}px`;
        document.body.appendChild(menu);
        const off = (e: PointerEvent) => {
          if (!menu.contains(e.target as Node)) {
            menu.remove();
            document.removeEventListener("pointerdown", off, true);
          }
        };
        setTimeout(() => document.addEventListener("pointerdown", off, true), 0);
      });
      headBtns.appendChild(more);
    }
    // ✕ rides the same cluster as the actions — one row, one baseline
    const x = btn("✕", "app-btn app-cp-ov-close");
    x.title = "Close";
    x.addEventListener("click", close);
    headBtns.appendChild(x);
    head.appendChild(headBtns);
    box.appendChild(head);

    // parent completed prompt (§10)
    const closedParent = parentClosed(live, data.priorities);
    if (closedParent) {
      const bar = el("div", "app-cp-ov-prompt");
      bar.appendChild(el("span", undefined, `${orgName(closedParent.org)} completed the parent of this priority. Complete yours, or keep it and note why.`));
      if (can) {
        const c = btn("Complete…", "app-btn");
        c.addEventListener("click", () => void doClose(live, "complete"));
        const k = btn("Keep", "app-btn");
        k.addEventListener("click", () => {
          void reasonDialog(ctx.host, "Keep this priority", "Note why it continues after its parent closed.", "e.g. still material for our site").then(async (r) => {
            if (r === null) return;
            live.notes = live.notes !== "" ? `${live.notes}\nKept after parent closed: ${r}` : `Kept after parent closed: ${r}`;
            await savePriority(live, data);
            await appendEvent(live, "edited", { keptAfterParentClosed: r }, ctx.actor());
            await ctx.changed();
            paint();
          });
        });
        bar.append(c, k);
      }
      box.appendChild(bar);
    }

    const desk = el("div", "app-cp-ov-desk");
    box.appendChild(desk);

    // left: tabs
    const left = el("div", "app-cp-ov-left");
    const tabs = el("div", "app-cp-ov-tabs");
    const rags = ctx.statusesFor(live);
    // the charter and the commentary are the PRIMARY initiative's: a
    // priority without one has neither tab (Ben, 2026-11-16, issue 8),
    // and its Metrics tab is where its objectives are picked
    const allTabs: [typeof tab, string][] = [
      // Ben's order, 2026-09-29: what is being done, then how it is
      // going, then the reference material
      ["initiatives", `Initiatives ${rags.length}`],
      ["actions", "Actions"],
      ["commentary", "Commentary"],
      ["metrics", primary !== null ? "Metrics" : "Objectives"],
      ["cascade", "Cascade"],
      ["charter", "Charter"],
      ["history", "History"],
    ];
    const tabDefs = allTabs.filter(([key]) => primary !== null || (key !== "commentary" && key !== "charter"));
    if (!tabDefs.some(([key]) => key === tab)) tab = "initiatives";
    for (const [key, label] of tabDefs) {
      const t = btn(label, "app-cp-ov-tab" + (tab === key ? " app-cp-ov-tab-on" : ""));
      t.addEventListener("click", () => {
        const leavingActions = tab === "actions" && key !== "actions";
        tab = key;
        rememberPopupTab(p.id, key);
        paint();
        if (leavingActions && actionsTouched) {
          // actions were written on the Actions tab: the matrix behind
          // the popup carries tallies and ratings too
          actionsTouched = false;
          void ctx.changed().then(() => {
            if (scrim.isConnected) paint();
          });
        }
      });
      tabs.appendChild(t);
    }
    left.appendChild(tabs);
    const body = el("div", "app-cp-ov-body");
    left.appendChild(body);
    if (tab === "initiatives") {
      const rows = ctx.initiativesFor(live);
      const shown = rows.filter((r) => !r.confidentialHidden);
      if (shown.length === 0 && rows.length === 0) {
        body.appendChild(el("div", "app-cp-muted", "No initiatives linked yet — Add initiative, or link one from the Improvement tab."));
      }
      // ONE row, the one the Improvement list and the executive summary
      // draw (improvement/initiativeRow.ts — Ben, 2026-11-17): no group
      // headings, the cards in order — primary, support needed, off
      // track, on track — under a header whose captions sit over the
      // action circles. The ★ and the ⋮ have fixed cells.
      const buildRow = (r: (typeof shown)[number]): HTMLElement => {
        const isPrimary = primary?.id === r.id;
        const openBoard = () => {
          rememberBoardOrigin("#/priorities", live.id);
          close();
          window.location.hash = `#/board/${r.boardId}`;
        };
        // ★ the priority's PRIMARY initiative (its charter + metrics on the
        // Charter tab) — a direct link only, set by whoever manages the
        // org. The star alone: the row's tag and heavy border say "primary".
        const starCell = el("span", "app-ir-starcell");
        if (r.inheritedFrom === "") {
          const star = btn(isPrimary ? "★" : "☆", "app-link app-cp-ov-star" + (isPrimary ? " app-cp-ov-star-on" : ""));
          star.title = isPrimary ? "The primary initiative — its charter and metrics headline this priority. Click to clear." : "Make this the primary initiative";
          star.setAttribute("aria-label", star.title);
          star.disabled = !ctx.canManage(live.org);
          star.addEventListener("click", (e) => {
            e.stopPropagation();
            void (async () => {
              // a check first (Ben, 2026-10-19): the primary's charter and
              // metrics headline the priority — not a one-click swap
              const ok = await promptConfirm(
                isPrimary
                  ? { title: "Clear the primary initiative?", note: `“${r.title}” will no longer headline this priority. The Charter and Commentary tabs go until another is starred, and its objectives are picked on the Objectives tab.`, confirmLabel: "Clear" }
                  : { title: "Make this the primary initiative?", note: `“${r.title}” — its charter, metrics and commentary headline this priority${primary !== null ? ", replacing the current primary" : ""}.`, confirmLabel: "Make primary" }
              );
              if (!ok) return;
              live.primaryInitiativeId = isPrimary ? "" : r.id;
              await savePriority(live, ctx.data());
              await ctx.changed();
              if (scrim.isConnected) paint();
            })();
          });
          starCell.appendChild(star);
        }
        // the same ⋮ as the Improvement tab's rows (issue 32)
        const kebabCell = el("span", "app-ir-kebabcell");
        const init = ctx.initiativeById(r.id);
        if (init) {
          const kebab = btn("⋮", "app-cp-kebab app-im-kebab");
          kebab.title = "Open · Edit details · Flag · Archive";
          kebab.addEventListener("click", (e) => {
            e.stopPropagation();
            void import("../improvement/rowMenu").then(({ openInitiativeRowMenu }) => {
              openInitiativeRowMenu(kebab, init, {
                host: ctx.host,
                viewer: { whoId: ctx.actor().whoId, adminScope: ctx.viewerAdminScope },
                actor: ctx.actor,
                roster: ctx.roster,
                currentPeriod: ctx.currentPeriod,
                onOpen: () => openBoard(),
                onChanged: () => {
                  void ctx.initiativesChanged().then(() => {
                    if (scrim.isConnected) paint();
                  });
                },
              });
            });
          });
          kebabCell.appendChild(kebab);
        }
        return initiativeRow(
          {
            title: r.title,
            sub: [r.ownerName !== "" ? r.ownerName : "No owner", r.inheritedFrom !== "" ? `↓ ${r.inheritedFrom}` : r.orgName].filter((x) => x !== "").join(" · "),
            subTitle: r.ownerTitle !== "" ? `Owner: ${r.ownerTitle}` : undefined,
            status: r.status,
            flagNote: r.flagNote,
            primary: isPrimary,
            stageName: r.stageName,
            stagePdca: r.stagePdca,
            counts: r.counts,
            metrics: r.metrics,
          },
          {
            layout: "popup",
            colour: ctx.stateColour,
            metricColour: (rag) => ctx.palette[ragPaletteKey(rag)] ?? "#9a948a",
            tools: [starCell, kebabCell],
            onOpen: r.boardId !== "" ? openBoard : undefined,
            openTitle: "Open the initiative board",
          }
        );
      };
      // a primary that is not in the list below still has to be said, and
      // be clearable: a COMPLETED one keeps headlining but only active
      // initiatives are listed; a STALE one (archived, unlinked, gone) no
      // longer counts (issue 1, 2026-11-16)
      const clearPrimary = (label: string): HTMLButtonElement => {
        const b = btn(label, "app-link");
        b.addEventListener("click", () => {
          void (async () => {
            live.primaryInitiativeId = "";
            await savePriority(live, ctx.data());
            await ctx.changed();
            if (scrim.isConnected) paint();
          })();
        });
        return b;
      };
      const stale = ctx.stalePrimaryOf(live);
      if (stale !== null) {
        const note = el("div", "app-cp-ov-primarynote");
        const name = stale.title !== "" ? `“${stale.title}”` : "that was starred";
        note.appendChild(
          el(
            "span",
            undefined,
            stale.why === "archived"
              ? `The primary initiative ${name} was archived, so it no longer headlines this priority. Star another, or restore it.`
              : stale.why === "unlinked"
                ? `The primary initiative ${name} is no longer linked to this priority. Star another.`
                : `The primary initiative ${name} no longer exists. Star another.`
          )
        );
        if (ctx.canManage(live.org)) note.appendChild(clearPrimary("Clear"));
        body.appendChild(note);
      } else if (primary !== null && !shown.some((r) => r.id === primary.id)) {
        const note = el("div", "app-cp-ov-primarynote");
        note.append(el("span", "app-cp-ov-star-on", "★"), el("span", undefined, ` Primary initiative: “${primary.title}”${primary.completed ? " — completed. Its charter and final metrics still headline this priority." : ""}`));
        if (ctx.canManage(live.org)) note.appendChild(clearPrimary("Clear"));
        body.appendChild(note);
      }
      // the list: one header, then the cards — the primary first, then
      // support needed, off track, on track
      const primaryId = primary?.id ?? "";
      const ordered = shown.map((r, i) => ({ r, i })).sort((a, b) => rowRank(a.r.status.state, a.r.id === primaryId) - rowRank(b.r.status.state, b.r.id === primaryId) || a.i - b.i);
      if (ordered.length > 0) {
        const list = el("div", "app-ir-list");
        list.appendChild(initiativeRowHead("popup", [], 2));
        for (const { r } of ordered) list.appendChild(buildRow(r));
        body.appendChild(list);
      }
      const hidden = rows.length - shown.length;
      if (hidden > 0) body.appendChild(el("div", "app-cp-muted", `+ ${hidden} confidential initiative${hidden === 1 ? "" : "s"}`));
    } else if ((tab === "charter" || tab === "metrics") && primary !== null) {
      const host = el("div", "app-cp-ov-charter");
      body.appendChild(host);
      void mountPrimaryCard(host, primary.id, tab === "charter" ? "CanvasCard" : "MetricsCard", { actor: ctx.actor(), adminScope: ctx.viewerAdminScope, priorityId: live.id });
    } else if (tab === "metrics") {
      // no primary initiative: the objectives are PICKED from the metrics
      // of the initiatives under the priority (issue 8, 2026-11-16)
      const may = ctx.canManage(live.org);
      const choices = ctx.metricChoicesFor(live);
      body.appendChild(
        el(
          "div",
          "app-cp-muted app-cp-ov-objnote",
          choices.length === 0
            ? "This priority has no primary initiative, and none of its initiatives carries a metric yet. Its objectives are picked here once one does — or ★ a primary on the Initiatives tab."
            : may
              ? "This priority has no primary initiative. Tick the metrics that are its objectives — they show in the Objectives row. (★ a primary on the Initiatives tab instead and its starred metrics take over.)"
              : "This priority has no primary initiative. The ticked metrics are its objectives."
        )
      );
      const picked = (initiativeId: string, key: string) => live.objectives.some((o) => o.initiativeId === initiativeId && o.metricKey === key);
      for (const c of choices) {
        const head = el("div", "app-cp-ov-group");
        head.appendChild(el("span", undefined, c.inheritedFrom !== "" ? `${c.title} · via ${c.inheritedFrom}` : c.title));
        body.appendChild(head);
        for (const m of c.metrics) {
          const row = el("label", "app-cp-ov-objrow");
          const box = el("input") as HTMLInputElement;
          box.type = "checkbox";
          box.checked = picked(c.initiativeId, m.key);
          box.disabled = !may;
          const light = el("span", "app-cp-objective-light");
          light.style.background = m.rag ? (ctx.palette[ragPaletteKey(m.rag)] ?? "#9a948a") : "#d9d3c8";
          const text = el("span", "app-cp-ov-objtext");
          text.appendChild(el("span", "app-cp-ov-objname", m.objective !== "" ? `${m.name}: ${m.objective}` : m.name));
          text.appendChild(el("span", "app-cp-ov-objnums", `Plan ${m.plan !== "" ? m.plan : "—"} · Actual ${m.actual !== "" ? m.actual : "—"}`));
          row.append(box, light, text);
          box.addEventListener("change", () => {
            const rest = live.objectives.filter((o) => !(o.initiativeId === c.initiativeId && o.metricKey === m.key));
            live.objectives = box.checked ? [...rest, { initiativeId: c.initiativeId, metricKey: m.key }] : rest;
            box.disabled = true;
            void (async () => {
              await savePriority(live, ctx.data());
              await ctx.changed();
              box.disabled = false;
            })();
          });
          body.appendChild(row);
        }
      }
    } else if (tab === "commentary" && primary !== null) {
      const host = el("div", "app-cp-ov-charter");
      body.appendChild(host);
      void mountPrimaryCommentary(host, primary.id, ctx.actor(), live.id, ctx.settings.status.recencyDays, () => void ctx.initiativesChanged());
    } else if (tab === "actions") {
      // the action card the boards use (issues 5 and 11, 2026-11-16) —
      // List | Kanban | Gantt, the full dialog, Add action — over every
      // initiative's actions, a heading per initiative
      const g = ctx.ganttFor(live);
      if (g.initiatives.length === 0) {
        body.appendChild(el("div", "app-cp-muted", "No initiatives linked yet — their actions show here."));
      } else {
        const host = el("div", "app-cp-ov-gantthost app-cp-ov-actionshost");
        body.appendChild(host);
        void import("./actionsTab").then((m) => {
          if (!host.isConnected) return;
          m.mountPriorityActions({
            host,
            initiatives: g.initiatives,
            actions: g.actions,
            roster: ctx.roster,
            palette: ctx.palette,
            edgeColour: (i) => ctx.stateColour(g.stateFor(i)),
            actor: ctx.actor(),
            // an edit leaves the tallies on the other tabs stale; the
            // screen reloads when this tab is left, not under the editor
            onWritten: () => {
              actionsTouched = true;
            },
            onOpenBoard: (boardId) => {
              rememberBoardOrigin("#/priorities", live.id);
              close();
              window.location.hash = `#/board/${boardId}`;
            },
          });
        });
      }
    } else if (tab === "cascade") {
      const ln = el("div", "app-cp-ov-cascadebody");
      const parent = live.parentId !== "" ? data.priorities.find((x) => x.id === live.parentId) : undefined;
      if (parent) {
        const prow = btn(`↑ ${orgName(parent.org)} (customised from)`, "app-cp-ov-link");
        prow.title = parent.statement;
        prow.addEventListener("click", () => {
          close();
          ctx.open(parent);
        });
        ln.appendChild(prow);
      } else {
        ln.appendChild(el("div", "app-cp-muted", "Set here — not cascaded from above."));
      }
      // re-parenting after the fact (2026-10-02): a junior org's own
      // priority that turns out to serve a senior or peer one
      if (can && live.status === "active") {
        const cands = parentCandidates(live, data.priorities);
        const row = el("div", "app-cp-ov-relink");
        const pick = btn(parent ? "Change parent…" : "Link to a parent priority…", "app-cp-ov-link");
        pick.disabled = cands.length === 0;
        pick.title = cands.length === 0 ? "No active priority above or beside this org to link to" : "Make this priority part of one set above or beside this org";
        pick.addEventListener("click", () => {
          void pickParent(ctx, live, cands, parent ?? null).then(async (r) => {
            if (r === null) return;
            if (r.takePillar) live.pillarId = r.parent.pillarId;
            await relinkParent(live, r.parent, ctx.data(), ctx.actor());
            await ctx.changed();
            events = null;
            if (scrim.isConnected) paint();
          });
        });
        row.appendChild(pick);
        if (parent) {
          const un = btn("Unlink", "app-cp-ov-link");
          un.title = `Stand alone again — no longer part of ${orgName(parent.org)}'s priority`;
          un.addEventListener("click", () => {
            void promptConfirm({
              title: "Unlink from the parent priority?",
              note: `“${live.statement.slice(0, 80)}” stops counting under ${orgName(parent.org)}'s “${parent.statement.slice(0, 60)}”. History keeps the link.`,
              confirmLabel: "Unlink",
            }).then(async (yes) => {
              if (!yes) return;
              await relinkParent(live, null, ctx.data(), ctx.actor());
              await ctx.changed();
              events = null;
              if (scrim.isConnected) paint();
            });
          });
          row.appendChild(un);
        }
        ln.appendChild(row);
      }
      const mine = data.assignments.filter((a) => a.priorityId === live.id);
      if (mine.length > 0) {
        const ul = el("div", "app-cp-ov-children");
        for (const a of mine) {
          const glyph = a.status === "accepted" || a.status === "completed" ? "✓" : a.status === "proposed" ? "⏳" : a.status === "onhold" ? "⏸" : "✕";
          const child = a.childPriorityId !== "" ? data.priorities.find((x) => x.id === a.childPriorityId) : undefined;
          const row = el("div", "app-cp-ov-child" + (a.status === "rejected" ? " app-cp-lineage-declined" : ""));
          // the design's grammar: "↓ Org ✓" · "↓ Org ⏳ pending" · "↓ Org ✕ declined — “…”"
          let text = `↓ ${orgName(a.org)} ${glyph}`;
          if (a.status === "rejected") text = `↓ ${orgName(a.org)} ✕ declined${a.reason !== "" ? ` — “${a.reason}”` : ""}`;
          else if (a.status === "onhold") text = `↓ ${orgName(a.org)} ⏸ parked${a.reason !== "" ? ` — “${a.reason}”` : ""}`;
          else if (child) text = `↓ ${orgName(a.org)} ✓ customised`;
          else if (a.status === "proposed") text = `↓ ${orgName(a.org)} ⏳ pending`;
          row.textContent = text;
          if (child) row.title = child.statement;
          if (child) {
            row.classList.add("app-cp-ov-link");
            row.addEventListener("click", () => {
              close();
              ctx.open(child);
            });
          }
          if (can && live.status === "active" && (a.status === "rejected" || a.status === "onhold")) {
            const resend = btn("Re-send", "app-cp-ov-link app-cp-ov-resend");
            resend.title = `Send this priority to ${orgName(a.org)} again for acceptance`;
            resend.addEventListener("click", (e) => {
              e.stopPropagation();
              void sendCascade(ctx, live, [a.org]).then(async () => {
                await ctx.changed();
                events = null;
                if (scrim.isConnected) paint();
              });
            });
            row.appendChild(resend);
          }
          ul.appendChild(row);
        }
        ln.appendChild(ul);
      }

      body.appendChild(ln);
    } else {
      if (events === null) {
        body.appendChild(el("div", "app-cp-muted", "Loading history…"));
        void listEvents(live).then((ev) => {
          events = ev;
          if (tab === "history" && scrim.isConnected) paint();
        });
      } else if (events.length === 0) {
        body.appendChild(el("div", "app-cp-muted", "No history yet."));
      } else {
        const ul = el("div", "app-cp-ov-events");
        for (const e of events) {
          const row = el("div", "app-cp-ov-event");
          row.appendChild(el("span", "app-cp-ov-event-when", e.at.slice(0, 10)));
          row.appendChild(el("span", "app-cp-ov-event-kind", e.kind));
          row.appendChild(el("span", "app-cp-ov-event-detail", eventWords(e)));
          row.appendChild(el("span", "app-cp-muted", e.actorName));
          ul.appendChild(row);
        }
        body.appendChild(ul);
      }
      if (live.notes !== "") body.appendChild(el("div", "app-cp-ov-notes", live.notes));
    }
    desk.appendChild(left);

  };

  const doClose = async (live: Priority, mode: "complete" | "archive") => {
    const r = await closeDialog(ctx.host, live, mode);
    if (!r) return;
    await closePriority(ctx, live, mode, r);
    events = null;
    if (scrim.isConnected) paint();
  };

  paint();
  return close;
}

/** Choose the parent for a priority: candidates grouped by org, the
 *  orgs above first (top down) then peers; a parent not live in the
 *  child's start period is offered with a note, not refused. */
function pickParent(
  ctx: LifecycleCtx,
  child: Priority,
  cands: Priority[],
  current: Priority | null
): Promise<{ parent: Priority; takePillar: boolean } | null> {
  return new Promise((resolve) => {
    const m = modal(ctx.host, current ? "Change parent priority" : "Link to a parent priority", `“${child.statement.slice(0, 100)}” becomes part of the priority you choose — it counts in that priority's roll-up and shows under it on the Cascade tab.`, true);
    const chain = orgPath(child.org).map(orgKey);
    const groups = new Map<string, Priority[]>();
    for (const c of cands) {
      const k = orgKey(c.org);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(c);
    }
    const keys = [...groups.keys()].sort((a, b) => {
      const ia = chain.indexOf(a);
      const ib = chain.indexOf(b);
      if (ia >= 0 && ib >= 0) return ia - ib;
      if (ia >= 0 || ib >= 0) return ia >= 0 ? -1 : 1;
      return a.localeCompare(b);
    });
    let chosen: Priority | null = null;
    const list = el("div", "app-cp-cascade");
    const rows: { b: HTMLButtonElement; p: Priority }[] = [];
    const paint = () => {
      for (const r of rows) r.b.classList.toggle("app-cp-reason-on", chosen?.id === r.p.id);
      pillarRow.style.display = chosen && chosen.pillarId !== child.pillarId ? "" : "none";
      ok.disabled = chosen === null || chosen.id === current?.id;
    };
    for (const k of keys) {
      const items = groups.get(k)!;
      const org = items[0].org;
      const isPeer = chain.indexOf(k) < 0;
      list.appendChild(el("div", "app-cp-menu-h", `${orgName(org)}${orgLevel(org) === "company" ? " (company)" : ""}${isPeer ? " · peer" : ""}`));
      for (const p of items.sort((a, b) => a.statement.localeCompare(b.statement))) {
        const b = btn(p.statement.slice(0, 110), "app-cp-reason app-cp-parentopt");
        if (!priorityLiveIn(ctx.settings.period, p, child.period)) b.textContent += ` · not live in ${child.period}`;
        if (p.id === current?.id) b.textContent += " · current parent";
        b.addEventListener("click", () => {
          chosen = p;
          paint();
        });
        rows.push({ b, p });
        list.appendChild(b);
      }
    }
    m.body.appendChild(list);
    const pillarRow = el("label", "app-check") as HTMLLabelElement;
    const takePillar = el("input") as HTMLInputElement;
    takePillar.type = "checkbox";
    takePillar.checked = child.pillarId === "";
    pillarRow.append(takePillar, document.createTextNode(" Also take the parent's sub-pillar (moves this priority to that column)"));
    m.body.appendChild(pillarRow);
    const done = (v: { parent: Priority; takePillar: boolean } | null) => {
      m.close();
      resolve(v);
    };
    const cancel = btn("Cancel", "app-link");
    cancel.addEventListener("click", () => done(null));
    const ok = btn("Link", "app-btn app-btn-primary");
    ok.addEventListener("click", () => {
      if (chosen === null) return;
      done({ parent: chosen, takePillar: takePillar.checked });
    });
    m.footer.append(cancel, ok);
    paint();
  });
}

function eventWords(e: PriorityEvent): string {
  const d = e.detail;
  const str = (k: string) => (typeof d[k] === "string" ? (d[k] as string) : "");
  switch (e.kind) {
    case "created":
      return str("customisedFrom") !== "" ? "created as a customised copy" : "created";
    case "edited":
      return str("keptAfterParentClosed") !== "" ? `kept after parent closed — “${str("keptAfterParentClosed")}”` : str("to") !== "" ? `statement → “${str("to")}”` : "properties changed";
    case "cascaded":
      return Array.isArray(d.to) ? `${d.resent === true ? "re-sent" : "sent"} to ${(d.to as string[]).join(", ")}` : "sent";
    case "accepted":
      return `${str("org")} accepted as-is`;
    case "customised":
      return `${str("org")} accepted and customised — “${str("statement")}”`;
    case "held":
      return `${str("org")} parked — “${str("reason")}”`;
    case "rejected":
      return `${str("org")} declined — “${str("reason")}”`;
    case "completed":
    case "archived":
      return `${str("reason")}${str("note") !== "" ? " — " + str("note") : ""}`;
    case "carriedForward":
      return str("toPeriod") !== "" ? `carried to ${str("toPeriod")}` : `carried from ${str("fromPeriod")}`;
    case "linked":
      return str("child") !== "" ? `${str("org")} linked “${str("statement")}” under this priority` : `linked under ${str("org")}'s “${str("statement")}”`;
    case "unlinked":
      return str("child") !== "" ? `${str("org")}'s priority unlinked from this one` : `unlinked from ${str("org")}'s priority`;
    case "reopened":
      return `reopened (was ${str("from")})`;
    case "reordered":
      return `moved to position ${String(d.to ?? "")}`;
    case "pulled":
      return `${str("org")} pulled it and adopted it as-is`;
    case "dropped":
      return `${str("org")} dropped it — “${str("reason")}”`;
    case "proposed":
      return str("pulled") !== "" ? `proposed for ${str("org")} (a pull, waiting to be accepted)` : str("back") !== "" ? "moved back to proposed" : str("again") !== "" ? "proposed again" : str("customisedFrom") !== "" ? "proposed as a customised copy" : "proposed";
    case "approved":
      return "accepted";
    case "declined":
      return `declined — “${str("reason")}”`;
    default:
      return "";
  }
}
