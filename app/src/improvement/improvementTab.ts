// Improvement — the hub tab (P5; design spec §1): one table, three
// groups — My initiatives · Owned by my team (org owners, with a scope
// select and a Gantt › stub) · All initiatives I can see — the same
// columns throughout (Initiative · Stage · Primary metric · Next gate ·
// Health · ⋮), and the three-step create flow (template picker with the
// single-action variant · header form · save lands on the new board).
// P5 stand-ins: metric values, health scores, Tiles view and the board's
// header band arrive with P6 — the columns say so plainly.

import { el, clear } from "../../../shared/ui/dom";
import { isPhoneWindow } from "../phone";
import { showLoading } from "../loading";
import { currentViewer } from "../runtime";
import { boardHash, boardUrl } from "../links";
import { rememberBoardOrigin } from "./boardOrigin";
import { renderMetricsList } from "./metricsList";
import { dayLabel } from "../linkTitle";
import { listPeople, viewerPerson } from "../store/people";
import type { RosterPerson } from "../store/mappers";
import { improvementSettingsJson, orgJson, orgOwnersMap, prioritySettingsJson, siteCompanies } from "../store/config";
import { effectivePerson } from "../viewAs";
import { loadCascade } from "../store/priorities";
import { listTemplates } from "../store/templates";
import { appendInitiativeEvent, createInitiative, listInitiatives, saveInitiative } from "../store/initiatives";
import { actionsForInitiatives, upsertActions } from "../store/actions";
import { listBoards } from "../store/boards";
import { rowsForInitiativeBoards } from "../store/cards";
import { buildMetricState, loadMetricLasts, statusMetricsOf } from "./metricValues";
import { actionCountsFor, PriorityState, statusColour, StatusResult } from "./status";
import { actionCircles, statusChip } from "./statusUi";
import { initiativeRow, InitiativeRowData, initiativeRowHead } from "./initiativeRow";
import { actionBelongsTo, newAction } from "../../../shared/schema/actions";
import { promptConfirm } from "../prompts";
import { parseOrgTree } from "../../../shared/schema/meeting";
import { effectiveEnd, groupPrioritiesForPicker, isDescendant, orgFromKey, orgKey, orgName, OrgRef, orgRef, orgLevel, orgPath, periodFor, periodsOnOffer, parsePrioritySettings, ragPaletteKey, sameOrg, spanLiveIn } from "../priorities/model";
import { paletteMap } from "../../../shared/palette";
import { appPalettes } from "../store/config";
import { todayIso } from "../../../shared/schema/id";
import { ImprovementViewer, Initiative, adminScopeFor, groupInitiatives, myRoles, nextGateFor, orgKeyOf, orgsOf, statusOf, validateNewInitiative,
  ownersLabel, ownersTitle,
} from "./initiativeModel";
import { fieldInput } from "./fieldInput";
import { isFieldEmpty } from "./fieldCodec";
import { assigneePeople } from "../../../shared/schema/people";
import { renderInitiativeForm } from "./initiativeForm";
import { buildProcessTree, flatProcessOptions, inCentralSubtree, inSubtree, processPathLabel, siteRootOf } from "../processes/model";
import { mountCentralPicker, mountProcessPicker } from "../../../shared/ui/processPicker";
import { mountOrgCascade } from "../priorities/orgCascade";
import { allSiteProcessRoots, listProcessNodes } from "../store/processes";
import { improvementView, rememberImprovement, rememberShared, sharedView } from "../sessionView";
import {
  primaryMetric,
  normalizeMetrics,
  TemplateMetric,
  ImprovementSettings,
  InitiativeTemplate,
  parseImprovementSettings,
  PDCA_TOKENS,
  roleFillersAt,
  STANDARD_ROLES,
  stepperChips, activeRoles } from "./templateModel";
import { buildTree, childOrgs, orgInTree, pickOrg, pickOwner, siblingOrgs } from "../priorities/dialogs";

const btn = (label: string, cls = "app-btn"): HTMLButtonElement => {
  const b = el("button", cls, label) as HTMLButtonElement;
  b.type = "button";
  return b;
};

export interface ImprovementMountOpts {
  embedded?: boolean;
}

