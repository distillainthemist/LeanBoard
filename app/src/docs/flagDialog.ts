// "Flag this document…" (issue 23): the reader's dialog — a review level
// from the site's list, a comment, one optional screenshot (paste, drop
// or pick) — then the row is written and the document's owners get a
// Teams card. No check-out, no SharePoint write: reading is enough.

import { el } from "../../../shared/ui/dom";
import { openDialog } from "../../../shared/ui/dialog";
import { shrinkImage, fileToDataUrl } from "../../../shared/ui/imageIngest";
import { FlagDoc, raiseFlag } from "./docFlags";
import { flagNotice } from "./docFlagsModel";

export interface FlagDialogOpts {
  host: HTMLElement;
  doc: FlagDoc;
  levels: string[];
  source: "register" | "ingestion";
  /** Who hears: the document's owners, else the controllers. */
  recipients: { name: string; email: string }[];
  recipientsLabel: string;
  /** The link the card opens. */
  link: string;
  /** After the flag is written (the Teams card may still be on its way). */
  onRaised: (flagId: string) => void;
}

export function openFlagDialog(o: FlagDialogOpts): void {
  const dlg = openDialog({
    host: o.host,
    title: `Flag “${o.doc.name}” for review`,
    maxWidth: 520,
    buttons: [
      { label: "Cancel", kind: "secondary", onClick: () => dlg.close() },
      { label: "Flag it", kind: "primary", onClick: () => void send() },
    ],
  });
  const level = el("select", "app-input") as HTMLSelectElement;
  for (const l of o.levels) level.appendChild(new Option(l, l));
  const comment = el("textarea", "app-input") as HTMLTextAreaElement;
  comment.rows = 4;
  comment.placeholder = "What needs attention — the owners read this on Teams";
  let shot: File | null = null;
  const shotBox = el("div", "app-issue-shots");
  const zone = el("div", "app-issue-paste", "Paste a screenshot (Ctrl/Cmd+V), drop an image, or");
  const pick = el("input", "") as HTMLInputElement;
  pick.type = "file";
  pick.accept = "image/*";
  pick.style.display = "none";
  const pickBtn = el("button", "app-btn app-issue-pick", "choose an image") as HTMLButtonElement;
  pickBtn.type = "button";
  pickBtn.addEventListener("click", () => pick.click());
  zone.appendChild(pickBtn);
  const setShot = (f: File | null) => {
    shot = f;
    shotBox.replaceChildren();
    if (f === null) return;
    const cell = el("div", "app-issue-shot");
    const img = el("img", "") as HTMLImageElement;
    void fileToDataUrl(f).then((u) => (img.src = u));
    img.alt = f.name;
    const rm = el("button", "app-issue-shotrm", "✕") as HTMLButtonElement;
    rm.type = "button";
    rm.title = "Remove";
    rm.addEventListener("click", () => setShot(null));
    cell.append(img, rm);
    shotBox.appendChild(cell);
  };
  const take = (f: File | null | undefined) => {
    if (!f || !f.type.startsWith("image/")) return;
    setShot(f);
  };
  dlg.root.addEventListener("paste", ((e: ClipboardEvent) => {
    for (const item of e.clipboardData?.items ?? []) {
      if (item.type.startsWith("image/")) {
        const f = item.getAsFile();
        if (f !== null) take(new File([f], `pasted-${Date.now()}.png`, { type: f.type }));
        e.preventDefault();
      }
    }
  }) as EventListener);
  zone.addEventListener("dragover", (e) => e.preventDefault());
  zone.addEventListener("drop", (e) => {
    e.preventDefault();
    take(e.dataTransfer?.files?.[0]);
  });
  pick.addEventListener("change", () => {
    take(pick.files?.[0]);
    pick.value = "";
  });
  const st = el("div", "app-field-hint", o.recipients.length > 0 ? `${o.recipientsLabel} hear about it on Teams.` : "No owner is named on this document — the flag still shows for the controllers.");
  const lab = (t: string) => el("div", "app-field-label", t);
  dlg.body.append(lab("Review level"), level, lab("Comment"), comment, lab("Screenshot (optional)"), zone, shotBox, pick, st);
  comment.focus();

  let running = false;
  const send = async () => {
    if (running) return;
    if (comment.value.trim() === "") {
      st.textContent = "A comment is needed — say what should be looked at.";
      comment.focus();
      return;
    }
    running = true;
    st.textContent = "Flagging…";
    const file = shot !== null ? await shrinkImage(shot).catch(() => shot!) : null;
    const r = await raiseFlag(o.doc, level.value, comment.value, o.source, file);
    if (r.error !== "") {
      st.textContent = `⚠ ${r.error}`;
      running = false;
      return;
    }
    o.onRaised(r.id);
    if (o.recipients.length === 0) {
      dlg.close();
      return;
    }
    st.textContent = "Telling the owners on Teams…";
    const n = flagNotice({ level: level.value, docName: o.doc.name, flaggerName: "", comment: comment.value });
    try {
      const { sendNotifyTeams } = await import("./notify");
      const { currentViewer } = await import("../runtime");
      const who = currentViewer()?.name ?? "";
      const out = await sendNotifyTeams(o.recipients, n.subject, n.message.replace(/^Someone/, who || "Someone"), o.link, n.quote);
      if (out.error !== "") {
        st.textContent = `Flagged${r.warn !== "" ? ` (${r.warn})` : ""} — the Teams card did not go: ${out.error}`;
        const cancel = dlg.root.querySelector(".ltk-btn-secondary") as HTMLButtonElement | null;
        if (cancel !== null) cancel.textContent = "Close";
        (dlg.root.querySelector(".ltk-btn-primary") as HTMLButtonElement | null)?.remove();
        return;
      }
    } catch (e) {
      st.textContent = `Flagged — the Teams card did not go: ${(e as Error).message}`;
      return;
    }
    dlg.close();
  };
}
