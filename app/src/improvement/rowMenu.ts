// The initiative row's ⋮ menu — ONE module for every list that shows
// initiatives (issue 32, Ben 2026-10-19: the priority popup's rows get
// the same five actions as the Improvement tab): Open · Edit details ·
// Flag / Clear flag · Escalate to sponsor · Archive / Restore.

import { el } from "../../../shared/ui/dom";
import type { RosterPerson } from "../store/mappers";
import { appendInitiativeEvent, saveInitiative } from "../store/initiatives";
import { boardUrl } from "../links";
import { AdminScope, Initiative, adminOver, myRoles } from "./initiativeModel";

export interface RowMenuDeps {
  /** Where the Edit details / Escalate dialogs mount. */
  host: HTMLElement;
  viewer: { whoId: string; adminScope: AdminScope };
  actor: () => { whoId: string; who: string };
  roster: RosterPerson[];
  /** The period an archive stamps as the initiative's end. */
  currentPeriod: string;
  onOpen: (i: Initiative) => void;
  /** After any write — the caller re-reads and repaints. */
  onChanged: () => void;
}

const btn = (label: string, cls: string): HTMLButtonElement => {
  const b = el("button", cls, label) as HTMLButtonElement;
  b.type = "button";
  return b;
};

/** May this viewer act on the initiative: a role on it, or an admin
 *  whose scope reaches it (a site admin: their own site's initiatives). */
export function mayManageInitiative(i: Initiative, viewer: { whoId: string; adminScope: AdminScope }): boolean {
  return myRoles(i, viewer.whoId).length > 0 || adminOver(i, viewer.adminScope);
}

/** Opens the menu under `anchor`; returns a remover for the caller's
 *  cleanup list. */
export function openInitiativeRowMenu(anchor: HTMLElement, i: Initiative, d: RowMenuDeps): () => void {
  document.querySelectorAll(".app-cp-menu").forEach((m) => m.remove());
  const menu = el("div", "app-cp-menu");
  const item = (label: string, run: () => void, disabled = false) => {
    const b = btn(label, "app-cp-menu-item");
    b.disabled = disabled;
    b.addEventListener("click", () => {
      menu.remove();
      run();
    });
    menu.appendChild(b);
  };
  const mine = mayManageInitiative(i, d.viewer);

  const setFlag = async (flag: Initiative["flag"]) => {
    if (flag === "escalated") {
      const { openEscalateDialog } = await import("./escalate");
      const sponsors = (i.roles.sponsor ?? [])
        .map((p) => ({ name: p.who, email: d.roster.find((r) => r.whoId === p.whoId)?.email ?? "" }))
        .filter((p) => p.email !== "");
      openEscalateDialog({
        host: d.host,
        initiativeTitle: i.title,
        orgLine: `${d.actor().who} escalated "${i.title}" (${i.org.site}${i.org.department ? " · " + i.org.department : ""})`,
        recipients: sponsors,
        link: boardUrl(i.boardId),
        onEscalate: async (note) => {
          i.flag = "escalated";
          i.flagNote = note;
          await saveInitiative(i);
          await appendInitiativeEvent(i, "flag", { flag: "escalated", note }, d.actor());
          d.onChanged();
        },
      });
      return;
    }
    i.flag = flag;
    i.flagNote = "";
    await saveInitiative(i);
    await appendInitiativeEvent(i, "flag", { flag }, d.actor());
    d.onChanged();
  };

  const archive = async () => {
    i.status = i.status === "archived" ? "active" : "archived";
    i.toPeriod = i.status === "archived" ? d.currentPeriod : "";
    await saveInitiative(i);
    await appendInitiativeEvent(i, i.status === "archived" ? "archived" : "reopened", {}, d.actor());
    d.onChanged();
  };

  item("Open", () => d.onOpen(i), i.boardId === "");
  item("Edit details…", () => {
    void import("./editDetails").then(({ openEditDetails }) => {
      openEditDetails({ host: d.host, initiative: i, actor: d.actor(), onSaved: () => d.onChanged() });
    });
  }, !mine);
  item(i.flag === "" ? "⚐ Flag — needs support" : "Clear flag", () => void setFlag(i.flag === "" ? "flag" : ""), !mine);
  item("▲ Escalate to sponsor", () => void setFlag("escalated"), !mine || i.flag === "escalated");
  item("Health check (next update)", () => undefined, true);
  item("Move stage (next update)", () => undefined, true);
  item(i.status === "archived" ? "Restore" : "Archive", () => void archive(), !mine);

  const r = anchor.getBoundingClientRect();
  menu.style.top = `${r.bottom + 4}px`;
  menu.style.left = `${Math.min(r.left, window.innerWidth - 260)}px`;
  document.body.appendChild(menu);
  const off = (e: PointerEvent) => {
    if (!menu.contains(e.target as Node)) {
      menu.remove();
      document.removeEventListener("pointerdown", off, true);
    }
  };
  setTimeout(() => document.addEventListener("pointerdown", off, true), 0);
  return () => menu.remove();
}
