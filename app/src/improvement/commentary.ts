// Initiative commentary — the shared UI (2026-09-29): one update's body,
// the trail (newest first, earlier wording behind "edited"), and the add /
// edit dialog. The status band, the details pane and the priority popup's
// Commentary tab all draw from here, so the three cannot drift apart.
// Data in, callbacks out — no store import (the harness mounts it).

import { el } from "../../../shared/ui/dom";
import { ageLabel, FlagChoice, isBlank, NO_FLAG_CHANGE, sameFields, Update, UPDATE_LABELS, UpdateFields } from "./commentaryModel";

const btn = (label: string, cls = "app-btn"): HTMLButtonElement => {
  const b = el("button", cls, label) as HTMLButtonElement;
  b.type = "button";
  return b;
};

/** "Jane Smith · 3 days ago · edited" */
export function updateMeta(u: Pick<Update, "who" | "at" | "editedAt">, today: string): string {
  return [u.who, ageLabel(u.at, today), u.editedAt !== "" ? "edited" : ""].filter((s) => s !== "").join(" · ");
}

/** The four labelled lines; blank ones are left out. `grid` lays them two
 *  by two (the band), otherwise one under another (pane, popup). */
export function renderUpdateBody(f: UpdateFields, grid = false): HTMLElement {
  const box = el("div", "app-cm-body" + (grid ? " app-cm-body-grid" : ""));
  for (const [key, label] of UPDATE_LABELS) {
    const text = f[key];
    if (text === "") continue;
    const line = el("div", "app-cm-line app-cm-line-" + key);
    line.append(el("span", "app-cm-k", label), el("span", "app-cm-v", text));
    box.appendChild(line);
  }
  return box;
}

export interface TrailOpts {
  list: Update[];
  today: string;
  canEdit: boolean;
  onEdit: (u: Update) => void;
  /** Leave the newest out (the band or the tab's lead already shows it). */
  skipLatest?: boolean;
}

/** Every update, newest first. An edited one opens its earlier wording. */
export function renderTrail(o: TrailOpts): HTMLElement {
  const box = el("div", "app-cm-trail");
  const list = o.skipLatest ? o.list.slice(1) : o.list;
  for (const u of list) box.appendChild(renderUpdateCard(u, o.today, o.canEdit ? () => o.onEdit(u) : null));
  return box;
}

