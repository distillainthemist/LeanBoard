// Cascaded priorities — the screen (design spec `leanboard-cascade-
// priorities-design.md`, build item 1 = the Simple-view spine, plus the
// add/edit priority dialog pulled forward from item 2 so the matrix can be
// filled and tested). Rides as a hub tab like Documents (dynamic import).
//
// Screen anatomy top to bottom: org bar (plain crumbs, one ▾ popover on
// the current node: Switch · Descend · Browse all…) → toolbar (period · status · Simple/Dynamic ·
// cascade chip · ＋ Priority · ⋮ view options) → vision band (directly
// over the pillars) → the matrix (rail: "Strategic Pillars" over one
// rectangle per pillar spanning its sub-pillar columns, settings order;
// "Priorities" row; "Objectives" row) → the Other strip.
// Density: ≤4 comfortable · 5–6 compact · 7+ scroll (or group by pillar).
// Phone (<720px): sub-pillar headings with their cards stacked.
//
// P1 renders statuses from a stub resolver (no initiatives yet): every
// priority is grey with "· 0 initiatives" and every objective cell reads
// "No metric set". The detail overlay, cascade review list, close /
// carry-forward flows live in lifecycle.ts (P2); P3 adds the Dynamic
// view — built (P3), persists per user per org via prefs.ts; P4 adds TV
// walk mode + the embedded card.

import { mountOrgCascade } from "./orgCascade";
import { changeVersion } from "../store/changes";
import { el, clear } from "../../../shared/ui/dom";
import { paletteMap } from "../../../shared/palette";
import { todayIso } from "../../../shared/schema/id";
import { openOwn } from "./actionsTabModel";
import { showLoading } from "../loading";
import { promptChoice } from "../prompts";
import { currentViewer } from "../runtime";
import {
  allSitePrioritySettings,
  appPalettes,
  orgJson,
  orgOwnersMap,
  orgVisions,
  prioritySettingsJson,
  saveOrgVision,
  siteCompanies,
} from "../store/config";
import { listPeople, managerOf } from "../store/people";
import { directoryRoad } from "../people/directoryAdd";
import { effectivePerson } from "../viewAs";
import type { RosterPerson } from "../store/mappers";
import {
  appendEvent,
  CascadeData,
  loadCascade,
  newPriority,
  savePriority,
} from "../store/priorities";
import { PHONE_WINDOW_QUERY, isPhoneWindow } from "../phone";
import {
  buildTree,
  CascadeTarget,
  childOrgs,
  orgSelectOptions,
  editVision,
  field,
  modal,
  requiredStar,
  OrgTree,
  pickOrg,
  priorityDialog,
  siblingOrgs,
  orgInTree,
} from "./dialogs";
import { loadPriorityPrefs, savePriorityPrefs, ViewMode } from "./prefs";
import { prioritiesView, rememberPriorities, rememberShared, sharedView } from "../sessionView";
import { mountWalk } from "./walk";
import { rememberSummary, summaryView } from "../sessionView";
import { prioritiesViewUrl, takePendingPrioritiesView } from "../links";
import { decodePrioritiesView, encodePrioritiesView } from "./viewLink";
import { cascadeDialog, cascadeReview, closeDialog, closePriority, LifecycleCtx, moveBackToProposed, openPriorityOverlay, pullFromAbove, reopenPriority, sendCascade } from "./lifecycle";
import { Initiative, adminScopeFor, initiativesByPriority, ownersLabel, ownersTitle, statusOf } from "../improvement/initiativeModel";
import { actionCounts, actionCountsFor, PriorityOwn, PriorityOwnAt, PriorityState, priorityStatus, PriorityStatus, statusColour, StatusResult } from "../improvement/status";
import { ownBelow } from "./ownBelow";
import { priorityKey } from "../../../shared/schema/actionLinks";
import type { LtkAction } from "../../../shared/schema/actions";
import { priorityCounts, statusLegend } from "../improvement/statusUi";
import { objectiveCharts } from "../improvement/initiativeRow";
import { offerStepMessage } from "./stepMessage";
import { REOPEN_PRIORITY_KEY } from "../improvement/boardOrigin";
import { PDCA_TOKENS } from "../improvement/templateModel";
import { buildMetricState, loadMetricLasts, loadOwnMetricLasts, ownMetricValues, statusMetricsOf } from "../improvement/metricValues";
import type { DriverLast, MetricValue } from "../improvement/metricValues";
import {
  canApproveAt,
  canCustomiseAt,
  comparePeriods,
  liveThen,
  moveFrom,
  pillarIdIn,
  pillarVersions,
  placedIn,
  prevPeriod,
  canLinkInitiative,
  countedDescendants,
  canManageOrg,
  densityFor,
  groupByColumn,
  livePrimaryId,
  objectiveValues,
  stalePrimary,
  isDescendant,
  objectiveColumns,
  periodsOnOffer as periodsOffered,
  pillarsLiveIn,
  priorityLiveIn,
  reviewDue,
  OrgRef,
  orgKey,
  orgFromKey,
  orgLevel,
  orgName,
  orgParent,
  orgPath,
  orgRef,
  parentClosed,
  parsePrioritySettings,
  parseSiteCascadeSettings,
  pendingCascades,
  PriorityAssignment,
  isPulledProposal,
  orphansOf,
  reviewQueue,
  waitingAt,
  periodFor,
  Pillar,
  pillarSpans,
  Priority,
  prioritiesForOrg,
  PrioritySettings,
  Rag,
  ragPaletteKey,
  healthChipStale,
  isDeclined,
  sameOrg,
  strategyChips,
  Viewer,
} from "./model";

export interface PrioritiesMountOpts {
  embedded?: boolean;
  /** Embedded ritual card (§8): a fixed org (blank parts fall back to the
   *  viewer's site), optional pillar filter by name, view mode, and the
   *  meeting's period. `mode: "tile"` = compact displayed matrix; "focused"
   *  = opens the walk at step 1 with ⊞ All objectives returning to the
   *  matrix. Card mounts never persist prefs. */
  card?: {
    mode: "tile" | "focused";
    org?: Partial<OrgRef>;
    pillarName?: string;
    /** Rotation focus (P4): pillar / sub-pillar ids in focus for this
     *  occurrence's topic; wins over pillarName. */
    focus?: string[];
    /** The occurrence's rotation topic, shown in the presentation title. */
    topic?: string;
    view?: ViewMode;
    /** The meeting's date (ISO) — the period is derived from it. */
    periodDate?: string;
    /** Receives the tile snapshot SVG after each paint (§8). */
    onSnapshot?: (svg: string) => void;
  };
}

const esc = (t: string): string => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Tile snapshot (§8): vision band, objective headings and status edges
 *  only — no metric text, unreadable at tile size. Pure. */
