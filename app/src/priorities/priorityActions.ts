// Raising an action ON a priority (the 2026-11-18 proposal, feature 1):
// the standard action dialog, opened from the priority popup's title row
// or the tile's ⋮ menu. The action is keyed to the priority at the org
// it is raised at (shared/schema/actionLinks.ts `priorityKey`) — no
// initiative, no board. Who may: people who manage that org (the screen
// decides; this only opens the dialog).

import { newAction } from "../../../shared/schema/actions";
import { assigneePeople } from "../../../shared/schema/people";
import { LTK_BASE_CSS } from "../../../shared/ui/baseCss";
import { el, ensureStylesheet } from "../../../shared/ui/dom";
import { openActionDialog } from "../../../shared/ui/actionUi";
import { upsertActions } from "../store/actions";
import type { LifecycleCtx } from "./lifecycle";
import type { Priority } from "./model";

let host: HTMLElement | null = null;
/** The dialog's page-level host: the toolkit's styles and theme root,
 *  above the priority popup it may be opened from. */
function dialogHost(): HTMLElement {
  if (host && host.isConnected) return host;
  ensureStylesheet("ltk-base-css", LTK_BASE_CSS);
  host = el("div", "app-dlghost ltk-root app-quickadd-host app-cp-actionhost");
  document.body.appendChild(host);
  return host;
}

/** Open the Raise dialog for a new action on `p`. `after` runs once it
 *  is written (the popup turns to its Actions tab). */
export function raisePriorityAction(ctx: LifecycleCtx, p: Priority, after?: () => void): void {
  const key = ctx.own.keyFor(p);
  const action = newAction({ source: "priority", sourceId: ctx.own.orgNameFor(p).slice(0, 80) });
  // keyed before the dialog opens: its "Linked to" chip reads
  // "Priority · <statement>" (named through the link provider)
  action.instanceId = key;
  const actor = ctx.actor();
  // the priority's owner and the viewer up front, everyone else behind search
  const near: { whoId: string; who: string }[] = [];
  if (p.ownerId !== "") near.push({ whoId: p.ownerId, who: p.ownerName });
  if (actor.whoId !== "" && !near.some((x) => x.whoId === actor.whoId)) near.push(actor);
  openActionDialog({
    host: dialogHost(),
    action,
    people: assigneePeople(near, ctx.roster, "search"),
    isNew: true,
    viewer: actor.whoId !== "" ? actor : undefined,
    onCommit: () => {
      // still on the priority (the dialog may have moved it to an
      // initiative through "Linked to"): it joins the screen's own list
      if (action.instanceId === key && !ctx.own.all.includes(action)) ctx.own.all.push(action);
      void upsertActions([action])
        .then(() => ctx.changed())
        .then(() => after?.())
        .catch((err) => console.warn("priority action: write failed", err));
    },
  });
}