export function mountImprovement(parent: HTMLElement, _opts: ImprovementMountOpts = {}): () => void {
  const wrap = el("div", "app-im-wrap");
  parent.appendChild(wrap);
  const stopLoading = showLoading(wrap);
  let dead = false;
  const cleanups: (() => void)[] = [];

  void (async () => {
    const who = currentViewer();
    const [initiatives, templates, roster, owners, treeRaw, siteCo, impRaw, prSettingsRaw, initActions, allBoards, initRows, palettes, cascade, processNodes, siteRoots] = await Promise.all([
      listInitiatives(),
      listTemplates(),
      listPeople(),
      orgOwnersMap(),
      orgJson(),
      siteCompanies(),
      improvementSettingsJson(),
      prioritySettingsJson(),
      actionsForInitiatives().catch(() => []),
      listBoards().catch(() => []),
      rowsForInitiativeBoards().catch(() => []),
      appPalettes(),
      // the priorities' statements, for the row meta line (all companies;
      // a rename shows on the next open — no label is stored on the link)
      loadCascade("").catch(() => null),
      listProcessNodes().catch(() => []),
      allSiteProcessRoots().catch(() => ({}) as Record<string, string>),
    ]);
    if (dead) return;
    stopLoading();
    // the viewer's own row read DIRECTLY when the roster list lacks it
    // (2026-11-01: production's roster had passed the SDK's first page
    // and a super admin's row was missing — every edit door closed)
    const stored = roster.find((p) => p.whoId === (who?.objectId ?? "")) ?? (who?.objectId ? await viewerPerson(who.objectId).catch(() => null) : null);
    const me = stored ? effectivePerson(stored) : null; // honour View as
    if (dead) return;
    const imp = parseImprovementSettings(impRaw);
    const priorityStatement = new Map((cascade?.priorities ?? []).map((p) => [p.id, p.statement]));
    /** Who may act for a role on this initiative: the people assigned on
     *  the row PLUS the site's standard-role fillers (the approval pool
     *  the board header honours). */
    const actorsForRole = (i: Initiative, key: string): { whoId: string; who: string }[] => {
      const std = imp.standardRoles.find((r) => r.key === key);
      return [...(i.roles[key] ?? []), ...(std ? roleFillersAt(std, i.org.site) : [])];
    };
    const sites = parseOrgTree(treeRaw);
    // the org drill-down (the Priorities header pattern): crumbs + one ▾
    const companyList = [...new Set(Object.values(siteCo).filter((c) => c !== ""))];
    const tree = buildTree(treeRaw, siteCo, companyList);
    const mySite = me?.site && siteCo[me.site] !== undefined ? orgRef(siteCo[me.site], me.site) : null;
    const firstSite = tree.companies.flatMap((c) => c.sites.map((x) => orgRef(c.name, x.name)))[0] ?? orgRef(companyList[0] ?? "");
    // the site and year in view are the session's, shared with Priorities
    // (Ben, 2026-11-16, issue 9); the other filters are this screen's own
    const session = sharedView();
    const sessionOrg = session.org ? orgFromKey(session.org) : null;
    const sessionImp = improvementView();
    let scope: OrgRef = (sessionOrg && orgInTree(tree, sessionOrg) ? sessionOrg : null) ?? mySite ?? firstSite;
    /** In scope = at the scoped org OR anywhere below it. */
    const inScope = (o: Initiative["org"]): boolean =>
      (scope.company === "" || o.company === scope.company) &&
      (scope.site === "" || o.site === scope.site) &&
      (scope.department === "" || o.department === scope.department) &&
      (scope.area === "" || o.area === scope.area);
    const prSettings = parsePrioritySettings(prSettingsRaw);
    const currentPeriod = periodFor(prSettings.period, todayIso());
    /** An initiative's span: its start label to the period it completed in
     *  (a row closed before ends were stamped ends in its start). */
    const liveIn = (i: Initiative, year: string) =>
      spanLiveIn(prSettings.period, { start: i.period, end: effectiveEnd({ status: i.status, period: i.period, toPeriod: i.toPeriod }) }, year);
    const ownedOrgKeys = Object.entries(owners)
      .filter(([, people]) => people.some((p) => p.whoId === (who?.objectId ?? "")))
      .map(([key]) => key);
    const viewer: ImprovementViewer = {
      whoId: who?.objectId ?? "",
      ownedOrgKeys,
      adminScope: adminScopeFor(me?.role, me?.site),
    };
    let list = initiatives;
    const metricState = buildMetricState(initiatives, allBoards, initRows, await loadMetricLasts(initiatives, allBoards).catch(() => new Map()));
    // state colours resolve through the SITE STATE PALETTE (ui-standard §1)
    const stateColors = paletteMap(palettes.states);
    const ragColor = (rag: "green" | "amber" | "red" | "grey"): string => stateColors[ragPaletteKey(rag)] ?? "#9a948a";
    // the status rule (2026-11-17): the edge, the chip and the Gantt's
    // group edge all read one status. An initiative that is not active
    // has none — it paints neutral.
    const statusOfInitiative = (i: Initiative): StatusResult => statusOf(i, initActions, statusMetricsOf(metricState.get(i.id)), prSettings.status, todayIso());
    const stateHex = (st: PriorityState): string => statusColour(st, prSettings.status, stateColors);
    const edgeOf = (i: Initiative): string => (i.status === "active" ? stateHex(statusOfInitiative(i).state) : stateHex("none"));
    /** Flagged or off track says so beside the title, its reasons on
     *  hover; on track says nothing. `short`: the tile's glyph-only chip. */
    const stateChip = (i: Initiative, short = false): HTMLElement | null => {
      if (i.status !== "active") return null;
      const st = statusOfInitiative(i);
      if (st.state === "good") return null;
      const chip = statusChip(st, stateHex);
      chip.classList.add("app-im-chip");
      if (i.flagNote !== "" && st.state === "flagged") chip.title = `Support needed: ${i.flagNote}${chip.title !== "" ? `\n${chip.title}` : ""}`;
      if (short) {
        if (chip.title === "") chip.title = chip.textContent ?? "";
        chip.textContent = st.state === "flagged" ? "⚐" : "✕";
      }
      return chip;
    };

    interface Filters {
      pdca: string;
      period: string;
      status: string;
      flagOnly: boolean;
      method: string;
      teamScope: string; // "" = my orgs + children (all owned keys)
      /** A process node id: the initiative's process is it or beneath it. */
      process: string;
    }
    const f: Filters = {
      pdca: sessionImp?.pdca ?? "",
      period: session.period ?? currentPeriod,
      status: (sessionImp?.status ?? "active") as Filters["status"],
      flagOnly: sessionImp?.flagOnly ?? false,
      method: sessionImp?.method ?? "",
      teamScope: sessionImp?.teamScope ?? "",
      process: sessionImp?.process ?? "",
    };
    // the process model (term-store-proposal §6): the filter and the chip
    const processTree = buildProcessTree(processNodes);
    const processRootOfScope = () => (scope.site !== "" ? siteRootOf(processTree, scope.site) : "");
    const processText = (i: Initiative): string => (i.processNodeId ?? "") === "" ? "" : processPathLabel(processTree, i.processNodeId ?? "", i.org.site);
    let viewMode: "list" | "tiles" | "gantt" = sessionImp?.viewMode ?? "list";
    let ganttUnmount: (() => void) | null = null;
    let search = sessionImp?.search ?? "";

    const visible = (i: Initiative): boolean =>
      (search === "" || i.title.toLowerCase().includes(search.toLowerCase())) &&
      orgsOf(i).some(inScope) &&
      liveIn(i, f.period) &&
      (f.status === "all" || i.status === f.status) &&
      (!f.flagOnly || i.flag !== "") &&
      (f.method === "" || i.method === f.method) &&
      // a site in scope filters by its own tree; across sites (company
      // scope) the pick is a CENTRAL node and an initiative matches
      // through its site node's link (features-plan-2026-10-29 §1)
      (f.process === "" || (scope.site !== "" ? inSubtree(processTree, i.processNodeId ?? "", f.process) : inCentralSubtree(processTree, i.processNodeId ?? "", f.process))) &&
      (f.pdca === "" || i.snapshot.stages.find((s) => s.id === i.stageId)?.pdca === f.pdca);

    /** The Documents-register filters popover: anchored under the Filters
     *  button, groups of pills, Clear all / Done. It lives on the body so
     *  a pill click can repaint the list beneath without closing it. */
    let filterPop: HTMLElement | null = null;
    let paintFilterPop: () => void = () => {};
    const closeFilterPop = () => {
      filterPop?.remove();
      filterPop = null;
    };
    const render = () => {
      // where the person is, for the session (sessionView.ts)
      rememberShared(orgKey(scope), f.period);
      rememberImprovement({ pdca: f.pdca, status: f.status, flagOnly: f.flagOnly, method: f.method, teamScope: f.teamScope, process: f.process, viewMode, search });
      clear(wrap);
      wrap.appendChild(renderHeader());
      if (filterPop) paintFilterPop();
      ganttUnmount?.();
      ganttUnmount = null;
      const groups = groupInitiatives(list.filter(visible), viewer);
      if (viewMode === "gantt") {
        // the whole current scope (crumb + filters) on one timeline; the
        // control's own List switch is hidden — the header seg is the switch
        const host = el("div", "app-im-gantthost");
        wrap.appendChild(host);
        void import("./gantt").then((m) => {
          if (!host.isConnected) return;
          ganttUnmount = m.mountGantt({
            host,
            scopes: [{ key: "org", label: orgName(scope) }],
            initiatives: groups.all,
            actions: initActions,
            palette: stateColors,
            edgeColour: edgeOf,
            canEdit: true,
            actor: actor(),
            hideViewSwitch: true,
            onChanged: () => {},
            // a click on an action opens the dialog every card uses — it
            // could only "Set dates" here (issue 11, 2026-11-16)
            onEdit: (a) => {
              const i = groups.all.find((x) => actionBelongsTo(x, a));
              const near = new Map<string, { whoId: string; who: string }>();
              for (const list of Object.values(i?.roles ?? {})) for (const p of list) if (p.whoId !== "") near.set(p.whoId, { whoId: p.whoId, who: p.who });
              void import("../actions/quickAdd").then((m) => m.openActionEditor(a, [...near.values()], () => render()));
            },
            onOpenBoard: (boardId) => {
              rememberBoardOrigin("#/improvement");
              window.location.hash = boardHash(boardId);
            },
          });
        });
        if (groups.hiddenConfidential > 0) wrap.appendChild(note(`· ${groups.hiddenConfidential} confidential in this org`));
        return;
      }
      // a phone (M4): the eight-column list has no room — tiles stand in
      if (viewMode === "tiles" || (viewMode === "list" && isPhoneWindow())) {
        // wall view (design 1.2): tiles for at-distance reading
        const grid = el("div", "app-im-tiles");
        for (const i of groups.all) grid.appendChild(tileFor(i));
        if (groups.all.length === 0) grid.appendChild(note(`No initiatives for ${f.period || "this period"} in this org.`));
        if (groups.hiddenConfidential > 0) grid.appendChild(note(`· ${groups.hiddenConfidential} confidential in this org`));
        wrap.appendChild(grid);
        return;
      }
      const table = el("div", "app-im-table");
      // 1 — my initiatives
      table.appendChild(groupHead(`My initiatives · ${groups.mine.length}`));
      if (groups.mine.length === 0) table.appendChild(note("You don't hold a role on any initiative yet."));
      else table.appendChild(columnHead());
      for (const i of groups.mine) table.appendChild(rowFor(i));
      // 2 — owned by my team (org owners only)
      if (ownedOrgKeys.length > 0) {
        const scoped = f.teamScope === "" ? groups.team : groups.team.filter((i) => orgsOf(i).some((o) => orgKeyOf(o).startsWith(f.teamScope.replace(/\|+$/, ""))));
        const head = groupHead(`Owned by my team · ${scoped.length}`);
        // the owned orgs as a cascade (Ben, 2026-10-12): a node is
        // choosable when it is owned or sits under an owned node
        const ownedPrefixes = ownedOrgKeys.map((k) => k.replace(/\|+$/, ""));
        const scopeHost = el("span", "app-im-scope");
        mountOrgCascade(scopeHost, {
          tree,
          value: f.teamScope === "" ? orgRef() : orgFromKey(f.teamScope),
          selectClass: "app-input",
          allowed: (o) => ownedPrefixes.some((p) => orgKey(o).replace(/\|+$/, "").startsWith(p) || p.startsWith(orgKey(o).replace(/\|+$/, ""))),
          onChange: (o) => {
            f.teamScope = orgKey(o).replace(/\|+$/, "") === "" ? "" : orgKey(o);
            render();
          },
        });
        head.appendChild(scopeHost);
        table.appendChild(head);
        if (scoped.length === 0) table.appendChild(note(`No initiatives in your orgs for ${f.period || "this period"}.`));
        else table.appendChild(columnHead());
        for (const i of scoped.slice(0, 5)) table.appendChild(rowFor(i));
        if (scoped.length > 5) {
          const more = btn(`Show all ${scoped.length} ›`, "app-link app-im-more");
          more.addEventListener("click", () => {
            for (const i of scoped.slice(5)) table.insertBefore(rowFor(i), more);
            more.remove();
          });
          table.appendChild(more);
        }
      }
      // 3 — everything I can see
      const mineIds = new Set(groups.mine.map((x) => x.id));
      const others = groups.all.filter((x) => !mineIds.has(x.id));
      table.appendChild(groupHead(`Other initiatives · ${others.length}`));
      if (others.length === 0) table.appendChild(note(`No other initiatives for ${f.period || "this period"}.`));
      else table.appendChild(columnHead());
      for (const i of others) table.appendChild(rowFor(i));
      if (groups.hiddenConfidential > 0) table.appendChild(note(`· ${groups.hiddenConfidential} confidential in this org`));
      wrap.appendChild(table);
    };

    const groupHead = (label: string): HTMLElement => {
      const h = el("div", "app-im-group");
      h.appendChild(el("span", "app-im-group-label", label));
      return h;
    };

    /** Done / future / late for one initiative — the same circles the
     *  executive summary and the priority popup draw. */
    const actionCountsCell = (i: Initiative, cls: string): HTMLElement => {
      const cell = el("div", cls);
      const counts = actionCountsFor(i, initActions, todayIso());
      if (counts.total === 0) {
        cell.classList.add("app-cp-muted");
        cell.textContent = "no actions";
      } else {
        cell.appendChild(actionCircles(counts, stateHex, "s", false));
      }
      return cell;
    };

    /** The list's header — the shared initiative row's own (the same
     *  columns as the priority popup and the executive summary, plus Org
     *  and Your role(s)). */
    const columnHead = (): HTMLElement => initiativeRowHead("register", ["Org", "Your role(s)"], 1);
    const note = (text: string): HTMLElement => el("div", "app-settings-note app-im-note", text);

    /** The Documents-tab header standard: title + scope subtitle + count
     *  on the left; ＋ primary · Filters · List|Tiles · on the right. The
     *  filter selects live behind the Filters button, not in a raw row. */
    const activeFilterCount = (): number =>
      [f.pdca !== "", f.status !== "active", f.method !== "", f.process !== "", f.flagOnly, f.period !== currentPeriod].filter(Boolean).length;
    /** The Priorities-header pattern (Ben, 2026-08-23): "Improvement
     *  Initiatives | Company › Site ▾" — lead in the accent, ancestors
     *  click to go up, the current node's ▾ opens Switch · Descend ·
     *  Browse all…. The crumb IS the org scope (at-or-below), so there
     *  is no Site filter group and no subtitle/count lines. */
    const openOrgMenu = (anchor: HTMLElement) => {
      document.querySelectorAll(".app-cp-menu").forEach((m) => m.remove());
      const menu = el("div", "app-cp-menu app-cp-orgmenu");
      const row = (o: OrgRef, here: boolean) => {
        const b = btn((here ? "✓ " : "") + orgName(o), "app-cp-menu-item app-cp-orgmenu-item" + (here ? " app-cp-orgmenu-here" : ""));
        b.addEventListener("click", () => {
          menu.remove();
          if (!here) {
            scope = o;
            render();
          }
        });
        menu.appendChild(b);
      };
      const sibs = siblingOrgs(tree, scope);
      if (sibs.length > 1) {
        menu.appendChild(el("div", "app-cp-menu-h", `Switch ${orgLevel(scope)}`));
        for (const o of sibs) row(o, sameOrg(o, scope));
      }
      const kids = childOrgs(tree, scope);
      if (kids.length > 0) {
        menu.appendChild(el("div", "app-cp-menu-h", "Descend"));
        for (const o of kids) row(o, false);
      }
      const browse = btn("Browse all…", "app-cp-menu-item app-cp-orgmenu-browse");
      browse.addEventListener("click", () => {
        menu.remove();
        void pickOrg(wrap, tree, scope).then((o) => {
          if (o) {
            scope = o;
            render();
          }
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
    const renderHeader = (): HTMLElement => {
      const head = el("div", "app-im-head");
      const title = el("div", "app-cp-tvorg");
      title.appendChild(el("span", "app-cp-tvorg-lead", "Improvement Initiatives"));
      title.appendChild(el("span", "app-cp-tvorg-sep", " | "));
      const crumbs = el("span", "app-cp-crumbs app-cp-tvorg-chain");
      const path = orgPath(scope);
      path.forEach((node, idx) => {
        if (idx > 0) crumbs.appendChild(el("span", "app-cp-crumb-sep", "›"));
        const last = idx === path.length - 1;
        const b = btn(orgName(node) + (last ? " ▾" : ""), "app-cp-crumb" + (last ? " app-cp-crumb-here" : ""));
        b.title = last ? "Switch, descend or browse" : `Go up to ${orgName(node)}`;
        b.addEventListener("click", () => {
          if (last) openOrgMenu(b);
          else {
            scope = node;
            render();
          }
        });
        crumbs.appendChild(b);
      });
      title.appendChild(crumbs);
      head.appendChild(title);
      const add = btn("＋ Initiative", "app-btn app-btn-primary app-cp-tvbtn");
      add.addEventListener("click", () => openCreate());
      head.appendChild(add);
      // search sits between ＋ Initiative and Filters (Ben, 2026-08-20)
      const input = el("input", "app-input app-im-search-input") as HTMLInputElement;
      input.type = "search";
      input.placeholder = "Search initiatives…";
      input.value = search;
      input.addEventListener("input", () => {
        search = input.value.trim();
        const at = input.selectionStart;
        render();
        const fresh = wrap.querySelector<HTMLInputElement>(".app-im-search-input");
        fresh?.focus();
        if (fresh && at !== null) fresh.setSelectionRange(at, at);
      });
      head.appendChild(input);
      const filters = btn(
        activeFilterCount() > 0 ? `Filters · ${activeFilterCount()}` : "Filters",
        "app-btn app-docs-filtersbtn app-cp-tvbtn" + (activeFilterCount() > 0 ? " app-docs-filtersbtn-on" : "")
      );
      filters.title = "Filter the register";
      filters.addEventListener("click", () => {
        if (filterPop) {
          closeFilterPop();
          return;
        }
        openFilters(filters);
      });
      head.appendChild(filters);
      // the Documents-tab segmented control (accent fill on the active side)
      const seg = el("div", "app-docs-seg");
      for (const [v, l] of [["list", "List"], ["tiles", "Tiles"], ["gantt", "Gantt"]] as const) {
        const b = btn(l, "app-docs-segbtn" + (viewMode === v ? " app-docs-segbtn-on" : ""));
        b.dataset.mode = v; // the phone hides List (CSS) — tiles stand in
        b.addEventListener("click", () => {
          viewMode = v;
          render();
        });
        seg.appendChild(b);
      }
      head.appendChild(seg);
      return head;
    };

    const openFilters = (anchor: HTMLElement) => {
      closeFilterPop();
      const menu = el("div", "app-docs-menu app-docs-filterpop");
      const body = el("div", "app-docs-filterpop-body");
      menu.appendChild(body);
      filterPop = menu;
      const paintPop = () => {
        clear(body);
        const group = (label: string): HTMLElement => {
          const g = el("div", "app-docs-fgroup");
          g.appendChild(el("div", "app-docs-fgroup-label", label));
          const pills = el("div", "app-docs-fpills");
          g.appendChild(pills);
          body.appendChild(g);
          return pills;
        };
        /** One pill; `on` repaints both the list and this popover. */
        const pill = (into: HTMLElement, label: string, on: boolean, pick: () => void) => {
          const pb = btn(label, "app-docs-fpill" + (on ? " app-docs-fpill-on" : ""));
          pb.setAttribute("aria-pressed", String(on));
          pb.addEventListener("click", () => {
            pick();
            render();
          });
          into.appendChild(pb);
        };
        /** A group whose pills are exclusive; clicking the lit pill
         *  clears to `empty` (the "All" reading) like the Documents pills. */
        const exclusive = (label: string, opts: [string, string][], cur: string, empty: string, set: (v: string) => void) => {
          const pills = group(label);
          for (const [v, l] of opts) pill(pills, l, cur === v, () => set(cur === v ? empty : v));
        };
        exclusive("Stage", [["plan", "Plan"], ["do", "Do"], ["check", "Check"], ["act", "Act"]], f.pdca, "", (v) => {
          f.pdca = v;
        });
        const periods = periodsOnOffer(prSettings.period, currentPeriod, list.map((i) => ({ start: i.period, end: i.toPeriod })));
        exclusive("Period", periods.map((p) => [p, p] as [string, string]), f.period, "", (v) => {
          f.period = v;
        });
        // status always has one pill lit (like Documents' "Modified")
        const statusPills = group("Status");
        for (const [v, l] of [["active", "Active"], ["completed", "Completed"], ["archived", "Archived"], ["all", "All"]] as const) {
          pill(statusPills, l, f.status === v, () => {
            f.status = v;
          });
        }
        if (imp.methods.length > 0) {
          exclusive("Method", imp.methods.map((m) => [m, m] as [string, string]), f.method, "", (v) => {
            f.method = v;
          });
        }
        // Process: the scope site's areas and processes (a pick includes
        // everything beneath it); at company level the CENTRAL tree, so
        // sites compare on one process (features-plan-2026-10-29 §1)
        if (scope.site === "" && processTree.types.some((t) => !t.archived)) {
          const procGroup = group("Process (across sites)");
          const host = el("div", "app-im-procfilter");
          mountCentralPicker(host, {
            tree: processTree,
            value: f.process,
            selectClass: "app-input",
            onChange: (v) => {
              f.process = v;
              render();
            },
          });
          procGroup.appendChild(host);
        } else if (processRootOfScope() !== "" && flatProcessOptions(processTree, processRootOfScope(), scope.site, 1).length > 0) {
          // the cascading picker, never a flat list (Ben, 2026-10-12)
          const procGroup = group("Process");
          const host = el("div", "app-im-procfilter");
          mountProcessPicker(host, {
            tree: processTree,
            siteRoots,
            site: scope.site,
            value: f.process,
            selectClass: "app-input",
            onChange: (v) => {
              f.process = v;
              render();
            },
          });
          procGroup.appendChild(host);
        }
        const flagPills = group("Flags");
        pill(flagPills, "⚑ Support needed only", f.flagOnly, () => {
          f.flagOnly = !f.flagOnly;
        });
        const foot = el("div", "app-docs-fpop-foot");
        const clearAll = btn("Clear all", "app-btn");
        clearAll.addEventListener("click", () => {
          // the site is the page's scope (the title says it), so it stays
          f.pdca = "";
          f.period = currentPeriod;
          f.status = "active";
          f.method = "";
          f.process = "";
          f.flagOnly = false;
          render();
        });
        const done = btn("Done", "app-btn app-btn-primary");
        done.addEventListener("click", () => closeFilterPop());
        foot.append(clearAll, done);
        body.appendChild(foot);
      };
      paintFilterPop = paintPop;
      paintPop();
      const r = anchor.getBoundingClientRect();
      menu.style.top = `${r.bottom + 4}px`;
      menu.style.left = `${Math.max(8, Math.min(r.left, window.innerWidth - 420))}px`;
      document.body.appendChild(menu);
    };
    // outside click / Escape close the popover (the Documents behaviour)
    const onFilterPointer = (e: PointerEvent) => {
      if (filterPop && !filterPop.contains(e.target as Node)) {
        // the Filters button itself toggles; let its click handler decide
        const t = e.target as HTMLElement;
        if (t.closest?.(".app-docs-filtersbtn")) return;
        closeFilterPop();
      }
    };
    document.addEventListener("pointerdown", onFilterPointer);
    cleanups.push(() => document.removeEventListener("pointerdown", onFilterPointer));
    const onFilterKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && filterPop) {
        e.stopPropagation();
        closeFilterPop();
      }
    };
    document.addEventListener("keydown", onFilterKey, true);
    cleanups.push(() => document.removeEventListener("keydown", onFilterKey, true));
    cleanups.push(closeFilterPop);

    // the template and method, clearly on every row and tile (Ben,
    // 2026-10-08): "Template name · Method" as a quiet tinted chip; the
    // method alone when the template is gone; nothing when neither reads
    const templateName = new Map(templates.map((t) => [t.id, t.name] as [string, string]));
    const templateChip = (i: Initiative): HTMLElement | null => {
      const name = templateName.get(i.templateId) ?? "";
      const method = i.method.trim();
      const text = name !== "" && method !== "" && method.toLowerCase() !== name.toLowerCase() ? `${name} · ${method}` : name !== "" ? name : method;
      if (text === "") return null;
      const chip = el("span", "app-im-chip app-im-chip-tpl", text);
      chip.title = [name !== "" ? `Template: ${name}` : "Template no longer exists", method !== "" ? `Method: ${method}` : ""].filter((x) => x !== "").join("\n");
      return chip;
    };

    /** What the shared row and its metric tiles paint with. */
    const rowPaint = { colour: stateHex, metricColour: (rag: "green" | "amber" | "red") => ragColor(rag) };
    /** A list row — the ONE initiative row (initiativeRow.ts; Ben,
     *  2026-11-17: the popup, this list and the executive summary each
     *  drew an initiative their own way). This screen adds Org and Your
     *  role(s): the list spans organisations. */
    const rowFor = (i: Initiative): HTMLElement => {
      // the grey line = owner · priority statement · process · template
      const primary = i.priorities.find((p) => p.primary) ?? i.priorities[0] ?? null;
      const priorityText = primary ? (priorityStatement.get(primary.priorityId) ?? "Linked priority") : "Other";
      const tpl = templateChip(i);
      const sub = [ownersLabel(i, 3), priorityText, processText(i), tpl?.textContent ?? ""].filter((x) => x !== "").join(" · ");
      // org column: department (or site), full chain on hover
      const also = i.alsoOrgs ?? [];
      const orgCell = el("div", "app-im-cell", (i.org.department || i.org.site) + (also.length > 0 ? ` +${also.length}` : ""));
      orgCell.title = [[i.org.company, i.org.site, i.org.department, i.org.area].filter((x) => x !== "").join(" › "), ...also.map((o) => `also: ${[o.site, o.department, o.area].filter((x) => x !== "").join(" › ")}`)].join("\n");
      // your role(s) on this initiative
      const roleKeys = myRoles(i, viewer.whoId);
      const rolesCell = el("div", "app-im-cell" + (roleKeys.length === 0 ? " app-cp-muted" : ""));
      rolesCell.textContent = roleKeys.length > 0 ? roleKeys.map((k) => i.snapshot.roleLabels[k] ?? k).join(", ") : "—";
      // under the stage: who an open gate waits on, else the next gate's
      // date (Ben, 2026-08-26: replaces "Next gate")
      const stage = i.snapshot.stages.find((s) => s.id === i.stageId) ?? null;
      let stageNote: InitiativeRowData["stageNote"];
      if (i.status === "active" && !i.singleAction && stage) {
        const pending = i.gate;
        if (pending) {
          const openRoles = pending.approverRoles.filter((r) => !pending.decisions[r]);
          const mine = openRoles.filter((r) => actorsForRole(i, r).some((p) => p.whoId === viewer.whoId));
          if (mine.length > 0) stageNote = { text: "awaiting you", tone: "mine" };
          else if (openRoles.length > 0) stageNote = { text: `awaiting ${openRoles.map((r) => i.snapshot.roleLabels[r] ?? r).join(", ")}`, tone: "muted", title: "A gate approval has been requested" };
        } else {
          const ng = nextGateFor(i);
          if (ng !== null && ng.target !== "") stageNote = { text: dayLabel(ng.target), tone: ng.target < todayIso() ? "late" : "muted", title: "The stage's target date" };
        }
      }
      const kebabCell = el("span", "app-ir-kebabcell");
      const kebab = btn("⋮", "app-cp-kebab app-im-kebab");
      kebab.addEventListener("click", (e) => {
        e.stopPropagation();
        openRowMenu(kebab, i);
      });
      kebabCell.appendChild(kebab);
      const active = i.status === "active";
      return initiativeRow(
        {
          title: i.title,
          sub,
          subTitle: [ownersTitle(i) !== "" ? `Owner: ${ownersTitle(i)}` : "", tpl?.title ?? ""].filter((x) => x !== "").join("\n"),
          status: active ? statusOfInitiative(i) : null,
          statusText: active ? "" : i.status,
          flagNote: i.flagNote,
          // primary belongs to a priority; this list spans priorities
          primary: false,
          tags: i.confidential ? ["◈ Confidential"] : [],
          stageName: i.singleAction ? "single action" : (stage?.name ?? ""),
          stagePdca: active && !i.singleAction && stage ? stage.pdca : "",
          stageNote,
          counts: active ? actionCountsFor(i, initActions, todayIso()) : null,
          metrics: metricState.get(i.id)?.values ?? [],
        },
        { layout: "register", ...rowPaint, extra: [orgCell, rolesCell], tools: [kebabCell], onOpen: () => openInitiative(i) }
      );
    };

    // (the working folder is NOT a shortcut on the list or tiles — Ben,
    // 2026-10-08; it lives on the initiative's pane and the links card)
    const tileFor = (i: Initiative): HTMLElement => {
      const tile = el("div", "app-im-tile");
      tile.style.borderTopColor = edgeOf(i);
      tile.appendChild(el("div", "app-im-tile-title", i.title));
      const stage = i.snapshot.stages.find((s) => s.id === i.stageId) ?? null;
      const line = el("div", "app-im-tile-line");
      const tileTpl = templateChip(i);
      if (tileTpl) line.appendChild(tileTpl);
      if (i.singleAction) line.appendChild(el("span", "app-cp-muted", "single action"));
      else if (stage) {
        const chip = el("span", "app-im-stagechip", stage.name);
        chip.style.color = PDCA_TOKENS[stage.pdca].fg;
        chip.style.background = PDCA_TOKENS[stage.pdca].bg;
        line.appendChild(chip);
      }
      const tileChip = stateChip(i, true);
      if (tileChip) line.appendChild(tileChip);
      tile.appendChild(line);
      const mv = (metricState.get(i.id)?.values ?? [])[0] ?? null;
      tile.appendChild(
        el("div", "app-im-tile-metric" + (mv && mv.display !== "" ? "" : " app-cp-muted"), mv && mv.display !== "" ? `${mv.name} ${mv.display}${mv.target !== null ? ` / ${mv.target}${mv.unit}` : ""}${mv.stale !== "" ? ` · ◷ ${mv.stale.toLowerCase()}` : ""}` : "No metric value")
      );
      tile.appendChild(el("div", "app-im-tile-owner", [ownersLabel(i) || "no owner", i.org.department || i.org.site, processText(i)].filter((x) => x !== "").join(" · ")));
      // the same action circles as the list's column
      if (i.status === "active") tile.appendChild(actionCountsCell(i, "app-im-tile-actions"));
      tile.addEventListener("click", () => openInitiative(i));
      return tile;
    };

    const openInitiative = (i: Initiative) => {
      if (i.boardId !== "") {
        rememberBoardOrigin("#/improvement");
        window.location.hash = boardHash(i.boardId);
      }
    };

    const openRowMenu = (anchor: HTMLElement, i: Initiative) => {
      // the shared initiative row menu (issue 32) — the priority popup
      // shows the same one
      void import("./rowMenu").then(({ openInitiativeRowMenu }) => {
        cleanups.push(
          openInitiativeRowMenu(anchor, i, {
            host: wrap,
            viewer: { whoId: viewer.whoId, adminScope: viewer.adminScope },
            actor,
            roster,
            currentPeriod,
            onOpen: openInitiative,
            onChanged: () => {
              void listInitiatives().then((fresh) => {
                list = fresh;
                render();
              });
            },
          })
        );
      });
    };

    const actor = () => ({ whoId: viewer.whoId, who: me?.who ?? who?.name ?? "" });
    /** Promote-to-tree (metric rework): superadmin or the Value-drivers editor role's site fillers. */
    const canPromoteDrivers = (): boolean => {
      if (me?.role === "superadmin") return true;
      const role = imp.standardRoles.find((r) => r.key === imp.vdtEditorRole);
      return role !== undefined && roleFillersAt(role, scope.site || (me?.site ?? "")).some((p) => p.whoId === viewer.whoId);
    };

    // ---- create flow (design 1.3): three steps in one modal ---------------------

    const openCreate = (lockedPriority?: { priorityId: string; label: string }) => {
      const scrim = el("div", "app-modal-overlay");
      const box = el("div", "app-modal app-modal-wide app-modal-pinned app-im-create");
      scrim.appendChild(box);
      wrap.appendChild(scrim);
      const close = () => scrim.remove();
      // a form never closes on a click outside it (Ben, 2026-10-07)
      let chosen: InitiativeTemplate | null = null;

      const paintPicker = () => {
        clear(box);
        box.appendChild(el("div", "app-modal-title", "Pick how you'll run this"));
        const grid = el("div", "app-im-tplgrid");
        const usable = templates.filter((t) => t.active && (t.company === "" || t.company === (scope.company || siteCo[me?.site ?? ""] || "")));
        const ordered = [...usable.filter((t) => !t.singleAction), ...usable.filter((t) => t.singleAction)];
        for (const t of ordered) {
          const used = list.filter((x) => x.templateId === t.id).length;
          const card = el("button", "app-im-tplcard") as HTMLButtonElement;
          card.type = "button";
          const head = el("div", "app-im-tplcard-head");
          head.appendChild(el("span", "app-tw-card-name", t.name));
          head.appendChild(el("span", "app-tw-card-method" + (t.singleAction ? " app-tw-card-method-single" : ""), t.singleAction ? `${t.method} · no board` : t.method));
          card.appendChild(head);
          if (t.singleAction) card.appendChild(el("div", "ltk-mw-help", "One action instead — no board, no stages"));
          else {
            const strip = el("div", "app-tw-stepper app-tw-stepper-small");
            for (const c of stepperChips(t)) {
              const chip = el("span", "app-tw-step" + (c.pdca === null ? " app-tw-step-complete" : ""), `${c.gated ? "⚑ " : ""}${c.label}`);
              if (c.pdca !== null) {
                chip.style.color = PDCA_TOKENS[c.pdca].fg;
                chip.style.background = PDCA_TOKENS[c.pdca].bg;
              }
              strip.appendChild(chip);
            }
            card.appendChild(strip);
          }
          if (t.description !== "") card.appendChild(el("div", "ltk-mw-help", t.description));
          card.appendChild(el("div", "app-cp-muted app-im-tplused", `used ${used} time${used === 1 ? "" : "s"}`));
          card.addEventListener("click", () => {
            chosen = t;
            paintHeaderForm();
          });
          grid.appendChild(card);
        }
        if (ordered.length === 0) grid.appendChild(el("div", "app-settings-note", "No active templates — a super admin authors them in Settings → Improvement."));
        // the grid scrolls under the pinned footer (many templates)
        const pickBody = el("div", "app-cp-modal-body");
        pickBody.appendChild(grid);
        box.appendChild(pickBody);
        const foot = el("div", "app-modal-footer");
        const cancel = btn("Cancel", "app-link");
        cancel.addEventListener("click", close);
        foot.appendChild(cancel);
        box.appendChild(foot);
      };

      const paintHeaderForm = () => {
        const t = chosen!;
        clear(box);
        // the picker needs the wide grid; the form takes the form width
        box.classList.remove("app-modal-wide");
        box.classList.add("app-modal-form");
        box.appendChild(el("div", "app-modal-title", `New ${t.name}`));
        const body = el("div", "app-cp-modal-body");
        box.appendChild(body);
        const defaultSite = scope.site || (me?.site ?? "") || sites[0]?.site || "";
        // the shared header form (initiativeForm.ts): the same six groups
        // as Edit details, so the two never drift
        const form = renderInitiativeForm({
          host: body,
          dialogHost: wrap,
          mode: "create",
          sites,
          siteCo,
          roster,
          imp,
          roleDefs: activeRoles(t),
          fields: [...imp.standardFields, ...t.fields],
          singleAction: t.singleAction,
          metricRule: t.metricRule,
          initial: {
            title: "",
            description: "",
            // the tab's organisational context, department and area
            // included (Ben, 2026-10-31) — the priority picker opens on it
            org: { company: siteCo[defaultSite] ?? "", site: defaultSite, department: scope.site === defaultSite ? scope.department : "", area: scope.site === defaultSite ? scope.area : "" },
            alsoOrgs: [],
            // a handoff from a priority arrives pre-linked and locked
            priorities: lockedPriority ? [{ priorityId: lockedPriority.priorityId, primary: true, label: lockedPriority.label, locked: true }] : [],
            roles: {},
            fieldValues: {},
            metrics: [],
            confidential: false,
            endorsement: false,
          },
          fiCtx: { people: assigneePeople([], roster, "search"), palette: stateColors },
          processes: { tree: processTree, siteRoots },
          canPromote: canPromoteDrivers(),
          loadPriorities: (company) => loadCascade(company).then((data) => data.priorities),
          linkRule: () => import("../store/linkRule").then((m) => m.linkRuleForViewer()),
        });
        const foot = el("div", "app-modal-footer");
        const back = btn("‹ Back", "app-link");
        back.addEventListener("click", () => {
          box.classList.remove("app-modal-form");
          box.classList.add("app-modal-wide");
          paintPicker();
        });
        const cancel = btn("Cancel", "app-link");
        cancel.addEventListener("click", close);
        const create = btn("Create initiative", "app-btn app-btn-primary");
        create.addEventListener("click", () => {
          void (async () => {
            if (form.validate().length > 0) return;
            const v = form.read();
            const draft = {
              title: v.title,
              description: v.description,
              org: v.org,
              alsoOrgs: v.alsoOrgs,
              processNodeId: v.processNodeId ?? "",
              confidential: v.confidential,
              flag: "" as const,
              flagNote: "",
              endorsement: v.endorsement,
              period: f.period !== "" ? f.period : currentPeriod,
              toPeriod: "",
              roles: v.roles,
              priorities: v.priorities.map((l) => ({ priorityId: l.priorityId, primary: l.primary })),
              fieldValues: v.fieldValues,
              metrics: v.metrics,
            };
            create.disabled = true;
            const made = await createInitiative(t, draft, actor());
            if (t.singleAction) {
              // the lightweight variant writes ONE action linked to the header
              const a = newAction({ source: "initiative", sourceId: made.id });
              a.description = draft.title;
              const owner = (v.roles.owner ?? [])[0];
              if (owner) a.assignees = [{ whoId: owner.whoId, who: owner.who, done: false }];
              a.initiativeId = made.id;
              a.instanceId = `improvement:${made.id}`;
              await upsertActions([a]);
            }
            list = await listInitiatives();
            // the first initiative to call a priority its primary claims the
            // (the priority's primary slot is no longer claimed here — an
            // initiative becomes a priority's primary only when someone
            // stars it; Ben, 2026-11-16, issue 8)
            close();
            if (made.boardId !== "") {
              rememberBoardOrigin("#/improvement");
              window.location.hash = boardHash(made.boardId);
            }
            else render();
          })().catch((e) => {
            form.showError(e instanceof Error ? e.message : String(e));
            create.disabled = false;
          });
        });
        foot.append(back, cancel, create);
        box.appendChild(foot);
        form.focus();
      };

      paintPicker();
      cleanups.push(close);
    };

    render();
    // handed over from a priority's overlay (design 1.3: pre-filled and
    // locked to the source priority)
    try {
      const pending = sessionStorage.getItem("ltk-pending-init-priority");
      if (pending) {
        sessionStorage.removeItem("ltk-pending-init-priority");
        const o = JSON.parse(pending) as { priorityId?: string; label?: string };
        if (typeof o.priorityId === "string" && o.priorityId !== "") {
          openCreate({ priorityId: o.priorityId, label: o.label ?? "linked priority" });
        }
      }
    } catch {
      /* fine */
    }
  })().catch((err) => {
    stopLoading();
    wrap.appendChild(el("div", "app-board-note", `Improvement could not load: ${err instanceof Error ? err.message : String(err)}`));
  });

  return () => {
    dead = true;
    for (const fn of cleanups) fn();
    wrap.remove();
  };
}

export type { ImprovementSettings, RosterPerson };
export { STANDARD_ROLES };