export function prioritiesSnapshotSvg(
  title: string,
  vision: string,
  columns: { name: string; color: string; edges: string[] }[]
): string {
  const W = 480;
  const H = 320;
  const n = Math.max(1, Math.min(columns.length, 6));
  const gap = 8;
  const left = 16;
  const colW = (W - left * 2 - gap * (n - 1)) / n;
  const parts: string[] = [];
  parts.push(`<rect width="${W}" height="${H}" fill="#ffffff"/>`);
  parts.push(`<text x="16" y="30" font-size="18" font-weight="600" fill="#111" font-family="system-ui, sans-serif">${esc(title.slice(0, 44))}</text>`);
  parts.push(`<rect x="16" y="44" width="${W - 32}" height="34" rx="6" fill="${vision !== "" ? "#26241f" : "#f4f1ea"}"/>`);
  parts.push(
    `<text x="${W / 2}" y="66" text-anchor="middle" font-size="13" font-weight="600" fill="${vision !== "" ? "#fff" : "#8b8478"}" font-family="system-ui, sans-serif">${esc((vision || "No vision statement set").slice(0, 70))}</text>`
  );
  columns.slice(0, 6).forEach((c, i) => {
    const x = left + i * (colW + gap);
    parts.push(`<rect x="${x}" y="92" width="${colW}" height="40" rx="5" fill="${esc(c.color || "#6d675c")}"/>`);
    const words = c.name.split(/\s+/);
    const l1 = words.slice(0, 2).join(" ");
    const l2 = words.slice(2, 4).join(" ");
    parts.push(`<text x="${x + 6}" y="${l2 ? 108 : 116}" font-size="11" font-weight="700" fill="#fff" font-family="system-ui, sans-serif">${esc(l1.slice(0, 16))}</text>`);
    if (l2) parts.push(`<text x="${x + 6}" y="122" font-size="11" font-weight="700" fill="#fff" font-family="system-ui, sans-serif">${esc(l2.slice(0, 16))}</text>`);
    c.edges.slice(0, 5).forEach((edge, j) => {
      const y = 142 + j * 32;
      parts.push(`<rect x="${x}" y="${y}" width="${colW}" height="26" rx="4" fill="#faf8f4" stroke="#e4dfd6"/>`);
      parts.push(`<rect x="${x}" y="${y}" width="4" height="26" rx="2" fill="${esc(edge || "#9a948a")}"/>`);
    });
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">${parts.join("")}</svg>`;
}

/**
 * Short-lived memo for the screen's boot reads. The board grid re-renders
 * live tiles often and each render remounts the Priorities card; without
 * this every remount refetched seven tables and sat on a spinner. 60s
 * bounds staleness; every write goes through `reload`, which refreshes
 * the cascade entry, so the tab still sees its own changes at once.
 */
const MEMO_TTL_MS = 60_000;
const memoMap = new Map<string, { at: number; ver: number; value: Promise<unknown> }>();
/** The change topic a memo key depends on (a write bumps it — see
 *  store/changes.ts — and the next hit reloads instead of serving stale). */
const MEMO_TOPIC: Record<string, string> = { initiatives: "initiatives", initActions: "initiatives", initBoards: "initiatives", initRows: "initiatives", roster: "people" };
function memo<T>(key: string, load: () => Promise<T>): Promise<T> {
  const topic = MEMO_TOPIC[key] ?? "";
  const ver = topic !== "" ? changeVersion(topic) : 0;
  const hit = memoMap.get(key);
  if (hit && hit.ver === ver && Date.now() - hit.at < MEMO_TTL_MS) return hit.value as Promise<T>;
  const value = load();
  memoMap.set(key, { at: Date.now(), ver, value });
  value.catch(() => memoMap.delete(key));
  return value;
}
function memoSet<T>(key: string, v: T): void {
  memoMap.set(key, { at: Date.now(), ver: 0, value: Promise.resolve(v) });
}

interface ScreenState {
  org: OrgRef;
  l1: string | null; // pillar filter (chip)
  focus: string[] | null; // rotation focus set (card) — wins over l1
  period: string;
  status: "active" | "completed" | "all";
  showOther: boolean;
  groupByPillar: boolean;
  showHealth: boolean; // health-check score chips on the sub-pillar headers (kebab, default off)
  lastColumn: string; // the sub-pillar last interacted with (＋ Priority preselect)
  view: ViewMode; // Simple (default, TV) | Dynamic — persists per user per org
}

/** The status of every initiative counted under a priority — its own
 *  and those of its counted descendants, each once (the status rule,
 *  improvement/status.ts). Confidential ones count; their rows hide. */
function makeStatusesFor(
  byPriority: Map<string, Initiative[]>,
  allPriorities: () => Priority[],
  statusOfInitiative: (i: Initiative) => StatusResult
): (p: Priority) => StatusResult[] {
  return (p) => {
    const ids = [p, ...countedDescendants(p, allPriorities())].map((x) => x.id);
    const seen = new Set<string>();
    const out: StatusResult[] = [];
    for (const id of ids) {
      for (const i of byPriority.get(id) ?? []) {
        if (seen.has(i.id)) continue;
        seen.add(i.id);
        out.push(statusOfInitiative(i));
      }
    }
    return out;
  };
}

/** The Proposed row: collapsed until the person opens it, for the session. */
/** The decision zone's rows (2026-11-18): open unless the person folds
 *  one, for the session. Proposed was folded by default until then. */
const zoneOpen = { proposed: true, cascaded: true, unplaced: true };

export function mountPriorities(parent: HTMLElement, opts: PrioritiesMountOpts = {}): () => void {
  const card = opts.card ?? null;
  // NB: "app-cp-cardmount", NOT "app-cp-card" — that class is the matrix's
  // priority card and gave the whole mount a bordered-card look (Ben, 2026-08-31)
  const wrap = el("div", "app-cp-wrap app-cp-tv" + (card ? ` app-cp-cardmount app-cp-cardmount-${card.mode}` : ""));
  parent.appendChild(wrap);
  const stopLoading = showLoading(wrap, false, card !== null);
  let dead = false;
  const cleanups: (() => void)[] = [];

  void (async () => {
    const who = currentViewer();
    const [rawTree, siteCo, roster, visions, settingsRaw, owners, palettes, prefs, siteCascade] = await Promise.all([
      memo("org", orgJson),
      memo("siteCo", siteCompanies),
      memo("roster", () => listPeople()),
      memo("visions", orgVisions),
      memo("settings", prioritySettingsJson),
      memo("owners", orgOwnersMap),
      memo("palettes", appPalettes),
      loadPriorityPrefs(who?.objectId ?? ""),
      memo("siteCascade", allSitePrioritySettings),
    ]);
    // the viewer's directory manager: a direct report of an org's owner
    // manages that org (issue round 2026-11-06); a failed lookup = ""
    const managerId = who?.objectId ? await managerOf(who.objectId).catch(() => "") : "";
    // initiatives + their actions + metric values (P6b/c): the tallies'
    // live inputs. A failure leaves the tallies grey, never blocks the matrix.
    // eslint-disable-next-line prefer-const
    let [initiativeList, initiativeActions, initBoards, initRows, priorityActions] = await Promise.all([
      memo("initiatives", () => import("../store/initiatives").then((m) => m.listInitiatives())).catch(() => []),
      memo("initActions", () => import("../store/actions").then((m) => m.actionsForInitiatives())).catch(() => []),
      memo("initBoards", () => import("../store/boards").then((m) => m.listBoards())).catch(() => []),
      memo("initRows", () => import("../store/cards").then((m) => m.rowsForInitiativeBoards())).catch(() => []),
      // the actions raised directly on priorities (2026-11-18)
      memo("priActions", () => import("../store/actions").then((m) => m.actionsForPriorities())).catch(() => [] as LtkAction[]),
    ]);
    const metricState = buildMetricState(initiativeList, initBoards, initRows, await loadMetricLasts(initiativeList, initBoards).catch(() => new Map()));
    if (dead) return;
    const companyList = [...new Set(Object.values(siteCo).filter((c) => c !== ""))];
    const tree = buildTree(rawTree, siteCo, companyList);
    // honour View as (a super admin previewing as a site admin or user)
    const stored = roster.find((p) => p.whoId === (who?.objectId ?? "")) ?? null;
    const me = stored ? effectivePerson(stored) : null;
    const viewer: Viewer = {
      whoId: who?.objectId ?? "",
      role: me?.role === "superadmin" || me?.role === "siteadmin" ? me.role : "user",
      site: me?.site ?? "",
      managerId,
    };
    const settings = parsePrioritySettings(settingsRaw);
    const palette = paletteMap(palettes.states);
    const today = todayIso();
    const currentPeriod = periodFor(settings.period, today);

    // default org = viewer's own site (under its company); else the first site
    // the person's own site, matched without regard to case; a site
    // with no company still resolves (issue 27, 2026-10-18 round)
    const mySite = (() => {
      const s = (me?.site ?? "").trim();
      if (s === "") return null;
      const coKey = Object.keys(siteCo).find((k) => k.toLowerCase() === s.toLowerCase());
      return orgRef(coKey !== undefined ? siteCo[coKey] : "", coKey ?? s);
    })();
    const firstSite = tree.companies.flatMap((c) => c.sites.map((s) => orgRef(c.name, s.name)))[0] ?? orgRef(companyList[0] ?? "");
    // card: the configured org, blank parts falling back to the viewer's
    // site (the board's own org is what the card is normally set to)
    const cardOrg = (): OrgRef | null => {
      if (!card) return null;
      const site = card.org?.site ?? mySite?.site ?? "";
      const company = card.org?.company ?? (site !== "" ? (siteCo[site] ?? "") : (mySite?.company ?? companyList[0] ?? ""));
      return orgRef(company, site, card.org?.department ?? "", card.org?.area ?? "");
    };
    // a shared view link (Ben, 2026-10-07) sets the opening state once
    const linkView = card ? null : decodePrioritiesView(takePendingPrioritiesView());
    const linkOrg = linkView && linkView.org !== "" ? orgFromKey(linkView.org) : null;
    // the person's site at app START (Ben, 2026-10-19: a remembered org
    // used to win across sessions and pinned whatever the screen first
    // opened on) — and, within the session, where they last were (Ben,
    // 2026-11-16, issue 9: going to an initiative and back threw the
    // site and the year away). sessionView.ts holds it; a card mount
    // neither reads nor writes it.
    const session = card ? null : sharedView();
    const sessionOrg = session?.org ? orgFromKey(session.org) : null;
    const sessionPri = card ? null : prioritiesView();
    const startOrg = cardOrg() ?? linkOrg ?? (sessionOrg && orgInTree(tree, sessionOrg) ? sessionOrg : null) ?? mySite ?? firstSite;
    const cardL1 = card?.pillarName ? (data0Pillars: Pillar[]) => data0Pillars.find((x) => x.level === 1 && x.name.toLowerCase() === card.pillarName!.toLowerCase())?.id ?? null : null;
    const state: ScreenState = {
      org: startOrg,
      l1: sessionPri?.l1 ?? null,
      focus: card?.focus && card.focus.length > 0 ? card.focus : null,
      period: session?.period ?? currentPeriod,
      status: sessionPri?.status ?? "active",
      showOther: prefs.showOther,
      groupByPillar: prefs.groupByPillar,
      showHealth: prefs.showHealth,
      lastColumn: "",
      view: card?.view ?? (prefs.viewByOrg[orgKey(startOrg)] ?? "simple"),
    };
    if (card?.periodDate) state.period = periodFor(settings.period, card.periodDate) || currentPeriod;
    if (linkView) {
      if (linkView.period !== "") state.period = linkView.period;
      if (linkView.status !== "") state.status = linkView.status;
      if (linkView.view !== "") state.view = linkView.view;
      if (linkView.l1 !== "") state.l1 = linkView.l1;
      if (linkView.focus.length > 0) state.focus = linkView.focus;
      if (linkView.showOther !== null) state.showOther = linkView.showOther;
      if (linkView.groupByPillar !== null) state.groupByPillar = linkView.groupByPillar;
    }
    const persist = () => {
      if (card) return; // card mounts never touch the person's prefs
      prefs.showOther = state.showOther;
      prefs.groupByPillar = state.groupByPillar;
      prefs.showHealth = state.showHealth;
      if (state.view === "dynamic") prefs.viewByOrg[orgKey(state.org)] = "dynamic";
      else delete prefs.viewByOrg[orgKey(state.org)];
      savePriorityPrefs(viewer.whoId, prefs);
    };

    const byPriority = initiativesByPriority(initiativeList);
    // the status rule (2026-11-17): one initiative's status from its
    // flag, its actions, EVERY metric and its two clocks; a priority's
    // from its initiatives. Every painter below asks these two.
    const statusOfInitiative = (i: Initiative): StatusResult => statusOf(i, initiativeActions, statusMetricsOf(metricState.get(i.id)), settings.status, today);
    const statusesFor = makeStatusesFor(byPriority, () => data.priorities, statusOfInitiative);
    /** The key of an action raised on `p` at the org in view: a priority
     *  adopted as-is is one row at several orgs, and an action raised on
     *  it shows only where it was raised (Ben, 2026-11-18). */
    /** Where an action on `p` is raised from this board: the org in view
     *  when it shows here ADOPTED, its own org otherwise. */
    const actionOrgOf = (p: Priority): OrgRef =>
      !sameOrg(p.org, state.org) && prioritiesForOrg(state.org, data.priorities, data.assignments).adopted.some((x) => x.id === p.id) ? state.org : p.org;
    const priorityActionKey = (p: Priority): string => priorityKey(p.id, orgKey(actionOrgOf(p)));
    const priorityActionsOf = (p: Priority): LtkAction[] => {
      const key = priorityActionKey(p);
      return priorityActions.filter((a) => a.instanceId === key);
    };
    // metrics defined ON a priority (2026-11-18): their last readings,
    // keyed `<priorityId>|<metricKey>`, read once per metric
    const ownLasts = new Map<string, DriverLast>();
    const ownAsked = new Set<string>();
    const loadOwnLasts = async (list: Priority[], again = false): Promise<void> => {
      const items = list
        .map((p) => ({ id: p.id, site: p.org.site, metrics: (p.ownMetrics ?? []).filter((m) => again || !ownAsked.has(`${p.id}|${m.key}`)) }))
        .filter((x) => x.metrics.length > 0);
      if (items.length === 0) return;
      for (const x of items) for (const m of x.metrics) ownAsked.add(`${x.id}|${m.key}`);
      const got = await loadOwnMetricLasts(items).catch(() => new Map<string, DriverLast>());
      for (const x of items) {
        for (const m of x.metrics) {
          const k = `${x.id}|${m.key}`;
          const v = got.get(k);
          if (v) ownLasts.set(k, v);
          else ownLasts.delete(k);
        }
      }
    };
    const ownValuesOf = (p: Priority): MetricValue[] => ownMetricValues(p.id, p.ownMetrics ?? [], ownLasts);
    /** What a priority carries of its own: its actions here and its own
     *  metrics. Both count toward its status. */
    const ownOf = (p: Priority): PriorityOwn => ({ actions: actionCounts(priorityActionsOf(p), today), metrics: ownValuesOf(p).map((v) => ({ name: v.name, rag: v.rag })) });
    /** What counts from BELOW it (programme C1, 2026-11-24): the late
     *  actions and off-plan metrics of the priorities cascaded from it.
     *  They still show only where they were raised. */
    const belowOf = (p: Priority): PriorityOwnAt[] =>
      ownBelow({
        p,
        view: actionOrgOf(p),
        all: data.priorities,
        assignments: data.assignments,
        actions: priorityActions,
        metricsOf: (x) => ownValuesOf(x).map((v) => ({ name: v.name, rag: v.rag })),
        today,
      });
    const pStatus = (p: Priority): PriorityStatus => priorityStatus(statusesFor(p).map((x) => x.state), ownOf(p), belowOf(p));
    /** Org managers only, on an active priority (decision 3). */
    const canRaiseOn = (p: Priority): boolean => p.status === "active" && viewer.whoId !== "" && canManageOrg(viewer, actionOrgOf(p), owners);
    /** Raise an action on `p` from its tile's ⋮. */
    const addActionTo = (p: Priority) => void import("./priorityActions").then((m) => m.raisePriorityAction(ctx, p));
    const stateHex = (st: PriorityState): string => statusColour(st, settings.status, palette);
    /** An initiative write from the popup (issue 32): re-read the list
     *  and refill the SAME map, so every closure over it sees the change. */
    const reloadInitiatives = async () => {
      const fresh = await import("../store/initiatives").then((m) => m.listInitiatives()).catch(() => null);
      if (dead || fresh === null) return;
      initiativeList = fresh;
      memoSet("initiatives", fresh);
      byPriority.clear();
      for (const [k, v] of initiativesByPriority(fresh)) byPriority.set(k, v);
      render();
    };
    let data: CascadeData = await memo(`cascade|${state.org.company}`, () => loadCascade(state.org.company));
    await loadOwnLasts(data.priorities);
    if (dead) return;
    stopLoading();
    if (cardL1) state.l1 = cardL1(data.pillars);
    // a remembered pillar filter from another company's set means nothing here
    else if (state.l1 !== null && !data.pillars.some((x) => x.id === state.l1)) state.l1 = null;

    /** The nearest scrolling ancestor — closing the overlay / repainting
     *  after a write must land where the user was (§13). */
    const scroller = (): Element => {
      let n: HTMLElement | null = wrap.parentElement;
      while (n) {
        const o = getComputedStyle(n).overflowY;
        if ((o === "auto" || o === "scroll") && n.scrollHeight > n.clientHeight) return n;
        n = n.parentElement;
      }
      return document.scrollingElement ?? document.documentElement;
    };
    const reload = async () => {
      const sc = scroller();
      const top = sc.scrollTop;
      data = await loadCascade(state.org.company);
      memoSet(`cascade|${state.org.company}`, data);
      // a metric defined since the last read: its readings
      await loadOwnLasts(data.priorities);
      if (dead) return;
      render();
      sc.scrollTop = top;
    };

    const canManage = () => canManageOrg(viewer, state.org, owners);
    /** May the viewer ACCEPT what lands on this org's board (issue 13)?
     *  Its owner or an admin — not the owner's direct reports, whose own
     *  additions and pulls wait as proposals. */
    const canApprove = (org: OrgRef) => canApproveAt(viewer, org, owners);
    // the year picker is a LENS over spans (2026-10-02): every period from
    // the earliest start to the later of next period and the latest end
    const periodsOnOffer = () =>
      periodsOffered(
        settings.period,
        currentPeriod,
        data.priorities.map((p) => ({ start: p.period, end: p.toPeriod, planned: p.plannedEnd }))
      );
    /** The pillars in force in the viewed period — chips and columns. */
    const livePillars = () => pillarsLiveIn(settings.period, data.pillars, state.period);
    /** The sub-pillar a priority sits under in the YEAR BEING VIEWED
     *  (issue 4, 2026-11-16): its own earlier homes, and the version of
     *  the pillar in force that year. Every column grouping asks this. */
    const colOf = (p: Priority): string => pillarIdIn(settings.period, p, state.period, data.pillars);
    /** A pillar filter or a card's rotation focus names a pillar ROW; in
     *  a year where that row's successor (or predecessor) is the one in
     *  force, the filter follows it. */
    const liveVersion = (id: string): string => {
      const live = livePillars();
      if (live.some((x) => x.id === id)) return id;
      return pillarVersions(id, data.pillars).find((v) => live.some((x) => x.id === v.id))?.id ?? id;
    };
    const focusNow = (): string | string[] | null => (state.focus ? state.focus.map(liveVersion) : state.l1 !== null ? liveVersion(state.l1) : null);
    /** A year before this one is a RECORD: it shows what was live then,
     *  whatever has completed or been archived since. */
    const viewingPast = (): boolean => state.period !== "" && comparePeriods(settings.period, state.period, currentPeriod) < 0;

    /** The org's first owner from organisation settings (an area is
     *  governed by its department) — the default owner of a new
     *  priority there (Ben, 2026-10-02); null when none is set. */
    const ownerFor = (o: OrgRef): { whoId: string; who: string } | null => {
      const govern = orgLevel(o) === "area" ? { ...o, area: "" } : o;
      const first = owners[orgKey(govern)]?.[0];
      return first && first.whoId !== "" ? { whoId: first.whoId, who: first.who } : null;
    };
    const ownerNameFor = (o: OrgRef) => ownerFor(o)?.who ?? "";
    /** The owner picker for a priority at `o` (Ben, 2026-10-02): the
     *  org's owner and its immediate children's owners first, the
     *  roster behind a search, and the directory behind that — a
     *  person found there is added to the app (site and department
     *  from the org) and chosen in one step. */
    // the directory road (adding a person to the app) is for admins
    // only — the Users register's rule (Ben, 2026-10-02)
    const ownerPickerFor = (o: OrgRef) => ({
      suggested: [ownerFor(o), ...childOrgs(tree, o).map(ownerFor)].filter((p): p is { whoId: string; who: string } => p !== null),
      // the ONE directory road (people/directoryAdd.ts, issue 12): admins
      // only, a site admin's add pinned to their own site, nobody on the
      // roster overwritten, a revoked person not quietly restored
      directory: directoryRoad({ role: viewer.role, site: viewer.site ?? "" }, { site: o.site, department: o.department }, roster),
    });
    const actorRef = () => ({ whoId: viewer.whoId, who: me?.who ?? who?.name ?? "" });
    // ---- a priority's primary initiative and its objectives, as they
    // count NOW (issues 1 and 8, 2026-11-16) — the one road every reader
    // takes: the matrix, the walk, the poster, the dynamic card, the popup
    const primaryIdOf = (p: Priority): string => livePrimaryId(p, initiativeList);
    const valuesOf = (initiativeId: string) => metricState.get(initiativeId)?.values ?? [];
    const underPriority = (p: Priority, initiativeId: string): boolean =>
      [p, ...countedDescendants(p, data.priorities)].some((pr) => (byPriority.get(pr.id) ?? []).some((i) => i.id === initiativeId));
    const objectivesOf = (p: Priority) => objectiveValues(p, primaryIdOf(p), valuesOf, (id) => underPriority(p, id), ownValuesOf(p));
    const ctx: LifecycleCtx = {
      host: wrap,
      data: () => data,
      tree,
      roster,
      settings,
      stateColour: stateHex,
      palette,
      actor: actorRef,
      canManage: (o) => canManageOrg(viewer, o, owners),
      canApprove,
      canLink: (p) => canLinkInitiative(viewer, p, owners, data.assignments),
      canCustomise: (o) => canCustomiseAt(o, parseSiteCascadeSettings(siteCascade[o.site] ?? "").customiseLevel),
      ownerNameFor,
      ownerFor,
      ownerPickerFor,
      periodsOnOffer: () => periodsOnOffer(),
      currentPeriod,
      statusesFor,
      statusOf: pStatus,
      own: {
        keyFor: priorityActionKey,
        orgNameFor: (p) => orgName(actionOrgOf(p)),
        all: priorityActions,
        of: priorityActionsOf,
        canRaise: canRaiseOn,
      },
      ownMetrics: {
        valuesOf: ownValuesOf,
        // the OWNING org's managers; an org that adopted it reads them
        canEdit: (p) => (p.status === "active" || p.status === "proposed") && viewer.whoId !== "" && canManageOrg(viewer, p.org, owners),
        refresh: async (p) => {
          await loadOwnLasts([data.priorities.find((x) => x.id === p.id) ?? p], true);
          if (!dead) render();
        },
      },
      primaryOf: (p) => {
        const id = primaryIdOf(p);
        const i = id !== "" ? initiativeList.find((x) => x.id === id) : undefined;
        return i ? { id: i.id, title: i.title, completed: i.status === "completed" } : null;
      },
      stalePrimaryOf: (p) => stalePrimary(p, initiativeList),
      metricChoicesFor: (p) => {
        const out: ReturnType<LifecycleCtx["metricChoicesFor"]> = [];
        const seen = new Set<string>();
        for (const pr of [p, ...countedDescendants(p, data.priorities)]) {
          for (const i of byPriority.get(pr.id) ?? []) {
            if (seen.has(i.id) || i.confidential) continue;
            seen.add(i.id);
            const metrics = valuesOf(i.id).map((v) => ({
              key: v.key,
              name: v.name,
              objective: v.objective,
              plan: v.target !== null ? `${v.target}${v.unit}` : "",
              actual: v.display,
              rag: v.rag,
              stale: v.stale,
            }));
            if (metrics.length > 0) out.push({ initiativeId: i.id, title: i.title, inheritedFrom: pr.id === p.id ? "" : orgName(pr.org), metrics });
          }
        }
        return out;
      },
      ganttFor: (p) => {
        const ids = new Set([p.id, ...countedDescendants(p, data.priorities).map((x) => x.id)]);
        const seen = new Set<string>();
        const inits: Initiative[] = [];
        for (const id of ids) {
          for (const i of byPriority.get(id) ?? []) {
            if (seen.has(i.id) || i.confidential) continue;
            seen.add(i.id);
            inits.push(i);
          }
        }
        const today = todayIso();
        return {
          initiatives: inits,
          actions: initiativeActions,
          stateFor: (i: Initiative) => statusOfInitiative(i).state,
        };
      },
      initiativesFor: (p) => {
        const today = todayIso();
        const ids = [p, ...countedDescendants(p, data.priorities)];
        const seen = new Set<string>();
        const out: ReturnType<LifecycleCtx["initiativesFor"]> = [];
        for (const pr of ids) {
          for (const i of byPriority.get(pr.id) ?? []) {
            if (seen.has(i.id)) continue;
            seen.add(i.id);
            const status = statusOfInitiative(i);
            const counts = actionCountsFor(i, initiativeActions, today);
            const stage = i.snapshot.stages.find((st) => st.id === i.stageId) ?? null;
            const tokens = stage ? PDCA_TOKENS[stage.pdca] : null;
            const visible =
              !i.confidential ||
              viewer.role !== "user" ||
              Object.values(i.roles).some((people) => people.some((x) => x.whoId === viewer.whoId)) ||
              canManageOrg(viewer, { company: i.org.company, site: i.org.site, department: i.org.department, area: i.org.area }, owners);
            out.push({
              id: i.id,
              title: i.title,
              stageName: i.singleAction ? "single action" : (stage?.name ?? ""),
              pdcaFg: tokens?.fg ?? "#6d675c",
              pdcaBg: tokens?.bg ?? "#ece8e0",
              stagePdca: i.singleAction ? "" : (stage?.pdca ?? ""),
              // every owner (issue 1, 2026-11-17: the popup's list still
              // read the first of several)
              ownerName: ownersLabel(i),
              ownerTitle: ownersTitle(i),
              orgName: pr.id === p.id ? "This org" : [i.org.department, i.org.area].filter((x) => x !== "").join(" · ") || i.org.site,
              open: counts.future + counts.late,
              overdue: counts.late,
              counts,
              status,
              flagNote: i.flagNote,
              metrics: valuesOf(i.id),
              boardId: i.boardId,
              inheritedFrom: pr.id === p.id ? "" : orgName(pr.org),
              confidentialHidden: !visible,
            });
          }
        }
        return out;
      },
      changed: reload,
      initiativeById: (id) => initiativeList.find((i) => i.id === id) ?? null,
      viewerAdminScope: adminScopeFor(viewer.role, viewer.site),
      initiativesChanged: reloadInitiatives,
      open: (p) => openOverlay(p),
    };
    const openOverlay = (p: Priority) => {
      // shown ADOPTED at the viewed org: its managers get Customise / Drop
      const adopted = !sameOrg(p.org, state.org) && prioritiesForOrg(state.org, data.priorities, data.assignments).adopted.some((x) => x.id === p.id);
      // …or it WAITS on this org (a cascade, a proposed pull): the answer
      // is given in the popup (2026-11-18 — it was a separate list)
      const waits = reviewQueue(state.org, data.assignments).some((a) => a.priorityId === p.id);
      openPriorityOverlay(ctx, p, (live) => void editPriority(live), adopted ? state.org : null, waits ? state.org : null);
    };

    // ---- the render -------------------------------------------------------

    // the executive summary: open or not, its step and its open cards are
    // the SESSION's (sessionView) — an initiative opened from a row comes
    // Back to the summary as it was left. A card mount keeps its own.
    const sessionSummary = card ? null : summaryView();
    let walkOpen = sessionSummary?.open ?? false;
    let walkStep = sessionSummary?.step ?? 0;
    const walkExpanded = new Set<string>(sessionSummary?.expanded ?? []);
    const rememberWalk = () => {
      if (!card) rememberSummary({ open: walkOpen, step: walkStep, expanded: [...walkExpanded] });
    };
    let closeWalk: (() => void) | null = null;
    // the phone (mobile review M3): the walk IS the view — the matrix
    // gave five pillars 50px each. A card mount keeps its own modes.
    const phone = () => card === null && isPhoneWindow();
    if (card === null && typeof window !== "undefined" && typeof window.matchMedia === "function") {
      const mq = window.matchMedia(PHONE_WINDOW_QUERY);
      const onChange = () => {
        if (!dead) render();
      };
      mq.addEventListener("change", onChange);
      cleanups.push(() => mq.removeEventListener("change", onChange));
    }
    /** A repaint keeps the priority popup up (Ben, 2026-10-19: starring
     *  a primary initiative closed it): the overlay's scrim lives in
     *  `wrap`, so it is lifted out before the clear and put back after. */
    const render = () => {
      // where the person is, for the session (sessionView.ts)
      if (!card) {
        rememberShared(orgKey(state.org), state.period);
        rememberPriorities({ status: state.status, l1: state.l1 });
      }
      const keep = Array.from(wrap.children).filter((c) => c.classList.contains("app-cp-scrim"));
      renderBody();
      for (const k of keep) wrap.appendChild(k);
    };
    const renderBody = () => {
      clear(wrap);
      persist();
      wrap.classList.toggle("app-cp-phone", phone());
      if (phone()) {
        renderPhone();
        return;
      }
      if (walkOpen) {
        renderWalk();
        return;
      }
      // ONE header (Ben, 2026-08-19: the presentation layout IS the view):
      // title with the clickable org chain, the cascade chip, ▶ Walk
      // through, ＋ Priority, ⋮ for everything else; then the vision band
      // directly over the pillars
      wrap.append(renderHeader(), renderVision());
      const columns = objectiveColumns(livePillars(), focusNow());
      if (state.groupByPillar && state.l1 === null && densityFor(columns.length) === "scroll") {
        for (const l1 of strategyChips(livePillars())) {
          const cols = objectiveColumns(livePillars(), l1.id);
          if (cols.length === 0) continue;
          wrap.appendChild(renderMatrix(cols, l1));
        }
      } else {
        wrap.appendChild(renderMatrix(columns, null));
      }
      const unplacedBand = renderUnplaced();
      if (unplacedBand) wrap.appendChild(unplacedBand);
      wrap.appendChild(renderOther());
      if (card?.onSnapshot) {
        const visible = visibleFor(state.org);
        const { byColumn } = groupByColumn(columns, visible, colOf);
        card.onSnapshot(
          prioritiesSnapshotSvg(
            `${orgName(state.org)} · ${state.period}`,
            visions[orgKey(state.org)] ?? "",
            columns.map((c) => ({
              name: c.name,
              color: c.color || data.pillars.find((x) => x.id === c.parentId)?.color || "",
              edges: (byColumn.get(c.id) ?? []).map((p) => stateHex(pStatus(p).state)),
            }))
          )
        );
      }
    };

    /** Presentation / tile bar: the org name at ×1.4, ▶ Walk, Exit presentation. */
    /** The header: "FY26 Cascaded Priorities | Company › Site ▾" (lead in
     *  the accent; ancestors click to go up, the current node's ▾ opens
     *  Switch · Descend · Browse all…), then the cascade chip, ▶ Walk
     *  through, ＋ Priority and ⋮. Cards: a Focus/All toggle instead. */
    /** The year control (issue 37, Ben 2026-10-19): ‹ FY26 ▾ › — the pill
     *  is filled when it IS the current year, tinted otherwise, with
     *  "Back to FY26" beside it; the menu lists every year on offer. */
    const renderYearControl = (): HTMLElement => {
      const ctl = el("span", "app-cp-yearctl");
      const offered = periodsOnOffer();
      const at = offered.indexOf(state.period);
      const step = (dir: -1 | 1, label: string, title: string) => {
        const b = el("button", "app-cp-yearstep", label) as HTMLButtonElement;
        b.type = "button";
        const to = at >= 0 ? (offered[at + dir] ?? "") : "";
        b.disabled = to === "";
        b.title = to === "" ? title : `${title}: ${to}`;
        b.addEventListener("click", () => {
          state.period = to;
          render();
        });
        return b;
      };
      const isCurrent = state.period === currentPeriod;
      const pill = el("button", "app-cp-yearpill" + (isCurrent ? "" : " app-cp-yearpill-off"), `${state.period} ▾`) as HTMLButtonElement;
      pill.type = "button";
      pill.title = isCurrent ? "The current year — pick another" : `Viewing ${state.period} — the current year is ${currentPeriod}`;
      pill.addEventListener("click", () => {
        document.querySelectorAll(".app-cp-menu").forEach((m) => m.remove());
        const menu = el("div", "app-cp-menu");
        menu.appendChild(el("div", "app-cp-menu-h", "Year"));
        for (const per of offered) {
          const b = el("button", "app-cp-menu-item app-cp-orgmenu-item", (state.period === per ? "● " : "○ ") + per) as HTMLButtonElement;
          b.type = "button";
          if (per === currentPeriod) b.appendChild(el("span", "app-cp-orgmenu-badge", "current"));
          b.addEventListener("click", () => {
            menu.remove();
            state.period = per;
            render();
          });
          menu.appendChild(b);
        }
        const r = pill.getBoundingClientRect();
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
        cleanups.push(() => menu.remove());
      });
      ctl.append(step(-1, "‹", "Earlier year"), pill, step(1, "›", "Later year"));
      if (!isCurrent) {
        const back = el("button", "app-link app-cp-yearback", `Back to ${currentPeriod}`) as HTMLButtonElement;
        back.type = "button";
        back.addEventListener("click", () => {
          state.period = currentPeriod;
          render();
        });
        ctl.appendChild(back);
      }
      return ctl;
    };

    const renderHeader = (): HTMLElement => {
      const bar = el("div", "app-cp-tvbar");
      const title = el("div", "app-cp-tvorg");
      if (card) title.appendChild(el("span", "app-cp-tvorg-lead", `${state.period} Cascaded Priorities`));
      else {
        title.appendChild(renderYearControl());
        title.appendChild(el("span", "app-cp-tvorg-lead", " Cascaded Priorities"));
      }
      title.appendChild(el("span", "app-cp-tvorg-sep", " | "));
      if (card) {
        title.appendChild(el("span", "app-cp-tvorg-chain", orgPath(state.org).map(orgName).join(" › ")));
        if (card.topic) title.appendChild(el("span", "app-cp-tvorg-topic", ` · ${card.topic}`));
      } else {
        const crumbs = el("span", "app-cp-crumbs app-cp-tvorg-chain");
        const path = orgPath(state.org);
        path.forEach((node, i) => {
          if (i > 0) crumbs.appendChild(el("span", "app-cp-crumb-sep", "›"));
          const last = i === path.length - 1;
          const b = el("button", "app-cp-crumb" + (last ? " app-cp-crumb-here" : ""), orgName(node) + (last ? " ▾" : "")) as HTMLButtonElement;
          b.type = "button";
          b.title = last ? "Switch, descend or browse" : `Go up to ${orgName(node)}`;
          b.addEventListener("click", () => {
            if (last) openOrgMenu(b);
            else void goTo(node);
          });
          crumbs.appendChild(b);
        });
        title.appendChild(crumbs);
      }
      bar.appendChild(title);
      if (card) {
        if (card.mode !== "tile" && card.focus && card.focus.length > 0) {
          const focused = state.focus !== null;
          const toggle = el("button", "app-btn app-cp-tvbtn", focused ? "⊞ All pillars" : "◎ Focus pillars") as HTMLButtonElement;
          toggle.type = "button";
          toggle.title = focused ? "Show every pillar" : card.topic ? `Back to the ${card.topic} focus` : "Back to the focused pillars";
          toggle.addEventListener("click", () => {
            state.focus = focused ? null : (card.focus ?? null);
            render();
          });
          bar.appendChild(toggle);
        }
        return bar;
      }
      // ONE chip for everything waiting on this org (2026-11-18): the
      // proposals raised from below and the cascades sent from above —
      // they were two chips, one opening a row and one a pop-up. It
      // takes the person to the zone at the foot of the page.
      const waiting = waitingHere();
      const awaiting = proposedFor(state.org).length + waiting.fromBelow.filter((a) => a.status === "proposed").length + waiting.fromAbove.filter((a) => a.status === "proposed").length;
      if (awaiting > 0) {
        const chip = el("button", "app-cp-cascadechip", `${awaiting} awaiting a decision`) as HTMLButtonElement;
        chip.type = "button";
        chip.title = "Priorities proposed to this org and cascades sent to it — shown at the foot of the page";
        chip.addEventListener("click", () => {
          zoneOpen.proposed = true;
          zoneOpen.cascaded = true;
          // a pillar filter would hide some of them
          state.l1 = null;
          render();
          wrap.querySelector(".app-cp-zonelabel")?.scrollIntoView({ block: "center", behavior: "smooth" });
        });
        bar.appendChild(chip);
      }
      // "Objectives": what the tiles carry, in view beside the button it
      // sits left of — a switch that changes what is on screen is never
      // hidden in a menu (it was the kebab's View choice)
      const objTog = el("label", "app-cp-objtoggle");
      const objSw = el("button", "app-tw-toggle" + (showObjectives() ? " app-tw-toggle-on" : "")) as HTMLButtonElement;
      objSw.type = "button";
      objSw.setAttribute("role", "switch");
      objSw.setAttribute("aria-checked", String(showObjectives()));
      objSw.title = showObjectives() ? "Hide the objectives on each priority" : "Show each priority's objectives as charts";
      objSw.appendChild(el("span", "app-tw-toggle-knob"));
      objSw.addEventListener("click", () => {
        state.view = showObjectives() ? "dynamic" : "simple";
        render();
      });
      objTog.append(objSw, el("span", undefined, "Objectives"));
      bar.appendChild(objTog);
      const walk = el("button", "app-btn app-cp-tvbtn", "▶ Executive summary") as HTMLButtonElement;
      walk.type = "button";
      walk.title = "One pillar at a time: each priority's status, initiatives and key metrics, with a final step for cascades to accept";
      walk.addEventListener("click", () => openWalk(0));
      bar.appendChild(walk);
      // the site's customisation floor gates authoring too (Ben, 2026-08-19):
      // below it an org only adopts what cascades down — no ＋ Priority
      if (canManage() && ctx.canCustomise(state.org)) {
        const add = el("button", "app-btn app-btn-primary app-cp-tvbtn", "＋ Priority") as HTMLButtonElement;
        add.type = "button";
        add.addEventListener("click", () => openAddMenu());
        bar.appendChild(add);
      } else if (canManage()) {
        const note = el("span", "app-cp-floor-note", "Adopts priorities from above");
        note.title = "This site's cascade setting keeps priorities at a higher level — this org accepts what cascades down rather than writing its own (Settings → Organisation → the site's Cascade customisation).";
        bar.appendChild(note);
        bar.appendChild(pullButton("app-btn app-cp-tvbtn"));
      }
      // the health check (decision 9): per SUB-PILLAR at this org, one at a
      // time — a picker of the org's sub-pillars with their last score
      if (canManage() && state.org.site !== "") {
        const hcHost = el("span", "app-cp-hchost");
        bar.appendChild(hcHost);
        void import("../health/entry").then(async ({ healthEnabled, latestFor }) => {
          if (!(await healthEnabled(state.org.site, "priorities")) || !hcHost.isConnected) return;
          const hb = el("button", "app-btn app-cp-tvbtn app-hc-btn", "Health check…") as HTMLButtonElement;
          hb.type = "button";
          hb.title = "A maturity check of one sub-pillar at this organisation";
          hb.addEventListener("click", () => {
            document.querySelectorAll(".app-cp-menu").forEach((m) => m.remove());
            const menu = el("div", "app-cp-menu");
            menu.appendChild(el("div", "app-cp-menu-h", `Sub-pillars at ${orgName(state.org)}`));
            const subs = objectiveColumns(livePillars(), null);
            if (subs.length === 0) menu.appendChild(el("div", "app-cp-menu-h", "No sub-pillars in this period"));
            for (const col of subs) {
              const b = el("button", "app-cp-menu-item", col.name) as HTMLButtonElement;
              b.type = "button";
              const scope = { type: "priorities" as const, site: state.org.site, pillarId: col.id, org: { ...state.org }, label: `${col.name} — ${orgName(state.org)}` };
              void latestFor(scope).then(({ today, latest }) => {
                const s = today ?? latest;
                if (s !== null && b.isConnected) b.appendChild(el("span", "app-cp-orgmenu-badge", `${s.status === "draft" ? "draft" : s.score.value === null ? "—" : s.score.value.toFixed(1)} · ${s.date.slice(5)}`));
              });
              b.addEventListener("click", () => {
                menu.remove();
                void import("../health/checkDialog").then(({ openHealthCheck }) =>
                  openHealthCheck({ host: wrap, scope, mayRun: canManage(), isAdmin: viewer.role !== "user", onChanged: () => render() })
                );
              });
              menu.appendChild(b);
            }
            const r = hb.getBoundingClientRect();
            menu.style.top = `${r.bottom + 4}px`;
            menu.style.left = `${Math.min(r.left, window.innerWidth - 300)}px`;
            document.body.appendChild(menu);
            const off = (e: PointerEvent) => {
              if (!menu.contains(e.target as Node)) {
                menu.remove();
                document.removeEventListener("pointerdown", off, true);
              }
            };
            setTimeout(() => document.addEventListener("pointerdown", off, true), 0);
            cleanups.push(() => menu.remove());
          });
          hcHost.appendChild(hb);
        });
      }
      const more = el("button", "app-btn app-cp-more app-cp-tvbtn", "⋮") as HTMLButtonElement;
      more.type = "button";
      more.title = "Status · view · roll-up rule · more";
      more.addEventListener("click", () => openViewOptions(more));
      bar.appendChild(more);
      return bar;
    };

    /** The phone (M3): a stacked head — the period lead, then org,
     *  period, status and pillar as native selects, the cascade chip,
     *  ＋ Priority and ⋮ — the vision band, and the walk inline: one
     *  objective per screen, swipe or PREV / NEXT, tap a row for the
     *  overlay. The same state the desktop reads, so a shared link and
     *  the person's prefs mean the same thing on both. */
    const renderPhone = () => {
      const head = el("div", "app-cp-phonehead");
      head.appendChild(el("div", "app-cp-phonehead-lead", `${state.period} Cascaded Priorities`));
      const sel = (label: string, options: { value: string; label: string }[], value: string, onPick: (v: string) => void) => {
        const s = el("select", "app-input app-cp-phonesel") as HTMLSelectElement;
        s.setAttribute("aria-label", label);
        s.title = label;
        for (const o of options) s.appendChild(new Option(o.label, o.value));
        s.value = value;
        s.addEventListener("change", () => onPick(s.value));
        head.appendChild(s);
        return s;
      };
      // the organisation as stacked cascading selects (Ben, 2026-10-12)
      const orgHost = el("div", "app-cp-phoneorg");
      mountOrgCascade(orgHost, { tree, value: state.org, selectClass: "app-input app-cp-phonesel", onChange: (o) => void goTo(o) });
      head.appendChild(orgHost);
      sel("Period", periodsOnOffer().map((p) => ({ value: p, label: p })), state.period, (v) => {
        state.period = v;
        render();
      });
      sel(
        "Status",
        [
          { value: "active", label: "Active priorities" },
          { value: "completed", label: "Completed priorities" },
          { value: "all", label: "All priorities" },
        ],
        state.status,
        (v) => {
          state.status = v as ScreenState["status"];
          render();
        }
      );
      const l1s = strategyChips(livePillars());
      if (l1s.length > 1) {
        sel(
          "Pillar",
          [{ value: "", label: "All pillars" }, ...l1s.map((p) => ({ value: p.id, label: p.name }))],
          state.l1 ?? "",
          (v) => {
            state.l1 = v === "" ? null : v;
            walkStep = 0;
            render();
          }
        );
      }
      const acts = el("div", "app-cp-phoneacts");
      const pending = pendingCascades(state.org, data.assignments).length;
      if (pending > 0) {
        const chip = el("button", "app-cp-cascadechip", `⇩ ${pending} cascade${pending === 1 ? "" : "s"} to accept`) as HTMLButtonElement;
        chip.type = "button";
        chip.addEventListener("click", () => cascadeReview(ctx, state.org));
        acts.appendChild(chip);
      }
      if (canManage() && ctx.canCustomise(state.org)) {
        const add = el("button", "app-btn app-btn-primary", "＋ Priority") as HTMLButtonElement;
        add.type = "button";
        add.addEventListener("click", () => openAddMenu());
        acts.appendChild(add);
      } else if (canManage() && orgLevel(state.org) !== "company") {
        // below the customisation floor a pull adopts as-is only
        acts.appendChild(pullButton("app-btn"));
      }
      const more = el("button", "app-btn app-cp-more", "⋮") as HTMLButtonElement;
      more.type = "button";
      more.title = "View · roll-up rule · share";
      more.addEventListener("click", () => openViewOptions(more));
      acts.appendChild(more);
      head.appendChild(acts);
      wrap.append(head, renderVision());
      const columns = objectiveColumns(livePillars(), focusNow());
      const visible = visibleFor(state.org);
      const { byColumn } = groupByColumn(columns, visible, colOf);
      const adoptedIds = new Set(prioritiesForOrg(state.org, data.priorities, data.assignments).adopted.map((p) => p.id));
      closeWalk?.();
      closeWalk = mountWalk({
        host: wrap,
        ctx,
        org: state.org,
        period: state.period,
        columns,
        pillars: data.pillars,
        byColumn,
        adoptedIds,
        objectives: objectivesOf,
        expanded: walkExpanded,
        onView: rememberWalk,
        startStep: walkStep,
        className: "app-cp-walk-inline",
        inline: true,
        onStep: (i) => {
          walkStep = i;
          rememberWalk();
        },
        onExit: () => undefined,
        onOpen: (p) => openOverlay(p),
      });
      cleanups.push(() => closeWalk?.());
    };

    /** The walk (§15): objectives visible under the current filters. */
    const openWalk = (startStep: number) => {
      walkOpen = true;
      walkStep = startStep;
      rememberWalk();
      // the summary no longer takes the browser full screen by itself
      // (Ben, 2026-11-17) — it fills the app's window; full screen is the
      // person's own choice (the browser's key)
      render();
    };
    const renderWalk = () => {
      const columns = objectiveColumns(livePillars(), focusNow());
      const visible = visibleFor(state.org);
      const { byColumn } = groupByColumn(columns, visible, colOf);
      const adoptedIds = new Set(prioritiesForOrg(state.org, data.priorities, data.assignments).adopted.map((p) => p.id));
      closeWalk?.();
      closeWalk = mountWalk({
        host: wrap,
        ctx,
        org: state.org,
        period: state.period,
        columns,
        pillars: data.pillars,
        byColumn,
        adoptedIds,
        objectives: objectivesOf,
        expanded: walkExpanded,
        onView: rememberWalk,
        onMenu: (anchor, p) => openCardMenu(anchor, p),
        canMenu: () => canManage(),
        startStep: walkStep,
        className: card ? "" : "app-cp-walk-fixed",
        onStep: (i) => {
          walkStep = i;
          rememberWalk();
        },
        onExit: () => {
          walkOpen = false;
          rememberWalk();
          closeWalk?.();
          closeWalk = null;
          render();
        },
        onOpen: (p) => openOverlay(p),
      });
      cleanups.push(() => closeWalk?.());
    };

    // One row, one control (Ben, 2026-08-19): plain crumbs — click an
    // ancestor to go up — and a single ▾ on the current node opening a
    // popover with Switch (siblings) · Descend (children, with pending-
    // cascade counts) · Browse all… (the tree picker for far jumps).
    const openOrgMenu = (anchor: HTMLElement) => {
      document.querySelectorAll(".app-cp-menu").forEach((m) => m.remove());
      const menu = el("div", "app-cp-menu app-cp-orgmenu");
      const row = (o: OrgRef, here: boolean, badge: number) => {
        const b = el("button", "app-cp-menu-item app-cp-orgmenu-item" + (here ? " app-cp-orgmenu-here" : "")) as HTMLButtonElement;
        b.type = "button";
        b.appendChild(el("span", "app-cp-orgmenu-name", (here ? "✓ " : "") + orgName(o)));
        if (badge > 0) b.appendChild(el("span", "app-cp-orgmenu-badge", `⇩ ${badge}`));
        b.addEventListener("click", () => {
          menu.remove();
          if (!here) void goTo(o);
        });
        menu.appendChild(b);
      };
      const sibs = siblingOrgs(tree, state.org);
      if (sibs.length > 1) {
        menu.appendChild(el("div", "app-cp-menu-h", `Switch ${orgLevel(state.org)}`));
        for (const o of sibs) row(o, sameOrg(o, state.org), pendingCascades(o, data.assignments).length);
      }
      const kids = childOrgs(tree, state.org);
      if (kids.length > 0) {
        menu.appendChild(el("div", "app-cp-menu-h", "Descend"));
        for (const o of kids) row(o, false, pendingCascades(o, data.assignments).length);
      }
      const browse = el("button", "app-cp-menu-item app-cp-orgmenu-browse", "Browse all…") as HTMLButtonElement;
      browse.type = "button";
      browse.addEventListener("click", () => {
        menu.remove();
        void pickOrg(wrap, tree, state.org).then((o) => {
          if (o) void goTo(o);
        });
      });
      menu.appendChild(browse);
      const r = anchor.getBoundingClientRect();
      menu.style.top = `${r.bottom + 4}px`;
      menu.style.left = `${Math.min(r.left, window.innerWidth - 300)}px`;
      document.body.appendChild(menu);
      const close = (e: PointerEvent) => {
        if (!menu.contains(e.target as Node)) {
          menu.remove();
          document.removeEventListener("pointerdown", close, true);
        }
      };
      setTimeout(() => document.addEventListener("pointerdown", close, true), 0);
      cleanups.push(() => menu.remove());
    };

    const goTo = async (o: OrgRef) => {
      const companyChanged = o.company !== state.org.company;
      state.org = o;
      state.lastColumn = "";
      state.view = prefs.viewByOrg[orgKey(o)] ?? "simple";
      if (companyChanged) await reload();
      else render();
    };

    const renderVision = (): HTMLElement => {
      const row = el("div", "app-cp-visionrow");
      row.appendChild(el("div", "app-cp-label", "Vision"));
      const band = el("div", "app-cp-vision");
      row.appendChild(band);
      const text = visions[orgKey(state.org)] ?? "";
      band.appendChild(el("div", "app-cp-vision-text", text !== "" ? text : "No vision statement set for this org."));
      if (text === "") band.classList.add("app-cp-vision-empty");
      if (canManage() && orgLevel(state.org) !== "area") {
        const edit = el("button", "app-cp-vision-edit", "⋮") as HTMLButtonElement;
        edit.type = "button";
        edit.title = "Edit vision";
        edit.addEventListener("click", () => {
          void editVision(wrap, state.org, text).then(async (v) => {
            if (v === null) return;
            await saveOrgVision(state.org, v);
            visions[orgKey(state.org)] = v;
            render();
          });
        });
        band.appendChild(edit);
      }
      return row;
    };

    /** Gather this view as a PosterDoc and download the A3 PDF. The
     *  same selectors the matrix paints from, so the poster never shows
     *  a priority the screen would not. */
    const downloadPoster = async () => {
      const [{ layoutPoster, exportDateLabel, A3_W, A3_H }, { buildPagesPdf }] = await Promise.all([
        import("./pdfPoster"),
        import("../issues/pdf"),
      ]);
      const columns = objectiveColumns(livePillars(), focusNow());
      const visible = visibleFor(state.org);
      const { byColumn } = groupByColumn(columns, visible, colOf);
      const ragHex = (r: Rag): string => palette[ragPaletteKey(r)] ?? "";
      const posterColumns = columns.map((col) => {
        const l1 = data.pillars.find((x) => x.id === col.parentId);
        return {
          name: col.name,
          color: col.color || "",
          pillarName: l1?.name ?? "",
          pillarColor: l1?.color ?? "",
          priorities: (byColumn.get(col.id) ?? []).map((p) => {
            const ps = pStatus(p);
            const starred = objectivesOf(p);
            const flags: string[] = [];
            if (parentClosed(p, data.priorities)) flags.push("Parent completed");
            if (p.status !== "active") flags.push(p.status === "completed" ? "Completed" : p.status === "archived" ? "Archived" : "Retired");
            return {
              statement: p.statement,
              owner: p.ownerName,
              color: stateHex(ps.state),
              // on track / flagged / off track — the screen's three counts
              tallies: [
                { glyph: "✓", count: ps.counts.good, color: stateHex("good") },
                { glyph: "⚐", count: ps.counts.flagged, color: stateHex("flagged") },
                { glyph: "✕", count: ps.counts.bad, color: stateHex("bad") },
              ],
              total: ps.total,
              objectives: starred.map((mv) => ({
                name: mv.name,
                objective: mv.objective,
                plan: mv.target !== null ? `${mv.target}${mv.unit}` : "—",
                actual: mv.display !== "" ? mv.display : "—",
                color: mv.rag ? ragHex(mv.rag) : "",
              })),
              flags,
            };
          }),
        };
      });
      // the title carries the org chain as the screen's header does; no
      // status subtitle; the footer is the export date (Ben, 2026-10-08)
      const doc = {
        title: `${state.period} Cascaded Priorities | ${orgPath(state.org).map(orgName).join(" › ")}`,
        subtitle: "",
        vision: visions[orgKey(state.org)] ?? "",
        columns: posterColumns,
        footer: `Export date ${exportDateLabel(new Date())}`,
      };
      const bytes = buildPagesPdf(layoutPoster(doc), { title: doc.title, author: "LeanBoard" }, A3_W, A3_H);
      const buf = new ArrayBuffer(bytes.byteLength);
      new Uint8Array(buf).set(bytes);
      const blob = new Blob([buf], { type: "application/pdf" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `priorities-${orgName(state.org).replace(/[^A-Za-z0-9]+/g, "-").toLowerCase()}-${state.period.replace(/[^A-Za-z0-9]+/g, "")}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    };

    const openViewOptions = (anchor: HTMLElement) => {
      document.querySelectorAll(".app-cp-menu").forEach((m) => m.remove());
      const menu = el("div", "app-cp-menu");
      const item = (label: string, on: boolean | null, run: () => void) => {
        const b = el("button", "app-cp-menu-item", (on === null ? "" : on ? "● " : "○ ") + label) as HTMLButtonElement;
        b.type = "button";
        b.addEventListener("click", () => {
          menu.remove();
          run();
        });
        menu.appendChild(b);
      };
      // the period left this menu (Ben, 2026-11-01): the year pill in the
      // header and the phone head's select are its doors
      menu.appendChild(el("div", "app-cp-menu-h", "Status"));
      for (const [v, l] of [
        ["active", "Active"],
        ["completed", "Completed"],
        ["all", "All"],
      ] as const) {
        item(l, state.status === v, () => {
          state.status = v;
          render();
        });
      }
      menu.appendChild(el("div", "app-cp-menu-h", "Show"));
      item("Other (unlinked initiatives)", state.showOther, () => {
        state.showOther = !state.showOther;
        render();
      });
      item("Group by pillar (7+ columns)", state.groupByPillar, () => {
        state.groupByPillar = !state.groupByPillar;
        render();
      });
      item("Health check scores", state.showHealth, () => {
        state.showHealth = !state.showHealth;
        render();
      });
      // a permalink to THIS view (Ben, 2026-10-07): org, period, status,
      // view, pillar filter, rule, toggles — the player's URL, never the
      // page's own; the menu stays open to say it copied
      menu.appendChild(el("div", "app-cp-menu-h", "Share"));
      const link = el("button", "app-cp-menu-item", "🔗 Copy link to this view") as HTMLButtonElement;
      link.type = "button";
      link.addEventListener("click", () => {
        const url = prioritiesViewUrl(
          encodePrioritiesView({
            org: orgKey(state.org),
            period: state.period,
            status: state.status,
            view: state.view,
            l1: state.l1 ?? "",
            focus: state.focus ?? [],
            rule: "",
            showOther: state.showOther,
            groupByPillar: state.groupByPillar,
          })
        );
        navigator.clipboard.writeText(url).then(
          () => {
            link.textContent = "✓ Link copied";
            setTimeout(() => menu.remove(), 1200);
          },
          () => {
            menu.remove();
            void import("../prompts").then(({ promptText }) => promptText({ title: "Copy this link", note: "The host refused the clipboard — copy it from here.", initial: url, confirmLabel: "Done" }));
          }
        );
      });
      menu.appendChild(link);
      // the poster (Ben, 2026-10-08): this view — org, period, filters —
      // as a clean A3 PDF, no controls; the layout is pure (pdfPoster.ts)
      const pdf = el("button", "app-cp-menu-item", "⬇ Download PDF version") as HTMLButtonElement;
      pdf.type = "button";
      pdf.title = "An A3 landscape PDF of this view for a wall or a deck";
      pdf.addEventListener("click", () => {
        menu.remove();
        void downloadPoster();
      });
      menu.appendChild(pdf);
      const r = anchor.getBoundingClientRect();
      menu.style.top = `${r.bottom + 4}px`;
      menu.style.right = `${Math.max(8, window.innerWidth - r.right)}px`;
      document.body.appendChild(menu);
      const close = (e: PointerEvent) => {
        if (!menu.contains(e.target as Node)) {
          menu.remove();
          document.removeEventListener("pointerdown", close, true);
        }
      };
      setTimeout(() => document.addEventListener("pointerdown", close, true), 0);
      cleanups.push(() => menu.remove());
    };

    /** Do the tiles carry their objectives? The header's switch. Kept in
     *  the old view's words so every saved preference, shared link and
     *  board-card setting still reads: "dynamic" (the retired "Priority
     *  only view") = objectives off. */
    const showObjectives = (): boolean => state.view !== "dynamic";
    /** What a tile's objective charts paint with. */
    const tilePaint = {
      colour: (st: string) => stateHex(st as PriorityState),
      metricColour: (rag: "green" | "amber" | "red") => palette[ragPaletteKey(rag)] ?? "#9a948a",
    };

    // ---- the matrix -------------------------------------------------------

    const visibleFor = (org: OrgRef): Priority[] => {
      const { own, adopted } = prioritiesForOrg(org, data.priorities, data.assignments);
      return [...own, ...adopted].filter(
        (p) =>
          // a proposal is not on the board yet, under ANY status filter —
          // so it is out of the rows, the Objectives, the walk, the poster
          // and the tile, which all read this list (issue 13, 2026-11-16)
          p.status !== "proposed" &&
          priorityLiveIn(settings.period, p, state.period) &&
          (state.status === "all" ||
            // a past year's "active" = live in that year (liveThen): one
            // completed since still belongs on the year it ran in
            (state.status === "active" ? p.status === "active" || (viewingPast() && liveThen(settings.period, p, state.period)) : p.status === "completed"))
      );
    };
    /** The org's own proposals, live in the viewed year. */
    const proposedFor = (org: OrgRef): Priority[] =>
      prioritiesForOrg(org, data.priorities, data.assignments).own.filter((p) => p.status === "proposed" && priorityLiveIn(settings.period, p, state.period));

    /** The cascades and pulls waiting on the org in view. */
    const waitingHere = () => waitingAt(state.org, data.assignments);

    const renderMatrix = (columns: Pillar[], onlyL1: Pillar | null): HTMLElement => {
      const density = densityFor(columns.length);
      const phone = window.matchMedia("(max-width: 719px)").matches;
      const box = el("div", `app-cp-matrix app-cp-${density}` + (phone ? " app-cp-phone" : ""));
      const visible = visibleFor(state.org);
      const { byColumn, unplaced } = groupByColumn(columns, visible, colOf);
      const adoptedIds = new Set(prioritiesForOrg(state.org, data.priorities, data.assignments).adopted.map((p) => p.id));

      // ONE tile (2026-11-18): the "Priority only view" and its own card
      // are retired — the Objectives switch decides what a tile carries
      const cardFor = (p: Priority, _col: Pillar) => priorityCard(p, adoptedIds.has(p.id), density);
      if (phone) {
        for (const col of columns) {
          box.appendChild(el("div", "app-cp-ph-h", col.name));
          const items = byColumn.get(col.id) ?? [];
          if (items.length === 0) box.appendChild(el("div", "app-cp-empty-cell", "—"));
          for (const p of items) box.appendChild(cardFor(p, col));
        }
        return box;
      }

      const grid = el("div", "app-cp-grid");
      // minmax(0, 1fr): a bare 1fr floors at the content's min width, so a
      // long title or objective stretched its column sideways (Ben,
      // 2026-09-24) — text wraps and the page grows downward instead
      grid.style.gridTemplateColumns = `126px repeat(${Math.max(1, columns.length)}, minmax(0, 1fr))`;
      box.appendChild(grid);

      // row 1: rail "Strategic Pillars" over the pillar spans + column heads.
      // Each pillar is a rectangle stretched over its own sub-pillar
      // columns (settings order); click filters to that pillar, ✕ clears.
      const rail1 = el("div", "app-cp-label", "Strategic pillars");
      rail1.style.gridRow = "1 / span 2";
      grid.appendChild(rail1);
      const spans = columns.length > 0 ? pillarSpans(data.pillars, columns) : [];
      if (spans.length === 0) {
        const none = el("div", "app-cp-l1span app-cp-l1span-none");
        none.appendChild(el("span", "app-cp-muted", "No pillars yet — a super admin sets them in Settings → Priorities."));
        grid.appendChild(none);
      }
      for (const sp of spans) {
        const l1 = sp.pillar;
        const on = l1 !== null && state.l1 === l1.id;
        const box = el(l1 ? "button" : "div", "app-cp-l1span" + (on ? " app-cp-l1span-on" : "") + (l1 ? "" : " app-cp-l1span-none"));
        box.style.gridColumn = `span ${sp.span}`;
        if (l1) {
          const b = box as HTMLButtonElement;
          b.type = "button";
          b.textContent = on ? `${l1.name} ✕` : l1.name;
          b.title = on ? "Clear the pillar filter" : `Show only ${l1.name}`;
          if (l1.color !== "") {
            b.style.background = l1.color;
            b.style.borderColor = l1.color;
            b.style.color = "#fff";
          }
          b.addEventListener("click", () => {
            state.l1 = on ? null : l1.id;
            render();
          });
        } else {
          box.textContent = "—";
          box.title = "Sub-pillars whose pillar is retired";
        }
        grid.appendChild(box);
      }
      for (const col of columns) {
        const head = el("div", "app-cp-colhead", col.name);
        const parentL1 = data.pillars.find((p) => p.id === col.parentId);
        const colour = col.color || parentL1?.color || "";
        if (colour !== "") {
          head.style.background = colour;
          head.style.color = "#fff";
        }
        head.addEventListener("click", () => {
          state.lastColumn = col.id;
        });
        // the sub-pillar's latest health score (decision 9) — on request
        // only (the kebab's "Health check scores", Ben 2026-11-01): the
        // score alone, right-aligned, never wrapping; the date and the
        // scale live in the tooltip; a check older than
        // HEALTH_CHIP_STALE_DAYS reads hollow; the chip opens the check
        if (state.showHealth && state.org.site !== "") {
          void import("../health/entry").then(async ({ healthEnabled, latestFor }) => {
            if (!(await healthEnabled(state.org.site, "priorities")) || !head.isConnected) return;
            const scope = { type: "priorities" as const, site: state.org.site, pillarId: col.id, org: { ...state.org }, label: `${col.name} — ${orgName(state.org)}` };
            const { latest } = await latestFor(scope);
            if (latest !== null && head.isConnected) {
              const stale = healthChipStale(latest.date, today);
              const chip = el("button", "app-link app-cp-hcchip" + (stale ? " app-cp-hcchip-stale" : ""), latest.score.value === null ? "—" : latest.score.value.toFixed(1)) as HTMLButtonElement;
              chip.type = "button";
              chip.title = `Health check ${latest.date}${stale ? " (more than 90 days ago)" : ""}: ${latest.score.value === null ? "no score" : `${latest.score.value.toFixed(1)} of 5`} — open`;
              chip.addEventListener("click", (e) => {
                e.stopPropagation();
                void import("../health/checkDialog").then(({ openHealthCheck }) =>
                  openHealthCheck({ host: wrap, scope, mayRun: canManage(), isAdmin: viewer.role !== "user", onChanged: () => render() })
                );
              });
              head.appendChild(chip);
            }
          });
        }
        grid.appendChild(head);
      }
      if (columns.length === 0) {
        const none = el("div", "app-cp-colhead app-cp-colhead-empty", "No sub-pillars");
        grid.appendChild(none);
      }

      // row 3: Priorities
      // the row's label carries the key to the cards' three circles (Ben,
      // 2026-11-17: the circles had no legend) — in the rail, beside the
      // cards it explains, where it costs the matrix no room
      const prLabel = el("div", "app-cp-label");
      prLabel.appendChild(el("div", undefined, "Priorities"));
      const key = statusLegend(stateHex, { stack: true });
      key.title = "Each priority's initiatives: on track, support needed, off track";
      prLabel.appendChild(key);
      grid.appendChild(prLabel);
      for (const col of columns) {
        const cell = el("div", "app-cp-cell");
        cell.addEventListener("click", () => {
          state.lastColumn = col.id;
        });
        const items = byColumn.get(col.id) ?? [];
        for (const p of items) cell.appendChild(cardFor(p, col));
        // empty cells stay blank — the toolbar's ＋ Priority is the one
        // door (Ben, 2026-08-19); clicking a column still preselects it
        if (items.length === 0) cell.appendChild(el("div", "app-cp-empty-cell", ""));
        grid.appendChild(cell);
      }
      if (columns.length === 0) grid.appendChild(el("div", "app-cp-cell"));

      // ---- the decision zone (2026-11-18): what waits on this org, under
      // the priorities and in their columns. "Proposed" is what was
      // raised from below (issue 13, 2026-11-16); "Cascaded to you" is
      // what was sent from above — it used to be a header chip and a
      // pop-up list. Each row is absent when empty and OPEN unless the
      // person folds it. Dashed, no tallies: none of it counts yet.
      const filtered = onlyL1 !== null || focusNow() !== null;
      /** A row of the zone: the label that folds it, a cell per column. */
      const zoneRow = (key: "proposed" | "cascaded", name: string, tiles: { col: string; card: () => HTMLElement }[]) => {
        // a tile whose sub-pillar is not a column on screen: hidden by a
        // filter like everything else; with no filter it has lost its
        // column and stands in the first one rather than vanish
        const shown = new Set(columns.map((c) => c.id));
        const placed = tiles.filter((t) => shown.has(t.col));
        const loose = filtered ? [] : tiles.filter((t) => !shown.has(t.col));
        if (placed.length + loose.length === 0) return;
        const open = zoneOpen[key];
        const label = el("button", "app-cp-label app-cp-proposedlabel app-cp-zonelabel", `${open ? "▾" : "▸"} ${name}`) as HTMLButtonElement;
        label.type = "button";
        label.title = open ? `Fold “${name}”` : `Show the ${placed.length + loose.length} under “${name}”`;
        label.setAttribute("aria-expanded", String(open));
        label.addEventListener("click", () => {
          zoneOpen[key] = !zoneOpen[key];
          render();
        });
        grid.appendChild(label);
        columns.forEach((col, n) => {
          const cell = el("div", "app-cp-cell app-cp-proposedrow");
          const items = [...placed.filter((t) => t.col === col.id), ...(n === 0 ? loose : [])];
          if (!open) {
            if (items.length > 0) {
              const chip = el("button", "app-cp-proposedcount", String(items.length)) as HTMLButtonElement;
              chip.type = "button";
              chip.title = `Show the ${items.length} here`;
              chip.addEventListener("click", () => {
                zoneOpen[key] = true;
                render();
              });
              cell.appendChild(chip);
            }
          } else {
            for (const t of items) cell.appendChild(t.card());
          }
          grid.appendChild(cell);
        });
        if (columns.length === 0) grid.appendChild(el("div", "app-cp-cell"));
      };
      const waiting = waitingHere();
      const waitingTiles = (list: PriorityAssignment[]) =>
        list.flatMap((a) => {
          const p = data.priorities.find((x) => x.id === a.priorityId);
          return p ? [{ col: colOf(p), card: () => waitingCard(a, p) }] : [];
        });
      zoneRow("proposed", "Proposed", [...proposedFor(state.org).map((p) => ({ col: colOf(p), card: () => proposedCard(p) })), ...waitingTiles(waiting.fromBelow)]);
      zoneRow("cascaded", "Cascaded to you", waitingTiles(waiting.fromAbove));
      return box;
    };

    /** A proposal in the Proposed row: its statement and who proposed it,
     *  dashed, no tallies — click opens it (Accept / Decline live there). */
    const proposedCard = (p: Priority): HTMLElement => {
      const card = el("button", "app-cp-card app-cp-card-proposed") as HTMLButtonElement;
      card.type = "button";
      card.appendChild(el("div", "app-cp-statement", p.statement));
      card.appendChild(el("div", "app-cp-proposedmeta", p.ownerName !== "" ? `Proposed · owner ${p.ownerName}` : "Proposed"));
      card.title = canApprove(p.org) ? "Open to accept or decline" : "Waiting for the org's owner or an admin";
      card.addEventListener("click", () => ctx.open(p));
      return card;
    };

    /** A cascade sent to this org, or a pull a direct report proposed,
     *  still to be answered: the priority's statement and where it came
     *  from, dashed like a proposal. Click opens the priority itself,
     *  where the answer is given. */
    const waitingCard = (a: PriorityAssignment, p: Priority): HTMLElement => {
      const pulled = isPulledProposal(a);
      const held = a.status === "onhold";
      const card = el("button", "app-cp-card app-cp-card-proposed" + (held ? " app-cp-card-held" : "")) as HTMLButtonElement;
      card.type = "button";
      card.appendChild(el("div", "app-cp-statement", p.statement));
      card.appendChild(
        el(
          "div",
          "app-cp-proposedmeta",
          pulled ? `Proposed · pulled from ${orgName(p.org)}${a.decidedByName !== "" ? ` by ${a.decidedByName}` : ""}` : held ? `On hold · from ${orgName(p.org)}` : `From ${orgName(p.org)}${p.ownerName !== "" ? ` · ${p.ownerName}` : ""}`
        )
      );
      const decides = pulled ? canApprove(state.org) : canManage();
      card.title = held && a.reason !== "" ? `On hold — “${a.reason}”` : decides ? "Open to accept or decline" : pulled ? "Waiting for the org's owner or an admin" : "Waiting for someone who manages this org";
      card.addEventListener("click", () => ctx.open(p));
      return card;
    };

    /** The priorities with no column in the year shown (their sub-pillar
     *  ended and nothing follows it): a band of their own under the
     *  matrix, each with the one thing to do about it. It was a line of
     *  links that opened Edit for anyone, and it counted priorities that
     *  were only hidden by a pillar filter. */
    const renderUnplaced = (): HTMLElement | null => {
      const visible = visibleFor(state.org);
      const lost = orphansOf(visible, colOf, livePillars());
      if (lost.length === 0) return null;
      const adoptedIds = new Set(prioritiesForOrg(state.org, data.priorities, data.assignments).adopted.map((p) => p.id));
      const box = el("div", "app-cp-unplacedband");
      const open = zoneOpen.unplaced;
      const label = el("button", "app-cp-label app-cp-proposedlabel", `${open ? "▾" : "▸"} Unplaced`) as HTMLButtonElement;
      label.type = "button";
      label.title = `${lost.length} priorit${lost.length === 1 ? "y" : "ies"} whose sub-pillar is not in use in ${state.period}`;
      label.setAttribute("aria-expanded", String(open));
      label.addEventListener("click", () => {
        zoneOpen.unplaced = !zoneOpen.unplaced;
        render();
      });
      const cell = el("div", "app-cp-cell app-cp-unplacedrow");
      if (!open) {
        cell.appendChild(el("span", "app-cp-muted", `${lost.length} unplaced`));
      } else {
        for (const p of lost) {
          const adopted = adoptedIds.has(p.id);
          const item = el("div", "app-cp-unplaceditem");
          item.appendChild(priorityCard(p, adopted, "comfortable"));
          if (!adopted && canManageOrg(viewer, p.org, owners)) {
            const place = el("button", "app-link", "Place under…") as HTMLButtonElement;
            place.type = "button";
            place.addEventListener("click", () => void placeUnder(p));
            item.appendChild(place);
          } else {
            item.appendChild(el("span", "app-cp-muted", adopted ? `Placed by ${orgName(p.org)}` : "Placed by its org's owner"));
          }
          cell.appendChild(item);
        }
      }
      box.append(label, cell);
      return box;
    };

    /** "Place under…": the year's sub-pillars; the priority sits under
     *  the one chosen FROM that year on, its earlier years as they were. */
    const placeUnder = (p: Priority): Promise<void> =>
      new Promise((resolve) => {
        const m = modal(wrap, "Place under a sub-pillar", `“${p.statement.slice(0, 90)}” — from ${state.period}; its earlier years stay as they were.`);
        const sel = el("select", "app-input") as HTMLSelectElement;
        const none = el("option", "", "Choose…") as HTMLOptionElement;
        none.value = "";
        sel.appendChild(none);
        const subs = objectiveColumns(livePillars(), null);
        for (const top of strategyChips(livePillars())) {
          const kids = subs.filter((c) => c.parentId === top.id);
          if (kids.length === 0) continue;
          const group = document.createElement("optgroup");
          group.label = top.name;
          for (const c of kids) {
            const o = el("option", "", c.name) as HTMLOptionElement;
            o.value = c.id;
            group.appendChild(o);
          }
          sel.appendChild(group);
        }
        const f = field("Sub-pillar", sel);
        f.querySelector(".app-field-label")?.appendChild(requiredStar());
        m.body.appendChild(f);
        const cancel = el("button", "app-link", "Cancel") as HTMLButtonElement;
        cancel.type = "button";
        cancel.addEventListener("click", () => {
          m.close();
          resolve();
        });
        const save = el("button", "app-btn app-btn-primary", "Place") as HTMLButtonElement;
        save.type = "button";
        save.disabled = true;
        sel.addEventListener("change", () => {
          save.disabled = sel.value === "";
        });
        save.addEventListener("click", () => {
          const to = sel.value;
          if (to === "") return;
          m.close();
          void (async () => {
            const moved = moveFrom(settings.period, p, state.period, to);
            const next: Priority = { ...p, pillarId: moved.pillarId, placements: moved.placements };
            await savePriority(next, data);
            Object.assign(p, next);
            await appendEvent(p, "edited", { fields: "sub-pillar", from: state.period }, actor());
            await reload();
            resolve();
          })();
        });
        m.footer.append(cancel, save);
        sel.focus();
      });

    const priorityCard = (p: Priority, adopted: boolean, density: ReturnType<typeof densityFor>): HTMLElement => {
      const ps = pStatus(p);
      const card = el("div", "app-cp-card");
      card.style.borderLeftColor = stateHex(ps.state);
      card.appendChild(el("div", "app-cp-statement", p.statement));
      // on track / flagged / off track — the three counts every surface
      // carries (the status rule, 2026-11-17)
      const meta = el("div", "app-cp-tallies");
      // …and they ARE the count: no "· n" beside them (Ben, 2026-11-17 —
      // the total only repeated their sum)
      meta.appendChild(priorityCounts(ps, stateHex, density === "compact" ? "xs" : "s", false));
      // its own actions are NOT counted on the tile (Ben, 2026-11-19: the
      // "1 action" beside the circles was distracting) — a late one still
      // turns the edge and is named in the circles' tooltip
      card.appendChild(meta);
      // its objectives, as charts under the circles (Ben, 2026-11-18 —
      // they were a row of their own): titled by the objective's words,
      // no numbers, two to a row
      if (showObjectives()) card.appendChild(objectiveCharts(objectivesOf(p), tilePaint));
      // cascade lineage and sender flags live in the detail overlay, not
      // on the card (Ben, 2026-08-19)
      if (p.status !== "active") {
        card.appendChild(el("div", "app-cp-flag", p.status === "completed" ? "✓ Completed" : p.status === "archived" ? "▣ Archived" : "▣ Retired"));
      }
      if (parentClosed(p, data.priorities)) card.appendChild(el("div", "app-cp-flag app-cp-flag-amber", "▲ Parent completed — decide"));
      if (reviewDue(settings.period, p, state.period)) card.appendChild(el("div", "app-cp-flag app-cp-flag-amber", `⟳ Past its planned end (${p.plannedEnd}) — review`));
      // owner actions (⋮): P1 offers Edit + reorder; Cascade to… / Complete arrive with P2
      if ((canManage() && !adopted) || (adopted && canRaiseOn(p))) {
        const kebab = el("button", "app-cp-kebab", "⋮") as HTMLButtonElement;
        kebab.type = "button";
        kebab.title = adopted ? "Add action" : "Edit · cascade · reorder · complete";
        kebab.addEventListener("click", (e) => {
          e.stopPropagation();
          openCardMenu(kebab, p);
        });
        card.appendChild(kebab);
      }
      card.addEventListener("click", () => {
        state.lastColumn = p.pillarId;
        openOverlay(p);
      });
      return card;
    };

    const openCardMenu = (anchor: HTMLElement, p: Priority) => {
      document.querySelectorAll(".app-cp-menu").forEach((m) => m.remove());
      const menu = el("div", "app-cp-menu");
      const item = (label: string, run: () => void, disabled = false) => {
        const b = el("button", "app-cp-menu-item", label) as HTMLButtonElement;
        b.type = "button";
        b.disabled = disabled;
        b.addEventListener("click", () => {
          menu.remove();
          run();
        });
        menu.appendChild(b);
      };
      // shown here adopted: the row is its own org's — an action raised
      // on it HERE is all this org may add
      if (!sameOrg(p.org, state.org)) {
        item("Add action…", () => addActionTo(p), !canRaiseOn(p));
        const ar = anchor.getBoundingClientRect();
        menu.style.top = `${ar.bottom + 4}px`;
        menu.style.left = `${Math.min(ar.left, window.innerWidth - 240)}px`;
        document.body.appendChild(menu);
        const shut = (e: PointerEvent) => {
          if (!menu.contains(e.target as Node)) {
            menu.remove();
            document.removeEventListener("pointerdown", shut, true);
          }
        };
        setTimeout(() => document.addEventListener("pointerdown", shut, true), 0);
        cleanups.push(() => menu.remove());
        return;
      }
      item("Edit…", () => void editPriority(p));
      item("Add action…", () => addActionTo(p), !canRaiseOn(p));
      const siblings = visibleFor(state.org).filter((x) => colOf(x) === colOf(p) && orgKey(x.org) === orgKey(state.org));
      const i = siblings.indexOf(p);
      item("Move up", () => void reorder(siblings, i, i - 1), i <= 0);
      item("Move down", () => void reorder(siblings, i, i + 1), i < 0 || i >= siblings.length - 1);
      item("Cascade to…", () => cascadeDialog(ctx, p), p.status !== "active");
      item("Complete…", () => void closeFromCard(p, "complete"), p.status !== "active");
      item("Archive…", () => void closeFromCard(p, "archive"), p.status !== "active");
      // the undo of Accept, for whoever may accept (Ben, 2026-11-16)
      if (canApprove(p.org)) item("Move back to proposed…", () => void moveBackToProposed(ctx, p), p.status !== "active");
      item("Reopen", () => void reopenPriority(ctx, p), p.status === "active" || p.status === "proposed" || (isDeclined(p) && !canApprove(p.org)));
      const r = anchor.getBoundingClientRect();
      menu.style.top = `${r.bottom + 4}px`;
      menu.style.left = `${Math.min(r.left, window.innerWidth - 240)}px`;
      document.body.appendChild(menu);
      const close = (e: PointerEvent) => {
        if (!menu.contains(e.target as Node)) {
          menu.remove();
          document.removeEventListener("pointerdown", close, true);
        }
      };
      setTimeout(() => document.addEventListener("pointerdown", close, true), 0);
      cleanups.push(() => menu.remove());
    };

    const closeFromCard = async (p: Priority, mode: "complete" | "archive") => {
      const r = await closeDialog(wrap, p, mode, openOwn(priorityActionsOf(p)));
      if (r) await closePriority(ctx, p, mode, r);
    };

    const reorder = async (siblings: Priority[], from: number, to: number) => {
      if (to < 0 || to >= siblings.length) return;
      const list = siblings.slice();
      const [moved] = list.splice(from, 1);
      list.splice(to, 0, moved);
      list.forEach((p, i) => (p.order = i + 1));
      for (const p of list) await savePriority(p, data);
      const actor = { whoId: viewer.whoId, who: me?.who ?? who?.name ?? "" };
      await appendEvent(moved, "reordered", { to: to + 1 }, actor);
      await reload();
    };

    const renderOther = (): HTMLElement => {
      const strip = el("div", "app-cp-other");
      if (!state.showOther) {
        strip.style.display = "none";
        return strip;
      }
      // initiatives arrive with P5 — until then the strip states the fact
      strip.appendChild(el("span", undefined, "Other — 0 initiatives not linked to an open priority"));
      strip.appendChild(el("span", "app-cp-muted", " · initiatives arrive with a later update"));
      return strip;
    };

    // ---- add / edit -----------------------------------------------------------

    const cascadeTargetsFor = (p: Priority | null): CascadeTarget[] => {
      const org = p ? p.org : state.org;
      const kids = childOrgs(tree, org);
      const parent = orgParent(org);
      const peers = parent ? childOrgs(tree, parent).filter((o) => !sameOrg(o, org)) : [];
      const named = (o: OrgRef) => {
        // areas fall to their department's owner for the label
        const govern = orgLevel(o) === "area" ? { ...o, area: "" } : o;
        return owners[orgKey(govern)]?.[0]?.who ?? "";
      };
      return [
        ...kids.map((o) => ({ org: o, ownerName: named(o), kind: "child" as const })),
        ...peers.map((o) => ({ org: o, ownerName: named(o), kind: "peer" as const })),
      ];
    };

    const actor = () => ({ whoId: viewer.whoId, who: me?.who ?? who?.name ?? "" });

    /** ＋ Priority (Ben, 2026-11-06): ONE dialog with a Pull from above /
     *  New priority toggle — pull by default below the company; the
     *  company has nothing above it and goes straight to a new one. */
    const openAddMenu = () => {
      if (orgLevel(state.org) === "company") {
        void addPriority();
        return;
      }
      pullFromAbove(ctx, state.org, { onNew: () => void addPriority(true) });
    };
    const pullButton = (cls: string): HTMLButtonElement => {
      const b = el("button", cls, "＋ Pull from above") as HTMLButtonElement;
      b.type = "button";
      b.title = "Adopt a priority set above this org";
      b.addEventListener("click", () => pullFromAbove(ctx, state.org));
      return b;
    };

    const addPriority = async (withToggle = false) => {
      const draft = newPriority(state.org, state.period !== "" ? state.period : currentPeriod);
      // the org's owner by default; the person adding it when none is set
      const defaultOwner = ownerFor(state.org) ?? (me ? { whoId: me.whoId, who: me.who } : null);
      if (defaultOwner) {
        draft.ownerId = defaultOwner.whoId;
        draft.ownerName = defaultOwner.who;
      }
      const inColumn = visibleFor(state.org).filter((x) => colOf(x) === (state.lastColumn || ""));
      draft.order = inColumn.length + 1;
      // the org's owner or an admin adds; anyone else who may add
      // PROPOSES — it waits in the Proposed row (issue 13, 2026-11-16)
      const approves = canApprove(state.org);
      const r = await priorityDialog({
        host: wrap,
        title: approves ? "Add priority" : "Propose a priority",
        priority: draft,
        pillars: data.pillars,
        periodSettings: settings.period,
        viewYear: state.period,
        preselectPillarId: state.lastColumn,
        periods: periodsOnOffer(),
        roster,
        // a proposal is not cascaded: that waits for its acceptance
        cascadeTargets: approves ? cascadeTargetsFor(null) : [],
        alreadyCascaded: [],
        ownerPicker: ownerPickerFor(state.org),
        onPull: withToggle ? () => openAddMenu() : undefined,
      });
      if (!r) return;
      if (!approves) r.priority.status = "proposed";
      r.priority.rowId = await savePriority(r.priority, data);
      data.priorities.push(r.priority);
      await appendEvent(r.priority, approves ? "created" : "proposed", { statement: r.priority.statement }, actor());
      if (approves) await cascade(r.priority, r.cascadeTo);
      else {
        zoneOpen.proposed = true; // show the person where it went
        // …and offer to tell the one who decides
        offerStepMessage({ step: "proposed", statement: r.priority.statement, org: state.org, to: [ownerFor(state.org)?.whoId ?? ""], linkOrg: state.org, period: state.period }, actor(), roster);
      }
      await reload();
    };

    const editPriority = async (p: Priority) => {
      // the form asks for the sub-pillar of every year that needs asking
      // (2026-11-18): it is handed the priority as recorded and every
      // pillar row, and returns the home and the earlier placements —
      // the "from this year, or every year?" question after Save is gone
      const copy: Priority = { ...p, org: { ...p.org }, placements: [...p.placements] };
      const already = data.assignments.filter((a) => a.priorityId === p.id).map((a) => ({ org: a.org, status: a.status, reason: a.reason }));
      const r = await priorityDialog({
        host: wrap,
        title: "Edit priority",
        priority: copy,
        pillars: data.pillars,
        periodSettings: settings.period,
        viewYear: state.period,
        periods: periodsOnOffer(),
        roster,
        cascadeTargets: cascadeTargetsFor(p),
        alreadyCascaded: already,
        ownerPicker: ownerPickerFor(p.org),
      });
      if (!r) return;
      const before = p.statement;
      await savePriority(r.priority, data);
      Object.assign(p, r.priority);
      await appendEvent(
        p,
        "edited",
        before !== p.statement ? { from: before, to: p.statement } : { fields: "properties" },
        actor()
      );
      await cascade(p, r.cascadeTo);
      await reload();
    };

    /** Create proposed assignments for the chosen orgs (skipping any that
     *  already have one) and log the cascade event. */
    const cascade = async (p: Priority, targets: OrgRef[]) => {
      await sendCascade(ctx, p, targets.filter((o) => !isDescendant(p.org, o)));
    };

    render();
    // returned from an initiative board's crumb: reopen the overlay it
    // was opened from (boardOrigin handoff; tab mode only)
    if (!card) {
      try {
        const reopenId = sessionStorage.getItem(REOPEN_PRIORITY_KEY);
        if (reopenId !== null) {
          sessionStorage.removeItem(REOPEN_PRIORITY_KEY);
          const p = data.priorities.find((x) => x.id === reopenId);
          if (p) openOverlay(p);
        }
      } catch {
        /* the tab itself is the landing */
      }
    }
  })().catch((err) => {
    stopLoading();
    wrap.appendChild(
      el("div", "app-board-note", `Priorities could not load: ${err instanceof Error ? err.message : String(err)}`)
    );
  });

  return () => {
    dead = true;
    for (const fn of cleanups) fn();
    wrap.remove();
  };
}

// keep the roster type in play for the dialogs' signatures
export type { RosterPerson };
export type { PrioritySettings };
