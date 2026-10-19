// The document flags queue (issue 23): open flags with their level,
// document, who raised them and why, the screenshot when one came —
// for controllers from the register's kebab, for super admins from
// Settings → Documents, and for one document from its overlay chip.
// Close… asks for the note that becomes the record.

import { clear, el } from "../../../shared/ui/dom";
import { openDialog } from "../../../shared/ui/dialog";
import { statusChip as tonePill } from "../../../shared/ui/format";
import { promptText } from "../prompts";
import { formatWhen } from "./rows";
import { closeFlag, flagScreenshotUrl } from "./docFlags";
import { DocFlag } from "./docFlagsModel";

export function openFlagQueue(opts: {
  host: HTMLElement;
  title: string;
  /** The flags to show (re-read on every repaint). */
  flags: () => Promise<DocFlag[]>;
  /** May this person close flags (controllers, owners of the document). */
  canClose: (f: DocFlag) => boolean;
  /** Open the document behind a flag (undefined = no road from here). */
  onOpenDoc?: (f: DocFlag) => void;
  onChanged: () => void;
}): void {
  const dlg = openDialog({
    host: opts.host,
    title: opts.title,
    maxWidth: 680,
    buttons: [{ label: "Close", kind: "primary", onClick: () => dlg.close() }],
  });
  const status = el("div", "app-docs-addstatus");
  const list = el("div", "app-docs-flagqueue");
  dlg.body.append(list, status);
  const lightbox = (url: string) => {
    const box = el("div", "app-issad-lightbox");
    const img = el("img", "") as HTMLImageElement;
    img.src = url;
    box.appendChild(img);
    box.addEventListener("click", () => box.remove());
    document.body.appendChild(box);
  };
  const paint = async () => {
    clear(list);
    list.appendChild(el("div", "app-loading-line", "Reading flags…"));
    const flags = await opts.flags().catch(() => [] as DocFlag[]);
    clear(list);
    const open = flags.filter((f) => f.status === "open");
    const closed = flags.filter((f) => f.status === "closed");
    if (flags.length === 0) {
      list.appendChild(el("div", "app-settings-note", "No flags."));
      return;
    }
    const row = (f: DocFlag) => {
      const r = el("div", "app-docs-flagrow" + (f.status === "closed" ? " app-docs-flagrow-closed" : ""));
      const head = el("div", "app-docs-flaghead");
      head.appendChild(tonePill(`⚑ ${f.level}`, f.status === "open" ? "amber" : "neutral"));
      if (opts.onOpenDoc !== undefined && f.status === "open") {
        const b = el("button", "app-link app-docs-flagdoc", f.docName) as HTMLButtonElement;
        b.type = "button";
        b.title = "Open the document";
        b.addEventListener("click", () => {
          dlg.close();
          opts.onOpenDoc?.(f);
        });
        head.appendChild(b);
      } else head.appendChild(el("span", "app-docs-flagdoc", f.docName));
      if (f.docVersion !== "") head.appendChild(el("span", "app-field-hint", `v${f.docVersion}`));
      if (f.source === "ingestion") head.appendChild(el("span", "app-field-hint", "raised in ingestion"));
      r.appendChild(head);
      r.appendChild(el("div", "app-field-hint", `${f.flaggerName || f.flaggerEmail} · ${f.flaggedAt !== "" ? formatWhen(f.flaggedAt) : ""}`));
      if (f.comment !== "") r.appendChild(el("div", "app-docs-flagcomment", f.comment));
      if (f.hasScreenshot) {
        const shots = el("div", "app-issue-shots");
        r.appendChild(shots);
        void flagScreenshotUrl(f.id).then((url) => {
          if (url === "") {
            shots.remove();
            return;
          }
          const cell = el("div", "app-issue-shot");
          const img = el("img", "") as HTMLImageElement;
          img.src = url;
          img.alt = "screenshot";
          img.title = "View full size";
          img.style.cursor = "zoom-in";
          img.addEventListener("click", () => lightbox(url));
          cell.appendChild(img);
          shots.appendChild(cell);
        });
      }
      if (f.status === "closed") {
        r.appendChild(el("div", "app-field-hint", `Closed by ${f.closedByName || "—"} ${f.closedAt !== "" ? formatWhen(f.closedAt) : ""}${f.resolution !== "" ? ` — ${f.resolution}` : ""}`));
      } else if (opts.canClose(f)) {
        const acts = el("div", "app-docs-tagpropacts");
        const close = el("button", "app-btn", "Close flag…") as HTMLButtonElement;
        close.type = "button";
        close.addEventListener("click", () => {
          void (async () => {
            const note = await promptText({ title: `Close “${f.level}” on ${f.docName}`, note: "What was done — this becomes the flag's record.", required: "A note is needed.", confirmLabel: "Close flag" });
            if (note === null) return;
            close.disabled = true;
            const err = await closeFlag(f.id, note);
            status.textContent = err !== "" ? `Could not close: ${err}` : `Closed — ${f.docName}.`;
            opts.onChanged();
            await paint();
          })();
        });
        acts.appendChild(close);
        r.appendChild(acts);
      }
      return r;
    };
    if (open.length > 0) list.appendChild(el("div", "app-docs-tasksgroup", `Open (${open.length})`));
    for (const f of open) list.appendChild(row(f));
    if (closed.length > 0) {
      list.appendChild(el("div", "app-docs-tasksgroup", `Closed (${closed.length})`));
      for (const f of closed.slice(0, 20)) list.appendChild(row(f));
    }
  };
  void paint();
}
