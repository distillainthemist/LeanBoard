// Group membership in the app (2026-10-28 report 3, Ben): the document
// controllers and the owners & approvers groups listed, added to from
// the directory and removed from — through the Office 365 Groups
// connector's Graph passthrough under the signed-in person's delegated
// rights. A group OWNER may manage its membership with no directory
// role, so the dialog checks ownership first and says so when it is
// missing. A person added to Document controllers also becomes a
// MEMBER and an OWNER of the owners & approvers group (Ben, 2026-10-29),
// so controllers can manage the pool; removal takes the ownership
// away with the last-owner guard and leaves the membership.

import { clear, el } from "../../../shared/ui/dom";
import { openDialog } from "../../../shared/ui/dialog";
import { confirmRemoval } from "../prompts";
import {
  addMember,
  addOwner,
  groupMembers,
  isGroupOwner,
  removeMember,
  removeOwnerGuarded,
  GroupMember,
} from "../store/accessGroup";
import { searchEntra } from "../store/people";
import { invalidateAccessGates } from "./accessGates";

export interface GroupMembersOpts {
  host: HTMLElement;
  kind: "controllers" | "pool";
  group: { id: string; name: string };
  /** The owners & approvers group, when managing the controllers: a
   *  controller is made its member and owner too. null = not linked. */
  pool: { id: string; name: string } | null;
  viewer: { objectId: string; name: string };
  onChanged?: () => void;
}

const errText = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 160);

