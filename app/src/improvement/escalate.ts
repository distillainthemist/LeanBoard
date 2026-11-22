// Improvement — the Flag dialog (2026-11-17: "Flag — needs support" and
// "Escalate to sponsor" merged into ONE flag; telling the sponsor is a
// tick on it). The document-control notify panel's anatomy: removable
// recipient chips, an editable message, send by Teams or email with the
// outcome reported in place. Flagging applies FIRST, then notifies — a
// send failure must never read as the flag failing.
//
// The file keeps its name (UAT scripts and the import map name it).

import { el, clear } from "../../../shared/ui/dom";

export interface EscalateRecipient {
  name: string;
  email: string;
}

/** How the sponsor is told, if at all. */
export type FlagNotify = "" | "teams" | "email";

export interface FlagDialogOpts {
  host: HTMLElement;
  initiativeTitle: string;
  /** "Jane Smith flagged “Title” (Site · Department)". */
  orgLine: string;
  /** The sponsors with an email — who a notice would go to. */
  recipients: EscalateRecipient[];
  link: string;
  /** Applies the flag + event; runs before any send. */
  onFlag: (note: string, notified: boolean) => Promise<void>;
}

const btn = (label: string, cls = "app-btn"): HTMLButtonElement => {
  const b = el("button", cls, label) as HTMLButtonElement;
  b.type = "button";
  return b;
};

/** Send the flag's notice; the words for the outcome line. Never throws. */
export async function sendFlagNotice(kind: Exclude<FlagNotify, "">, recips: EscalateRecipient[], initiativeTitle: string, orgLine: string, note: string, link: string): Promise<string> {
  if (recips.length === 0) return "Nobody to notify — no sponsor with an email.";
  try {
    const { sendNotifyTeams, sendNotifyEmail } = await import("../docs/notify");
    const subject = `Support needed: ${initiativeTitle}`;
    const body = `${orgLine}: ${note}`;
    const r = kind === "teams" ? await sendNotifyTeams(recips, subject, body, link) : await sendNotifyEmail(recips, subject, body, link);
    return r.error === ""
      ? `Sent by ${r.how === "card" ? "Teams card" : r.how === "message" ? "Teams message" : "email"} to ${recips.length} ${recips.length === 1 ? "person" : "people"}.`
      : `Not sent: ${r.error.slice(0, 200)}`;
  } catch (e) {
    return `Not sent: ${e instanceof Error ? e.message : String(e)}`;
  }
}

/** The recipient chips, removable; returns the live list's reader. */
export function recipientChips(host: HTMLElement, initial: EscalateRecipient[]): () => EscalateRecipient[] {
  let recips = [...initial];
  const paint = () => {
    clear(host);
    for (const p of recips) {
      const chip = el("span", "app-docs-pplchip");
      chip.appendChild(el("span", "", p.name));
      const off = el("button", "app-docs-pplchipx", "✕") as HTMLButtonElement;
      off.type = "button";
      off.title = `Do not notify ${p.name}`;
      off.addEventListener("click", () => {
        recips = recips.filter((x) => x !== p);
        paint();
      });
      chip.appendChild(off);
      host.appendChild(chip);
    }
    if (recips.length === 0) host.appendChild(el("span", "app-field-hint", "No sponsor with an email — the flag still applies."));
  };
  paint();
  return () => recips;
}

export function openFlagDialog(o: FlagDialogOpts): void {
  const overlay = el("div", "app-modal-overlay");
  const box = el("div", "app-modal");
  overlay.appendChild(box);
  o.host.appendChild(overlay);
  const close = () => overlay.remove();
  // a form never closes on a click outside it (Ben, 2026-10-07)

  box.appendChild(el("div", "app-modal-title", "Flag this initiative"));
  box.appendChild(el("div", "app-modal-note", "A flag says this initiative needs support. It shows as Support needed wherever the initiative is listed, with what you need. Asking early is the right call."));

  const msg = el("textarea", "app-input") as HTMLTextAreaElement;
  msg.rows = 3;
  msg.placeholder = "e.g. a decision";
  const msgField = el("div", "app-field");
  msgField.append(el("span", "app-field-label", "What you need"), msg);
  box.appendChild(msgField);

  const tellWrap = el("label", "app-check app-ib-supportflag");
  const tell = el("input") as HTMLInputElement;
  tell.type = "checkbox";
  tellWrap.append(tell, el("span", undefined, "Notify the sponsor"));
  box.appendChild(tellWrap);
  const who = el("div", "app-im-flagwho");
  who.style.display = "none";
  const chips = el("div", "app-docs-pplchips");
  const recips = recipientChips(chips, o.recipients);
  who.append(el("div", "app-field-label", "Notify"), chips);
  box.appendChild(who);

  const outLine = el("div", "app-field-hint", "");
  box.appendChild(outLine);

  const footer = el("div", "app-modal-footer");
  const cancel = btn("Cancel", "app-link");
  cancel.addEventListener("click", close);
  const plainBtn = btn("Flag", "app-btn app-btn-primary");
  const mailBtn = btn("Flag & email");
  const teamsBtn = btn("Flag & send Teams", "app-btn app-btn-primary");
  const sync = () => {
    who.style.display = tell.checked ? "" : "none";
    plainBtn.style.display = tell.checked ? "none" : "";
    mailBtn.style.display = tell.checked ? "" : "none";
    teamsBtn.style.display = tell.checked ? "" : "none";
  };
  tell.addEventListener("change", sync);
  sync();
  const run = (kind: FlagNotify) => {
    void (async () => {
      const note = msg.value.trim();
      if (note === "") {
        outLine.textContent = "Say what you need — it shows with the flag.";
        msg.focus();
        return;
      }
      for (const b of [plainBtn, mailBtn, teamsBtn]) b.disabled = true;
      tell.disabled = true;
      outLine.textContent = "Flagging…";
      const to = kind === "" ? [] : recips();
      try {
        await o.onFlag(note, kind !== "" && to.length > 0);
      } catch {
        outLine.textContent = "That could not be saved. Try again.";
        for (const b of [plainBtn, mailBtn, teamsBtn]) b.disabled = false;
        tell.disabled = false;
        return;
      }
      if (kind === "") {
        close();
        return;
      }
      cancel.textContent = "Close";
      outLine.textContent = "✓ Marked Support needed. Sending…";
      outLine.textContent = `✓ Marked Support needed. ${await sendFlagNotice(kind, to, o.initiativeTitle, o.orgLine, note, o.link)}`;
    })();
  };
  plainBtn.addEventListener("click", () => run(""));
  teamsBtn.addEventListener("click", () => run("teams"));
  mailBtn.addEventListener("click", () => run("email"));
  footer.append(cancel, plainBtn, mailBtn, teamsBtn);
  box.appendChild(footer);
  msg.focus();
}

/** The line a notice opens with. */
export function flagOrgLine(who: string, i: { title: string; org: { site: string; department: string } }): string {
  return `${who} flagged "${i.title}" (${i.org.site}${i.org.department ? " · " + i.org.department : ""})`;
}
