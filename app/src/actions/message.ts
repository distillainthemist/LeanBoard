// "Message about this action" (issue 6, 2026-11-17): the notify panel's
// anatomy — recipient chips (the assignees by default), a type-ahead to
// add anyone, an editable message, send by Teams or email, the outcome
// in place. A sent message leaves one comment line on the action,
// written here through the one write path, and handed back to the open
// dialog so its own Save keeps it.
//
// Loaded on first use (main.ts registers the provider): the senders are
// the documents module's (docs/notify) — reached by a dynamic import,
// the import gate's sanctioned door.

import { el, clear } from "../../../shared/ui/dom";
import { markDialog } from "../../../shared/ui/focusTrap";
import type { ActionMessageRequest } from "../../../shared/ui/actionLinkProvider";
import { newComment } from "../../../shared/schema/actions";
import { homeBoardOf, PRIORITY_KEY_PREFIX } from "../../../shared/schema/actionLinks";
import { appLinkUrl, boardUrl, prioritiesViewUrl } from "../links";
import { currentViewer } from "../runtime";
import { defaultRecipients, messageDraft, MessageRecipient, sentLine } from "./messageModel";

const btn = (label: string, cls = "app-btn"): HTMLButtonElement => {
  const b = el("button", cls, label) as HTMLButtonElement;
  b.type = "button";
  return b;
};

/** What a message panel is opened with. */
export interface MessagePanelOpts {
  title: string;
  /** One line under the title; "" for none. */
  note: string;
  /** Who it opens addressed to — given the roster's email lookup. */
  recipients: (emailOf: (whoId: string) => string) => MessageRecipient[];
  subject: string;
  body: string;
  /** The link the message carries. */
  link: string;
  /** The text link that leaves without sending ("Cancel"; "Skip" where
   *  the panel is offered after a step, not asked for). */
  cancelLabel?: string;
  /** After a send: `say` appends to the outcome line. */
  onSent?: (to: MessageRecipient[], how: "Teams" | "email", say: (extra: string) => void) => void | Promise<void>;
}

/** The message panel (the notify panel's anatomy): recipient chips, a
 *  type-ahead to add anyone, an editable message, send by Teams or
 *  email, the outcome in place. "Message about this action" opens it,
 *  and so do the priorities' steps (2026-11-18). */