export function openGroupMembers(opts: GroupMembersOpts): void {
  const { group, kind } = opts;
  const dlg = openDialog({
    host: opts.host,
    title: `Members — ${group.name}`,
    maxWidth: 560,
    buttons: [{ label: "Close", kind: "secondary", onClick: () => dlg.close() }],
  });
  dlg.body.appendChild(
    el(
      "div",
      "app-settings-note",
      kind === "controllers"
        ? `Document controllers hold full document admin. Adding someone here also makes them a member and an owner of the owners & approvers group${opts.pool ? ` (${opts.pool.name})` : " (not linked yet — nothing to own)"}, so they can manage it.`
        : "The eligibility pool: the owner and approver pickers select from these people. Being in the group grants nothing on its own — rights on a document come from being named on it."
    )
  );
  const ownerLine = el("div", "app-settings-note", "Checking that you own this group…");
  dlg.body.appendChild(ownerLine);
  const status = el("div", "app-docs-addstatus");
  const searchWrap = el("div", "app-grp-search");
  const search = el("input", "app-input") as HTMLInputElement;
  search.type = "search";
  search.placeholder = "Search the directory to add someone…";
  const hits = el("div", "app-grp-hits");
  searchWrap.append(search, hits);
  const list = el("div", "app-grp-list");
  dlg.body.append(searchWrap, el("div", "app-field-label", "Members"), list, status);

  let canWrite = false;
  let members: GroupMember[] = [];
  const say = (text: string, warn = false) => {
    status.textContent = text;
    status.classList.toggle("app-docs-addstatus-warn", warn);
  };

  const paintList = () => {
    clear(list);
    if (members.length === 0) {
      list.appendChild(el("div", "app-field-hint", "No members yet."));
      return;
    }
    for (const m of [...members].sort((a, b) => a.name.localeCompare(b.name))) {
      const row = el("div", "app-grp-row");
      const text = el("div", "app-grp-text");
      text.append(el("div", "app-people-name", m.name || m.email), el("div", "app-user-email", m.email));
      row.appendChild(text);
      if (canWrite) {
        const rm = el("button", "app-link", "Remove") as HTMLButtonElement;
        const self = m.id === opts.viewer.objectId;
        if (self) {
          rm.disabled = true;
          rm.title = "You cannot remove yourself here — another owner does that";
        }
        rm.addEventListener("click", () => void remove(m, rm));
        row.appendChild(rm);
      }
      list.appendChild(row);
    }
  };

  const reload = async () => {
    try {
      members = await groupMembers(group.id);
      paintList();
    } catch (e) {
      clear(list);
      list.appendChild(el("div", "app-cp-err", `The members could not be read: ${errText(e)}`));
    }
  };

  const remove = async (m: GroupMember, btn: HTMLButtonElement) => {
    const ok = await confirmRemoval(
      `${m.name || m.email} from ${group.name}`,
      kind === "controllers"
        ? "They lose document admin at once. Their ownership of the owners & approvers group goes too; their membership of it stays, so documents naming them keep their owner or approver."
        : "They can no longer be picked as an owner or approver. Documents already naming them keep them — the health report lists those."
    );
    if (!ok) return;
    btn.disabled = true;
    say(`Removing ${m.name || m.email}…`);
    try {
      await removeMember(group.id, m.id);
    } catch (e) {
      btn.disabled = false;
      say(`Could not remove ${m.name || m.email}: ${errText(e)}`, true);
      return;
    }
    let tail = "";
    if (kind === "controllers" && opts.pool !== null) {
      try {
        await removeOwnerGuarded(opts.pool.id, m.id);
      } catch (e) {
        tail = ` — they still own ${opts.pool.name}: ${errText(e)}`;
      }
    }
    invalidateAccessGates();
    opts.onChanged?.();
    say(`${m.name || m.email} removed ✓${tail}`, tail !== "");
    await reload();
  };

  const add = async (hit: { objectId: string; displayName: string; mail: string }, btn: HTMLButtonElement) => {
    btn.disabled = true;
    say(`Adding ${hit.displayName}…`);
    try {
      await addMember(group.id, hit.objectId);
    } catch (e) {
      btn.disabled = false;
      say(`Could not add ${hit.displayName}: ${errText(e)}`, true);
      return;
    }
    const tails: string[] = [];
    if (kind === "controllers" && opts.pool !== null) {
      try {
        await addMember(opts.pool.id, hit.objectId);
      } catch (e) {
        tails.push(`not made a member of ${opts.pool.name}: ${errText(e)}`);
      }
      try {
        await addOwner(opts.pool.id, hit.objectId);
      } catch (e) {
        tails.push(`not made an owner of ${opts.pool.name}: ${errText(e)}`);
      }
    }
    invalidateAccessGates();
    opts.onChanged?.();
    say(`${hit.displayName} added ✓${tails.length > 0 ? ` — ${tails.join("; ")}` : ""}`, tails.length > 0);
    search.value = "";
    clear(hits);
    await reload();
  };

  let gen = 0;
  const runSearch = () => {
    const q = search.value.trim();
    const g = ++gen;
    clear(hits);
    if (q.length < 2) return;
    hits.appendChild(el("div", "app-field-hint", "Searching…"));
    void searchEntra(q)
      .then((found) => {
        if (g !== gen) return;
        clear(hits);
        if (found.length === 0) {
          hits.appendChild(el("div", "app-field-hint", "No one in the directory matches."));
          return;
        }
        const have = new Set(members.map((m) => m.id));
        for (const hit of found) {
          const row = el("div", "app-grp-row");
          const text = el("div", "app-grp-text");
          text.append(el("div", "app-people-name", hit.displayName), el("div", "app-user-email", [hit.mail, hit.department].filter(Boolean).join(" · ")));
          row.appendChild(text);
          if (have.has(hit.objectId)) row.appendChild(el("span", "app-status-badge", "a member"));
          else {
            const b = el("button", "app-btn", "＋ Add") as HTMLButtonElement;
            b.addEventListener("click", () => void add(hit, b));
            row.appendChild(b);
          }
          hits.appendChild(row);
        }
      })
      .catch((e) => {
        if (g !== gen) return;
        clear(hits);
        hits.appendChild(el("div", "app-cp-err", `Search failed: ${errText(e)}`));
      });
  };
  let timer = 0;
  search.addEventListener("input", () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(runSearch, 250);
  });

  void (async () => {
    let owner = false;
    try {
      owner = await isGroupOwner(group.id, opts.viewer.objectId);
    } catch (e) {
      ownerLine.textContent = `Your ownership of the group could not be checked: ${errText(e)}`;
    }
    canWrite = owner;
    if (owner) ownerLine.textContent = "You own this group in Entra, so you can add and remove its members here.";
    else if (ownerLine.textContent?.startsWith("Checking")) {
      ownerLine.textContent =
        kind === "controllers"
          ? "You are not an owner of this group in Entra, so its members can only be read here — an owner of the group adds you in Entra."
          : "You are not an owner of this group in Entra, so its members can only be read here — a super admin adds you to Document controllers (which makes you an owner), or an owner of the group adds you in Entra.";
    }
    searchWrap.style.display = owner ? "" : "none";
    await reload();
  })();
}