/** One update as a card: who and when, Edit, the body, earlier wording. */
export function renderUpdateCard(u: Update, today: string, onEdit: (() => void) | null): HTMLElement {
  const card = el("div", "app-cm-card");
  const head = el("div", "app-cm-head");
  const meta = el("span", "app-cm-meta", updateMeta(u, today));
  meta.title = `${u.at.slice(0, 10)}${u.editedAt !== "" ? ` · edited by ${u.editedBy} on ${u.editedAt.slice(0, 10)}` : ""}`;
  head.appendChild(meta);
  head.appendChild(el("span", "app-bar-gap"));
  if (onEdit !== null && u.id !== "") {
    const edit = btn("Edit", "app-cp-ov-link");
    edit.addEventListener("click", onEdit);
    head.appendChild(edit);
  }
  card.appendChild(head);
  card.appendChild(renderUpdateBody(u));
  if (u.previous.length > 0) {
    const toggle = btn(`Earlier wording · ${u.previous.length}`, "app-cp-ov-link app-cm-prevtoggle");
    const prev = el("div", "app-cm-prev");
    prev.style.display = "none";
    for (const p of u.previous) {
      const v = el("div", "app-cm-prevone");
      v.appendChild(el("div", "app-cm-meta", `${p.who} · ${p.at.slice(0, 10)}`));
      v.appendChild(renderUpdateBody(p));
      prev.appendChild(v);
    }
    toggle.setAttribute("aria-expanded", "false");
    toggle.addEventListener("click", () => {
      const open = prev.style.display === "none";
      prev.style.display = open ? "" : "none";
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    card.append(toggle, prev);
  }
  return card;
}

export interface UpdateDialogOpts {
  /** Set when editing; absent when adding. */
  existing?: Update;
  /** Adding: the flag as it stands and who a notice would reach. Absent
   *  when editing (an edit never touches the flag). */
  flag?: { up: boolean; sponsors: { name: string; email: string }[] };
  /** May return a line to show (a notice's outcome): the dialog then
   *  stays open on it until closed. */
  onSave: (fields: UpdateFields, flag: FlagChoice) => Promise<string | void>;
}

/** Add or edit an update — the app's modal, the four boxes. */
export function openUpdateDialog(o: UpdateDialogOpts): void {
  const scrim = el("div", "app-modal-overlay");
  const box = el("div", "app-modal");
  box.appendChild(el("div", "app-modal-title", o.existing ? "Edit update" : "Add update"));
  if (o.existing) box.appendChild(el("div", "app-modal-note", "The earlier wording is kept and stays viewable behind “edited”."));
  const inputs = new Map<keyof UpdateFields, HTMLTextAreaElement>();
  for (const [key, label, placeholder] of UPDATE_LABELS) {
    const ta = el("textarea", "app-input") as HTMLTextAreaElement;
    ta.rows = 2;
    ta.placeholder = placeholder;
    ta.value = o.existing ? o.existing[key] : "";
    const f = el("div", "app-field");
    f.append(el("span", "app-field-label", label), ta);
    box.appendChild(f);
    inputs.set(key, ta);
  }
  const read = (): UpdateFields => ({ high: inputs.get("high")!.value, low: inputs.get("low")!.value, next: inputs.get("next")!.value, support: inputs.get("support")!.value });
  // the flag, in the update (issue 3, 2026-11-17): the status update is
  // where support gets asked for. Always on offer while no flag is up —
  // the tick pre-arms once Support needed has text and stays the
  // author's call; a flag already up can be cleared here.
  let flagBox: HTMLInputElement | null = null;
  let clearBox: HTMLInputElement | null = null;
  let notifySel: HTMLSelectElement | null = null;
  if (o.flag && !o.flag.up) {
    const sect = el("div", "app-ib-flagsect");
    const flagWrap = el("label", "app-check app-ib-supportflag");
    flagBox = el("input") as HTMLInputElement;
    flagBox.type = "checkbox";
    flagWrap.append(flagBox, el("span", undefined, "⚐ Flag this initiative — it needs support"));
    sect.appendChild(flagWrap);
    const tell = el("div", "app-ib-flagtell");
    notifySel = el("select", "app-input app-ib-flagnotify") as HTMLSelectElement;
    for (const [v, l] of [["", "Do not notify the sponsor"], ["teams", "Notify the sponsor by Teams"], ["email", "Notify the sponsor by email"]] as const) {
      const opt = el("option", undefined, l) as HTMLOptionElement;
      opt.value = v;
      notifySel.appendChild(opt);
    }
    notifySel.setAttribute("aria-label", "Notify the sponsor");
    const names = o.flag.sponsors.map((p) => p.name).join("; ");
    if (o.flag.sponsors.length === 0) notifySel.disabled = true;
    tell.append(notifySel, el("span", "app-field-hint", o.flag.sponsors.length === 0 ? "No sponsor with an email to notify." : `Sponsor: ${names}`));
    sect.appendChild(tell);
    const support = inputs.get("support")!;
    const sync = () => {
      const has = support.value.trim() !== "";
      if (has && !flagBox!.dataset.touched) flagBox!.checked = true;
      if (!has && !flagBox!.dataset.touched) flagBox!.checked = false;
      tell.style.display = flagBox!.checked ? "" : "none";
    };
    sync();
    support.addEventListener("input", sync);
    flagBox.addEventListener("change", () => {
      flagBox!.dataset.touched = "1";
      sync();
    });
    box.appendChild(sect);
  } else if (o.flag && o.flag.up) {
    const sect = el("div", "app-ib-flagsect");
    sect.appendChild(el("div", "app-field-hint", "⚐ This initiative is marked Support needed. New text here replaces what the flag says."));
    const clearWrap = el("label", "app-check app-ib-supportflag");
    clearBox = el("input") as HTMLInputElement;
    clearBox.type = "checkbox";
    clearWrap.append(clearBox, el("span", undefined, "Clear the flag — support is no longer needed"));
    sect.appendChild(clearWrap);
    box.appendChild(sect);
  }
  const flagChoice = (): FlagChoice => {
    if (flagBox?.checked === true) return { change: "raise", notify: (notifySel?.value ?? "") as FlagChoice["notify"] };
    if (clearBox?.checked === true) return { change: "clear", notify: "" };
    return NO_FLAG_CHANGE;
  };
  const err = el("div", "app-cp-err", "");
  box.appendChild(err);
  const foot = el("div", "app-modal-footer");
  const cancel = btn("Cancel", "app-link");
  cancel.addEventListener("click", () => scrim.remove());
  const save = btn("Save", "app-btn app-btn-primary");
  save.addEventListener("click", () => {
    const fields = read();
    if (isBlank(fields)) {
      err.textContent = "Write at least one of the four.";
      return;
    }
    if (o.existing && sameFields(fields, o.existing)) {
      scrim.remove();
      return;
    }
    const choice = flagChoice();
    if (choice.change === "raise" && fields.support.trim() === "") {
      err.textContent = "Say what support you need — it shows with the flag.";
      inputs.get("support")!.focus();
      return;
    }
    save.disabled = true;
    void o
      .onSave(fields, choice)
      .then((line) => {
        if (typeof line !== "string" || line === "") {
          scrim.remove();
          return;
        }
        // a notice's outcome is said before the dialog goes
        err.className = "app-field-hint";
        err.textContent = line;
        save.style.display = "none";
        cancel.textContent = "Close";
        for (const ta of inputs.values()) ta.disabled = true;
        for (const c of [flagBox, clearBox, notifySel]) if (c) c.disabled = true;
      })
      .catch(() => {
        save.disabled = false;
        err.textContent = "That could not be saved. Try again.";
      });
  });
  foot.append(cancel, save);
  box.appendChild(foot);
  scrim.appendChild(box);
  document.body.appendChild(scrim);
  inputs.get("high")!.focus();
}
