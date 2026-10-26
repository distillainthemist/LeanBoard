// Replace content (5H3, rebuilt 2026-10-27) — IN PLACE. The file picked
// on the device goes over the held document through the connector's
// Update file with the body declared binary: the list item, its id,
// its uniqueId, its properties and its history all stay, and a version
// is added (the write probe measured it: 32 bytes for 32 sent, item
// kept, bytes read back identical). Both copy roads the app can drive
// delete and recreate the item — the runs of 2026-10-27 — so they are
// gone from here; SharePoint's own upload-and-replace stays as the
// second road, for a file too large for the connector.

import { el } from "../../../shared/ui/dom";
import { openDialog } from "../../../shared/ui/dialog";
import { SiteColumn, spErrorText } from "./model";
import { DocRow, extOf } from "./rows";
import { connectorFileIdFor, connectorUpdateFile, fetchFileInfo, fetchFileItemId } from "./sp";

export interface ReplaceContentOpts {
  site: string;
  /** Checked out to the acting user — the caller gates. */
  row: DocRow;
  /** Kept for the callers' shape; unused by the in-place road. */
  staging?: { listId: string; openUrl: string };
  host: HTMLElement;
  /** Kept for the callers' shape; the in-place road keeps every property. */
  keep?: { columns: string[]; dictBy: Map<string, SiteColumn> };
  onDone: () => void;
}

type Sp = { ok: boolean; status: string; data: unknown };
const timed = async (p: Promise<Sp>, what: string, ms = 60_000): Promise<Sp> => {
  let clock = 0;
  const timeout = new Promise<Sp>((resolve) => {
    clock = window.setTimeout(() => resolve({ ok: false, status: `${what} did not answer within ${Math.round(ms / 1000)} seconds`, data: null }), ms);
  });
  const r = await Promise.race([p, timeout]);
  window.clearTimeout(clock);
  return r;
};

export function openReplaceContent(opts: ReplaceContentOpts): void {
  const { site, row } = opts;
  let running = false;
  let picked: File | null = null;
  const origin = (() => {
    try {
      return new URL(site).origin;
    } catch {
      return "";
    }
  })();
  const folderUrl = origin !== "" ? `${origin}${row.serverUrl.replace(/\/[^/]+$/, "")}` : "";

  const dlg = openDialog({
    host: opts.host,
    title: `Replace content — ${row.name}`,
    buttons: [
      { label: "Cancel", kind: "secondary", onClick: () => { if (!running) dlg.close(); } },
      { label: "Replace content", kind: "primary", onClick: () => void go() },
    ],
  });
  const goBtn = dlg.root.querySelector(".ltk-btn-primary") as HTMLButtonElement;
  dlg.body.appendChild(
    el(
      "div",
      "app-field-hint",
      `Swaps this document's file for one from your device (same type only — .${row.ext}). The document keeps its record, properties, links and history; the new content is a version on top. You stay checked out: check in to publish it, or Discard check-out to revert.`
    )
  );
  const fileIn = el("input", "app-docs-filein") as HTMLInputElement;
  fileIn.type = "file";
  fileIn.accept = `.${row.ext}`;
  fileIn.setAttribute("aria-label", "Choose the replacement file");
  const note = el("div", "app-field-hint", "");
  const box = el("div", "app-docs-upbox");
  box.append(fileIn, note);
  dlg.body.appendChild(box);
  const status = el("div", "app-docs-addstatus");
  dlg.body.appendChild(status);
  if (folderUrl !== "") {
    const alt = el("div", "app-field-hint");
    alt.appendChild(document.createTextNode("Too large for the app, or no file at hand? "));
    const a = el("a", "app-link", "Replace it in SharePoint ↗") as HTMLAnchorElement;
    a.href = folderUrl;
    a.target = "_blank";
    a.rel = "noopener";
    alt.appendChild(a);
    alt.appendChild(document.createTextNode(" — Upload → Files → the same name → Replace, then check in here."));
    dlg.body.appendChild(alt);
  }

  const sync = () => {
    goBtn.disabled = running || picked === null;
  };
  fileIn.addEventListener("change", () => {
    const f = fileIn.files?.[0] ?? null;
    status.textContent = "";
    status.classList.remove("app-docs-addstatus-warn");
    if (f !== null && extOf(f.name).toLowerCase() !== row.ext.toLowerCase()) {
      picked = null;
      note.textContent = `${f.name} is a .${extOf(f.name) || "?"} — this document only takes .${row.ext}.`;
      sync();
      return;
    }
    picked = f;
    note.textContent = f !== null ? `${f.name} · ${Math.max(1, Math.round(f.size / 1024))} KB` : "";
    sync();
  });
  sync();

  const fail = (what: string, why: string) => {
    status.textContent = `${what}: ${spErrorText(why).slice(0, 300)}`;
    status.classList.add("app-docs-addstatus-warn");
    running = false;
    sync();
  };

  const go = async () => {
    if (running || picked === null) return;
    running = true;
    sync();
    status.classList.remove("app-docs-addstatus-warn");

    status.textContent = "Reading the file…";
    const bytes = new Uint8Array(await picked.arrayBuffer());
    const before = (((await fetchFileItemId(site, row.serverUrl)).data ?? {}) as { Id?: unknown; GUID?: unknown });

    status.textContent = `Replacing the content (${Math.max(1, Math.round(bytes.length / 1024))} KB)…`;
    const up = await timed(connectorUpdateFile(site, connectorFileIdFor(site, row.serverUrl), bytes), "The replace", 180_000);
    if (!up.ok) return fail("The replace was refused (your check-out and the old content are untouched)", up.status);

    status.textContent = "Checking the result…";
    const info = await fetchFileInfo(site, row.serverUrl);
    const landed = Number((info.data as { Length?: unknown })?.Length ?? -1);
    const after = (((await fetchFileItemId(site, row.serverUrl)).data ?? {}) as { Id?: unknown; GUID?: unknown });
    const sameItem = String(before.Id ?? "") === String(after.Id ?? "") && String(before.GUID ?? "") === String(after.GUID ?? "");
    if (landed !== bytes.length || !sameItem) {
      return fail(
        "The replace landed wrong",
        `${landed} bytes for ${bytes.length} sent; record ${sameItem ? "kept" : "CHANGED"} — check the document in SharePoint before checking in`
      );
    }
    dlg.close();
    opts.onDone();
  };
}
