// The priority popup's Actions tab (issues 5 and 11, 2026-11-16): the
// SAME action card the boards use — List | Kanban | Gantt, the full
// action dialog, Add action — over the actions of every initiative under
// the priority, a heading per initiative. It replaced a bare Gantt whose
// list rows could only "Set dates".
//
// Who may edit: whoever could on the initiative's own board — any
// signed-in person, while the initiative is active (the popup lists
// active initiatives only). Managing the priority's org is not asked.

import { ActionBoardEditor } from "../../../controls/ActionBoard/editor";
import type { LtkAction } from "../../../shared/schema/actions";
import { assigneePeople } from "../../../shared/schema/people";
import { defaultTheme } from "../../../shared/tokens";
import { el } from "../../../shared/ui/dom";
import type { Initiative } from "../improvement/initiativeModel";
import type { RosterPerson } from "../store/mappers";
import { upsertActions } from "../store/actions";
import { changedSince, homesFor, initiativeOf, OWN_LABEL, snapshotOf, stampNew, tabActions } from "./actionsTabModel";

export interface PriorityActionsOpts {
  host: HTMLElement;
  /** The active initiatives under the priority (and its descendants). */
  initiatives: Initiative[];
  /** EVERY initiative action the screen holds — the shared array: a new
   *  action is pushed onto it so the screen's own copy stays whole. */
  actions: LtkAction[];
  roster: RosterPerson[];
  palette: Record<string, string>;
  /** An initiative's status colour (the Gantt's group edge). */
  edgeColour: (i: Initiative) => string;
  actor: { whoId: string; who: string };
  onOpenBoard: (boardId: string) => void;
  /** An action was written: the screen's tallies are stale. */
  onWritten: () => void;
  /** The priority's OWN actions (decision 1 of the 2026-11-18 proposal):
   *  listed first under "This priority". Absent on a surface that shows
   *  initiatives only. */
  own?: {
    /** The key they carry — this priority, at the org in view. */
    key: string;
    /** The org's name, kept on the action for the lists that show it. */
    orgName: string;
    /** The screen's shared array of every priority action. */
    actions: LtkAction[];
    /** Org managers only may raise one (decision 3). */
    canRaise: boolean;
  };
}

/** The view each priority's tab was left on, for the session. */
let lastView: "list" | "kanban" | "gantt" | null = null;

export function mountPriorityActions(o: PriorityActionsOpts): () => void {
  const ownKey = o.own?.key ?? "";
  const isOwn = (a: LtkAction): boolean => ownKey !== "" && a.instanceId === ownKey;
  const mine = tabActions(o.own ? o.own.actions.filter(isOwn) : [], o.initiatives, o.actions);
  const homes = homesFor(o.initiatives, o.own?.canRaise ? ownKey : "");
  let seen = snapshotOf(mine);
  let writing: Promise<void> = Promise.resolve();

  const editor = new ActionBoardEditor(o.host, {
    onChange: (now) => {
      for (const a of now) {
        if (seen.has(a.id)) continue;
        // raised here: its home, its initiative, and a place in the
        // screen's own list
        stampNew(a, homes);
        if (isOwn(a) && o.own) {
          a.context = { source: "priority", sourceId: o.own.orgName.slice(0, 80) };
          if (!o.own.actions.includes(a)) o.own.actions.push(a);
        } else if (!o.actions.includes(a)) o.actions.push(a);
      }
      const changed = changedSince(seen, now);
      seen = snapshotOf(now);
      if (changed.length === 0) return;
      // one write after another: two quick edits must not race each other
      writing = writing
        .then(() => upsertActions(changed))
        .then(o.onWritten)
        .catch((err) => console.warn("priority actions: write failed", err));
    },
  });
  editor.setTheme(defaultTheme());
  // the people on these initiatives up front, everyone else behind search
  const near = new Map<string, { whoId: string; who: string }>();
  for (const i of o.initiatives) for (const list of Object.values(i.roles)) for (const p of list) if (p.whoId !== "") near.set(p.whoId, { whoId: p.whoId, who: p.who });
  editor.setPeople(assigneePeople([...near.values()], o.roster, "search"));
  editor.setActor(o.actor);
  editor.setReadOnly(o.actor.whoId === "");
  // nowhere to raise one: no initiative, and the priority's own actions
  // are for the people who manage its org
  editor.setAddable(homes.length > 0);
  editor.setOptions({ view: "list", groupBy: "status", verifyColumn: true });
  editor.setSections((a) => {
    if (isOwn(a)) return { key: "priority", label: OWN_LABEL, first: true };
    const i = initiativeOf(o.initiatives, a);
    return i ? { key: i.id, label: i.title } : null;
  });
  editor.setAssigneeFilter(true);
  editor.setLinkTargets(
    homes.map((h) => ({ key: h.key, label: h.label })),
    homes[0]?.key ?? "",
    "Linked to"
  );
  editor.setActions(mine);
  editor.setUserView(lastView, (v) => {
    lastView = v;
  });
  // the Gantt view is the app's one Gantt, in its org scope: a band per
  // initiative with its rating, the name opening the board
  editor.setGanttRenderer((host, g) => {
    let dead = false;
    let teardown: () => void = () => undefined;
    host.appendChild(el("div", "app-cp-muted", "Loading…"));
    void import("../improvement/gantt")
      .then(({ mountGantt }) => {
        if (dead) return;
        host.replaceChildren();
        teardown = mountGantt({
          host,
          scopes: [{ key: "org", label: "All initiatives" }],
          initiatives: o.initiatives,
          extraGroup: ownKey !== "" ? { id: "priority", title: OWN_LABEL, owns: isOwn } : undefined,
          actions: g.actions,
          palette: o.palette,
          edgeColour: o.edgeColour,
          canEdit: !g.readOnly && g.actor.whoId !== "",
          actor: g.actor,
          // the Gantt writes a date move itself; the tallies follow
          onChanged: () => {
            seen = snapshotOf(mine);
            o.onWritten();
          },
          onOpenBoard: o.onOpenBoard,
          hideViewSwitch: true,
          showCompleted: g.showCompleted,
          onEdit: g.onEdit,
          toolbarHost: g.toolbar,
          window: g.window,
          onWindow: g.onWindow,
          hideAssignee: g.hideAssignee,
        });
      })
      .catch((err) => {
        console.warn("priority actions: the Gantt could not mount", err);
        if (!dead) host.replaceChildren(el("div", "app-cp-muted", "The Gantt could not load."));
      });
    return () => {
      dead = true;
      teardown();
    };
  });
  return () => {
    editor.destroy();
    o.host.replaceChildren();
  };
}