export async function openMessagePanel(o: MessagePanelOpts): Promise<void> {
  const [{ listPeople, searchEntra }] = await Promise.all([import("../store/people")]);
  const roster = await listPeople().catch(() => []);
  const emailOf = (whoId: string) => roster.find((p) => p.whoId === whoId)?.email ?? "";

  const overlay = el("div", "app-modal-overlay app-act-msg");
  const box = el("div", "app-modal");
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  // a form never closes on a click outside it (Ben, 2026-10-07)

  // marked modal: the action dialog's focus trap leaves Tab to this panel
  markDialog(box, o.title);
  box.appendChild(el("div", "app-modal-title", o.title));
  if (o.note !== "") box.appendChild(el("div", "app-modal-note", o.note));

  let recips: MessageRecipient[] = o.recipients(emailOf);
  const chips = el("div", "app-docs-pplchips");
  const paintChips = () => {
    clear(chips);
    for (const p of recips) {
      const chip = el("span", "app-docs-pplchip");
      chip.appendChild(el("span", "", p.name));
      const off = btn("✕", "app-docs-pplchipx");
      off.title = `Do not message ${p.name}`;
      off.addEventListener("click", () => {
        recips = recips.filter((x) => x !== p);
        paintChips();
      });
      chip.appendChild(off);
      chips.appendChild(chip);
    }
    if (recips.length === 0) chips.appendChild(el("span", "app-field-hint", "Nobody yet — add someone below."));
  };
  paintChips();

  // add anyone: the app's people first, then the directory after a pause
  // (the standing search-picker pattern). Messaging adds nobody to the
  // app, so the directory is open to every sender here.
  const add = el("input", "app-input") as HTMLInputElement;
  add.type = "search";
  add.placeholder = "Add a person…";
  add.setAttribute("aria-label", "Add a person to message");
  add.setAttribute("role", "combobox");
  add.autocomplete = "off";
  const pop = el("div", "app-ta-pop");
  pop.setAttribute("role", "listbox");
  pop.style.display = "none";
  const addBox = el("div", "app-ta-box");
  addBox.append(add, pop);
  let options: { el: HTMLButtonElement; run: () => void }[] = [];
  let active = 0;
  let dir: { q: string; state: "idle" | "busy" | "done" | "failed"; hits: { displayName: string; mail: string }[] } = { q: "", state: "idle", hits: [] };
  let seq = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const closePop = () => {
    pop.style.display = "none";
    add.setAttribute("aria-expanded", "false");
    options = [];
  };
  const pick = (r: MessageRecipient) => {
    if (!recips.some((x) => x.email.toLowerCase() === r.email.toLowerCase())) recips = [...recips, r];
    add.value = "";
    closePop();
    paintChips();
  };
  const paintActive = () => {
    options.forEach((o, n) => {
      o.el.classList.toggle("app-ta-opt-on", n === active);
      o.el.setAttribute("aria-selected", String(n === active));
    });
    options[active]?.el.scrollIntoView({ block: "nearest" });
  };
  const option = (label: string, sub: string, run: () => void): HTMLButtonElement => {
    const b = btn("", "app-ta-opt");
    b.setAttribute("role", "option");
    b.appendChild(el("span", "app-ta-opt-name", label));
    if (sub !== "") b.appendChild(el("span", "app-ta-opt-sub", sub));
    b.addEventListener("mousedown", (e) => e.preventDefault());
    b.addEventListener("click", run);
    options.push({ el: b, run });
    return b;
  };
  const render = () => {
    clear(pop);
    options = [];
    const q = add.value.trim();
    if (q === "") return closePop();
    const ql = q.toLowerCase();
    const taken = new Set(recips.map((r) => r.email.toLowerCase()));
    const known = roster.filter((p) => p.active && p.email !== "" && !taken.has(p.email.toLowerCase()) && p.who.toLowerCase().includes(ql)).slice(0, 8);
    for (const p of known) pop.appendChild(option(p.who, p.email, () => pick({ name: p.who, email: p.email })));
    const knownMails = new Set(roster.map((p) => p.email.toLowerCase()));
    if (q.length < 3) {
      if (known.length === 0) pop.appendChild(el("div", "app-ta-note", "Keep typing to search the directory (3 letters)."));
    } else if (dir.q === q && dir.state === "done") {
      const fresh = dir.hits.filter((h) => h.mail !== "" && !knownMails.has(h.mail.toLowerCase()) && !taken.has(h.mail.toLowerCase())).slice(0, 8);
      if (fresh.length > 0) pop.appendChild(el("div", "app-ta-h", "In the directory"));
      for (const h of fresh) pop.appendChild(option(h.displayName, h.mail, () => pick({ name: h.displayName, email: h.mail })));
      if (fresh.length === 0 && known.length === 0) pop.appendChild(el("div", "app-ta-note", "No one matches, in the app or the directory."));
    } else if (dir.q === q && dir.state === "failed") {
      pop.appendChild(el("div", "app-ta-note", "The directory search failed. Check the connection and type again."));
    } else {
      pop.appendChild(el("div", "app-ta-note", "Searching the directory…"));
    }
    active = Math.min(active, Math.max(0, options.length - 1));
    pop.style.display = "";
    add.setAttribute("aria-expanded", "true");
    paintActive();
  };
  const search = () => {
    if (timer !== null) clearTimeout(timer);
    const q = add.value.trim();
    if (q.length < 3 || (dir.q === q && dir.state !== "idle")) return;
    dir = { q, state: "busy", hits: [] };
    timer = setTimeout(() => {
      const n = ++seq;
      void searchEntra(q).then(
        (found) => {
          if (n !== seq) return;
          dir = { q, state: "done", hits: found };
          if (add.value.trim() === q) render();
        },
        () => {
          if (n !== seq) return;
          dir = { q, state: "failed", hits: [] };
          if (add.value.trim() === q) render();
        }
      );
    }, 350);
  };
  add.addEventListener("input", () => {
    active = 0;
    search();
    render();
  });
  add.addEventListener("blur", () => setTimeout(() => {
    if (document.activeElement !== add) closePop();
  }, 150));
  add.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (options.length === 0) return;
      e.preventDefault();
      active = (active + (e.key === "ArrowDown" ? 1 : options.length - 1)) % options.length;
      paintActive();
    } else if (e.key === "Enter") {
      e.preventDefault();
      options[active]?.run();
    } else if (e.key === "Escape" && pop.style.display !== "none") {
      e.preventDefault();
      e.stopPropagation();
      add.value = "";
      closePop();
    }
  });
  const toField = el("div", "app-field");
  toField.append(el("span", "app-field-label", "To"), chips, addBox);
  box.appendChild(toField);

  const draft = { subject: o.subject, body: o.body };
  const msg = el("textarea", "app-input") as HTMLTextAreaElement;
  msg.rows = 5;
  msg.value = draft.body;
  const msgField = el("div", "app-field");
  msgField.append(el("span", "app-field-label", "Message"), msg);
  box.appendChild(msgField);

  const outLine = el("div", "app-field-hint", "");
  box.appendChild(outLine);

  const footer = el("div", "app-modal-footer");
  const cancel = btn(o.cancelLabel ?? "Cancel", "app-link");
  cancel.addEventListener("click", close);
  const mailBtn = btn("Send email");
  const teamsBtn = btn("Send by Teams", "app-btn app-btn-primary");
  const link = o.link;
  const run = (kind: "teams" | "email") => {
    void (async () => {
      const text = msg.value.trim();
      if (recips.length === 0) {
        outLine.textContent = "Add at least one person to message.";
        add.focus();
        return;
      }
      if (text === "") {
        outLine.textContent = "Write the message first.";
        msg.focus();
        return;
      }
      teamsBtn.disabled = true;
      mailBtn.disabled = true;
      outLine.textContent = "Sending…";
      const to = [...recips];
      let result: { error: string; how: string };
      try {
        const { sendNotifyTeams, sendNotifyEmail } = await import("../docs/notify");
        result = kind === "teams" ? await sendNotifyTeams(to, draft.subject, text, link) : await sendNotifyEmail(to, draft.subject, text, link);
      } catch (e) {
        result = { error: e instanceof Error ? e.message : String(e), how: kind };
      }
      if (result.error !== "") {
        outLine.textContent = `Not sent: ${result.error.slice(0, 200)}`;
        teamsBtn.disabled = false;
        mailBtn.disabled = false;
        return;
      }
      const how = result.how === "email" ? "email" : "Teams";
      outLine.textContent = `✓ Sent by ${result.how === "card" ? "Teams card" : result.how === "message" ? "Teams message" : "email"} to ${to.length} ${to.length === 1 ? "person" : "people"}.`;
      cancel.textContent = "Close";
      await o.onSent?.(to, how, (extra) => {
        outLine.textContent += extra;
      });
    })();
  };
  teamsBtn.addEventListener("click", () => run("teams"));
  mailBtn.addEventListener("click", () => run("email"));
  footer.append(cancel, mailBtn, teamsBtn);
  box.appendChild(footer);
  msg.focus();
}

