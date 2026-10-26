// Replace content (5H3, rebuilt 2026-10-27) — a guided step through
// SharePoint's OWN upload, not a copy. Both copy roads the app can
// drive (the legacy copyto with overwrite and the modern
// MoveCopyUtil.CopyFileByPath with overwrite) DELETE and RECREATE the
// list item on a copy-over: new id, new uniqueId, every property
// blanked, and the file no longer answers at its path ("Item does not
// exist", "File Not Found" — Ben's runs, 2026-10-27). Every link,
// favourite, flag and request anchored to the document would be
// orphaned. File bytes cannot cross the connector (the 4A probes,
// re-measured per SDK bump), so there is no in-place content write the
// app can make. SharePoint's upload-and-replace keeps the record and
// adds a version — so the dialog opens the folder, says exactly what to
// do, and brings the register back to the document afterwards.

import { el } from "../../../shared/ui/dom";
import { openDialog } from "../../../shared/ui/dialog";
import { SiteColumn } from "./model";
import { DocRow } from "./rows";

export interface ReplaceContentOpts {
  site: string;
  /** Checked out to the acting user — the caller gates. */
  row: DocRow;
  /** Kept for the callers' shape; the guided step uses the document's
   *  own folder, not the staging library. */
  staging?: { listId: string; openUrl: string };
  host: HTMLElement;
  /** Kept for the callers' shape — SharePoint's own replace keeps the
   *  properties, so nothing is snapshotted here any more. */
  keep?: { columns: string[]; dictBy: Map<string, SiteColumn> };
  onDone: () => void;
}

export function openReplaceContent(opts: ReplaceContentOpts): void {
  const { site, row } = opts;
  const origin = (() => {
    try {
      return new URL(site).origin;
    } catch {
      return "";
    }
  })();
  const folder = row.serverUrl.replace(/\/[^/]+$/, "");
  const folderUrl = origin !== "" ? `${origin}${folder}` : "";

  const dlg = openDialog({
    host: opts.host,
    title: `Replace content — ${row.name}`,
    buttons: [
      { label: "Cancel", kind: "secondary", onClick: () => dlg.close() },
      {
        label: "Done — refresh the document",
        kind: "primary",
        onClick: () => {
          dlg.close();
          opts.onDone();
        },
      },
    ],
  });
  dlg.body.appendChild(
    el(
      "div",
      "app-field-hint",
      "The new file goes in through SharePoint's own upload, which keeps this document's record, its properties, its links and its history, and adds a version. A copy from the upload folder would create a new record and orphan everything anchored to this one."
    )
  );
  const steps = el("ol", "app-docs-replacesteps");
  const step = (text: string) => {
    const li = el("li", "", text);
    steps.appendChild(li);
    return li;
  };
  const first = step("Open the document's folder in SharePoint: ");
  const link = el("a", "app-btn app-docs-replaceopen", "Open the folder ↗") as HTMLAnchorElement;
  if (folderUrl !== "") {
    link.href = folderUrl;
    link.target = "_blank";
    link.rel = "noopener";
  } else {
    link.setAttribute("aria-disabled", "true");
  }
  first.appendChild(link);
  step(`Upload → Files → pick the new file, named exactly “${row.name}”. When SharePoint asks, choose Replace.`);
  step("Come back here, click “Done — refresh the document”, then Check in… with a comment that says what changed.");
  dlg.body.appendChild(steps);
  dlg.body.appendChild(
    el(
      "div",
      "app-field-hint",
      `Same type only (.${row.ext}): a different extension breaks the preview and the Edit-source door. You stay checked out throughout — Discard check-out reverts the replacement.`
    )
  );
}
