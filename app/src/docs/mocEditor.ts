// The management-of-change editor (issue 10, 2026-10-18 round; Ben's
// shape 2026-10-19): the MoC column is a Note holding a JSON list of
// records — reference number, link, optional title and date — the way
// the links column holds its JSON. Rows add and remove; untouched
// writes nothing. Lives inside the field editors so Edit properties,
// Add document and the ingestion grid all get it.

import { clear, el } from "../../../shared/ui/dom";
import { MocRecord, normaliseMocUrl, parseMocRecords, serializeMocRecords } from "./model";

export interface MocEditor {
  root: HTMLElement;
  /** The serialised list; "" when there are no records. */
  read: () => string;
  isEmpty: () => boolean;
  touched: () => boolean;
}

export function buildMocEditor(opts: { initialRaw: string; onChange: () => void }): MocEditor {
  const root = el("div", "app-docs-mocbox");
  const rows: MocRecord[] = (parseMocRecords(opts.initialRaw) ?? []).map((r) => ({ ...r }));
  let touched = false;
  const list = el("div", "app-docs-moclist");
  root.appendChild(list);
  const paint = () => {
    clear(list);
    if (rows.length === 0) list.appendChild(el("div", "app-field-hint", "No change records yet."));
    rows.forEach((r, i) => {
      const row = el("div", "app-docs-mocrow");
      const ref = el("input", "app-input app-docs-mocref") as HTMLInputElement;
      ref.placeholder = "MoC number";
      ref.value = r.ref;
      ref.addEventListener("input", () => {
        r.ref = ref.value.trim();
        touched = true;
        opts.onChange();
      });
      const url = el("input", "app-input app-docs-mocurl") as HTMLInputElement;
      url.type = "url";
      url.placeholder = "Link (https://…)";
      url.value = r.url;
      url.addEventListener("input", () => {
        r.url = url.value.trim();
        touched = true;
        opts.onChange();
      });
      const title = el("input", "app-input app-docs-moctitle") as HTMLInputElement;
      title.placeholder = "What changed (optional)";
      title.value = r.title;
      title.addEventListener("input", () => {
        r.title = title.value.trim();
        touched = true;
        opts.onChange();
      });
      const x = el("button", "app-link app-docs-mocx", "✕") as HTMLButtonElement;
      x.type = "button";
      x.title = "Remove this record";
      x.addEventListener("click", () => {
        rows.splice(i, 1);
        touched = true;
        paint();
        opts.onChange();
      });
      row.append(ref, url, title, x);
      list.appendChild(row);
    });
  };
  const add = el("button", "app-link app-docs-mocadd", "＋ Add a change record") as HTMLButtonElement;
  add.type = "button";
  add.addEventListener("click", () => {
    rows.push({ ref: "", url: "", title: "", date: new Date().toISOString().slice(0, 10) });
    touched = true;
    paint();
    list.querySelector<HTMLInputElement>(".app-docs-mocrow:last-child .app-docs-mocref")?.focus();
    opts.onChange();
  });
  root.appendChild(add);
  paint();
  const kept = () => rows.map((r) => ({ ...r, url: normaliseMocUrl(r.url) })).filter((r) => r.ref !== "" || r.url !== "");
  return {
    root,
    read: () => (kept().length === 0 ? "" : serializeMocRecords(kept())),
    isEmpty: () => kept().length === 0,
    touched: () => touched,
  };
}
