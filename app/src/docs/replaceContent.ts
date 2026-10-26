// Replace content (5H3) — swap a held document's FILE for an uploaded
// one, inside the normal check-out discipline: the caller must hold the
// check-out, the swap is a server-side copy OVER the held file
// (overwrite=true — probe-measured), the document STAYS checked out, and
// the holder publishes with an ordinary check-in or reverts with
// Discard. Same staging handoff as add-by-upload (bytes cannot cross
// the connector), same-extension only (a swapped extension breaks
// renditions and the Edit-source door).

import { clear, el } from "../../../shared/ui/dom";
import { openDialog } from "../../../shared/ui/dialog";
import { AddFieldValue, SiteColumn, prefillFromItem, spErrorText, splitAddWrites, validateItemErrors } from "./model";
import { DocRow, buildRenderViewXml } from "./rows";
import { renderListPage } from "./data";
import { checkOutFile, connectorPatchItem, copyFileTo, fetchListItem, recycleFile, validateUpdateListItem } from "./sp";
import { editorKind } from "./fieldEditors";
import { loadLibraryFields } from "./libraryFields";

export interface ReplaceContentOpts {
  site: string;
  /** Checked out to the acting user — the caller gates. */
  row: DocRow;
  staging: { listId: string; openUrl: string };
  host: HTMLElement;
  /** The library's carried columns and the dictionary: the copy-over
   *  blanks every property (SharePoint copies the SOURCE's, and the
   *  staged upload has none — UAT DOC-032), so they are snapshotted
   *  first and written back after. */
  keep?: { columns: string[]; dictBy: Map<string, SiteColumn> };
  onDone: () => void;
}

type Sp = { ok: boolean; status: string; data: unknown };
const timed = async (p: Promise<Sp>, what: string): Promise<Sp> => {
  let clock = 0;
  const timeout = new Promise<Sp>((resolve) => {
    clock = window.setTimeout(
      () => resolve({ ok: false, status: `${what} did not answer within 25 seconds`, data: null }),
      25_000
    );
  });
  const r = await Promise.race([p, timeout]);
  window.clearTimeout(clock);
  return r;
};