export async function openActionMessage(req: ActionMessageRequest): Promise<void> {
  const me = currentViewer();
  const a = req.action;
  const draft = messageDraft(a);
  const home = homeBoardOf(a.instanceId);
  await openMessagePanel({
    title: "Message about this action",
    note: "Sends a Teams message or an email with a link to the action. A line is added to the action's comments saying who was told.",
    recipients: (emailOf) => defaultRecipients(a.assignees, emailOf, me?.objectId ?? ""),
    subject: draft.subject,
    body: draft.body,
    // an action on a priority has no board: the link opens Priorities
    link: home !== "" ? boardUrl(home) : a.instanceId.startsWith(PRIORITY_KEY_PREFIX) ? prioritiesViewUrl("{}") : appLinkUrl(),
    onSent: async (to, how, say) => {
      // the trail: one comment on the action, written through the one
      // write path; the open dialog adopts it so its Save keeps it
      if (!me || me.objectId === "") return;
      const comment = newComment({ whoId: me.objectId, who: me.name }, sentLine(to, how));
      a.comments = [...a.comments, comment];
      try {
        const { upsertActions } = await import("../store/actions");
        await upsertActions([a]);
        req.onSent(comment);
        if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("ltk-actions-changed"));
      } catch {
        a.comments = a.comments.filter((c) => c !== comment);
        say(" The note on the action could not be saved.");
      }
    },
  });
}