export function openReplaceContent(opts: ReplaceContentOpts): void {
  const { site, row } = opts;
  let running = false;

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
      `Swaps this document's file for one you upload (same type only — .${row.ext}). ` +
        "You stay checked out: check in to publish the replacement, or Discard " +
        "check-out to revert it."
    )
  );

  const openLink = el("a", "app-btn", "Open the upload folder ↗") as HTMLAnchorElement;
  openLink.href = opts.staging.openUrl;
  openLink.target = "_blank";
  openLink.rel = "noopener";
  const refreshBtn = el("button", "app-btn", "⟳ Refresh") as HTMLButtonElement;
  refreshBtn.type = "button";
  const sel = el("select", "app-input") as HTMLSelectElement;
  const placeholder = (label: string) => {
    clear(sel);
    const o = el("option", "", label) as HTMLOptionElement;
    o.value = "";
    sel.appendChild(o);
  };
  placeholder("Refresh to list uploaded files…");
  const box = el("div", "app-docs-upbox");
  box.append(openLink, refreshBtn, sel);
  dlg.body.appendChild(box);
  const status = el("div", "app-docs-addstatus");
  dlg.body.appendChild(status);

  const stagingRows = new Map<string, DocRow>();
  const sync = () => {
    goBtn.disabled = running || sel.value === "";
  };
  sel.addEventListener("change", sync);
  sync();

  const loadStaging = () => {
    refreshBtn.disabled = true;
    void renderListPage(site, opts.staging.listId, buildRenderViewXml({ rowLimit: 30 }))
      .then((page) => {
        stagingRows.clear();
        // SAME extension only — the guard is the filter, so a wrong
        // type is never even offerable
        const matching = page.rows.filter(
          (r) => r.ext.toLowerCase() === row.ext.toLowerCase()
        );
        placeholder(
          matching.length === 0
            ? page.rows.length === 0
              ? "No files in the upload folder yet — upload, then Refresh"
              : `No .${row.ext} files in the upload folder — this document only takes .${row.ext}`
            : "Choose the replacement file…"
        );
        for (const r of matching) {
          stagingRows.set(r.uniqueId, r);
          const o = el("option", "", r.name) as HTMLOptionElement;
          o.value = r.uniqueId;
          sel.appendChild(o);
        }
        sel.value = "";
      })
      .catch(() => {
        placeholder("Could not read the upload folder — check the staging library");
      })
      .then(() => {
        refreshBtn.disabled = false;
        sync();
      });
  };
  refreshBtn.addEventListener("click", loadStaging);

  const fail = (what: string, why: string) => {
    status.textContent = `${what}: ${spErrorText(why).slice(0, 300)}`;
    status.classList.add("app-docs-addstatus-warn");
    running = false;
    sync();
  };

  const go = async () => {
    const src = stagingRows.get(sel.value);
    if (running || src === undefined) return;
    running = true;
    sync();
    status.classList.remove("app-docs-addstatus-warn");

    // snapshot every carried property BEFORE the copy-over
    const values: AddFieldValue[] = [];
    let labelOf = (internal: string) => internal;
    if (opts.keep !== undefined && opts.keep.columns.length > 0) {
      status.textContent = "Reading the properties…";
      const keep = opts.keep;
      labelOf = (internal) => keep.dictBy.get(internal)?.label || internal;
      const [{ fields }, item] = await Promise.all([
        loadLibraryFields(site, row.listId),
        timed(fetchListItem(site, row.listId, row.id), "The properties read"),
      ]);
      if (!item.ok) return fail("The properties could not be read, so nothing was replaced", item.status);
      const carried = new Set(keep.columns);
      const pre = prefillFromItem((item.data ?? {}) as Record<string, unknown>, fields);
      const personCols = fields.filter((f) => carried.has(f.internal) && editorKind(f) === "person").map((f) => f.internal);
      let people = new Map<string, { email: string; name: string }[]>();
      if (personCols.length > 0) {
        const page = await renderListPage(site, row.listId, buildRenderViewXml({ idIn: [row.id], fields: personCols, rowLimit: 1 })).catch(() => ({ rows: [] as DocRow[] }));
        const fresh = page.rows[0];
        if (fresh !== undefined) {
          people = new Map(
            personCols.map((internal) => {
              const names = (fresh.values[internal] ?? "").split(";").map((x) => x.trim()).filter((x) => x !== "");
              const mails = (fresh.values[`${internal}#email`] ?? "").split(";").filter((x) => x !== "");
              return [internal, mails.map((email, i) => ({ email, name: names[i] ?? email }))];
            })
          );
        }
      }
      for (const f of fields) {
        if (!carried.has(f.internal)) continue;
        const kind = editorKind(f);
        if (kind === null) continue;
        if (kind === "person") {
          const ps = people.get(f.internal) ?? [];
          if (ps.length > 0) values.push({ internal: f.internal, kind, people: ps });
          continue;
        }
        const v = pre.get(f.internal);
        if (v === undefined) continue;
        if (kind === "taxonomy") {
          const terms = v.terms ?? (v.term !== undefined ? [v.term] : []);
          if (terms.length === 0) continue;
          values.push({ internal: f.internal, kind, label: terms[0].label, termId: terms[0].termId, multi: f.type === "TaxonomyFieldTypeMulti", terms });
          continue;
        }
        if ((v.text ?? "") !== "") values.push({ internal: f.internal, kind, text: v.text });
      }
    }

    status.textContent = "Replacing the content…";
    const over = await timed(copyFileTo(site, src.serverUrl, row.serverUrl, true), "The replace");
    if (!over.ok) {
      return fail("The replace was refused (your check-out is untouched)", over.status);
    }

    // …and write the properties back. The copy-over RESETS the
    // check-out (Ben's run, 2026-10-27: every write refused), so the
    // bracket is re-taken first — the holder stays checked out after
    const lost: string[] = [];
    let why = "";
    if (values.length > 0) {
      status.textContent = "Taking the check-out back…";
      const out = await timed(checkOutFile(site, row.serverUrl), "The check-out");
      if (!out.ok && !/checked out/i.test(spErrorText(out.status))) why = spErrorText(out.status);
      status.textContent = "Restoring the properties…";
      const writes = splitAddWrites(values);
      if (writes.formValues.length > 0) {
        const res = await timed(validateUpdateListItem(site, row.listId, row.id, writes.formValues, false), "The properties write");
        const errs = validateItemErrors(res.data);
        if (!res.ok) {
          lost.push(...writes.formValues.map((f) => labelOf(f.FieldName)));
          why ||= spErrorText(res.status);
        } else {
          for (const e of errs) lost.push(labelOf(e.field));
          if (errs.length > 0) why ||= errs[0].message;
        }
      }
      if (Object.keys(writes.patch).length > 0) {
        const res = await timed(connectorPatchItem(site, row.listId, row.id, writes.patch), "The term write");
        if (!res.ok) {
          lost.push(...Object.keys(writes.patch).map(labelOf));
          why ||= spErrorText(res.status);
        }
      }
    }

    // the staging copy has served its purpose — best effort; the
    // replacement is IN either way
    status.textContent = "Tidying the upload folder…";
    await timed(recycleFile(site, src.serverUrl), "The tidy-up").catch(() => null);

    if (lost.length > 0) {
      // the content is IN — a property the write-back could not restore
      // is named, never lost silently
      status.textContent = `Content replaced, but these properties could not be restored — set them in Edit properties: ${[...new Set(lost)].join(", ")}.${why !== "" ? ` SharePoint said: ${why.slice(0, 200)}` : ""}`;
      status.classList.add("app-docs-addstatus-warn");
      const cancel = dlg.root.querySelector(".ltk-btn-secondary") as HTMLButtonElement | null;
      if (cancel !== null) cancel.textContent = "Close";
      goBtn.style.display = "none";
      running = false;
      opts.onDone();
      return;
    }
    dlg.close();
    opts.onDone();
  };
}
