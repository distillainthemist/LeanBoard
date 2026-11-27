// The CaptureCard editor: a table driven entirely by the column config.
// A row is ADDED in the table itself (addRow.ts, 2026-11-27) and edited
// through a dialog with one field per column — text/number inputs,
// a yes/no chip, and list chips (single = radio-style, multi = checkboxes)
// whose options re-filter live when their parent column's value changes.

import { applyThemeVars, defaultTheme, Theme } from "../../shared/tokens";
import { LTK_BASE_CSS } from "../../shared/ui/baseCss";
import { clear, el, ensureStylesheet } from "../../shared/ui/dom";
import { openDialog } from "../../shared/ui/dialog";
import { parsePrompts, Prompts, renderGhost, renderTitleBar, hintFor } from "../../shared/ui/chrome";
import { renderKebab } from "../../shared/ui/menu";
import { htmlToPng, htmlToSvg, saveSvg, SnapshotScheduler } from "../../shared/export/png";
import { newId, nowIso } from "../../shared/schema/id";
import {
  CaptureColumn,
  CaptureEnvelope,
  CaptureRow,
  DEFAULT_COLUMNS,
  RowHeader,
  SCHEMA_ID,
  peopleText,
} from "./types";
import type { Person } from "../../shared/schema/people";
import { InlineCell, buildInlineCell, hasContent } from "./addRow";
import {
  buildCaptureField,
  FieldEditor,
  readFields,
  renderCaptureCellInto,
  wireDependentFields,
} from "./fields";
import { CAPTURE_CSS } from "./styles";

const DEFAULT_GHOST = [
  "Nothing captured yet",
  "Tap to add the first entry.",
];

export interface CaptureEditorCallbacks {
  onChange: (env: CaptureEnvelope) => void;
  onSnapshot?: (svgMarkup: string) => void;
}

/** The styles a PICTURE of the card carries (the stored tile, the
 *  downloads): the card's own, less the blank add row. The rule lives in
 *  the picture only — hiding or lifting the row out of the live card
 *  for the moment of copying took the cursor out of it mid-typing. */
const PICTURE_CSS = LTK_BASE_CSS + CAPTURE_CSS + "\n.ltk-cc-table tfoot { display: none; }";

export class CaptureEditor {
  private readonly root: HTMLElement;
  private env: CaptureEnvelope;
  private columns: CaptureColumn[] = DEFAULT_COLUMNS;
  private rowHeaders: RowHeader[] = [];
  private titledRows = true;
  private theme: Theme = defaultTheme();
  private cardTitle = "";
  private prompts: Prompts = { general: [], fields: {} };
  private lastPromptsRaw: string | null = null;
  private readOnly = false;
  /** Who a person column's search offers (the board's people). */
  private people: Person[] = [];
  /** Header-click sort — presentation only, never part of the document. */
  private sort: { key: string; dir: 1 | -1 } | null = null;
  private readonly snapshots: SnapshotScheduler;
  private resizeObserver: ResizeObserver | null = null;

  constructor(
    host: HTMLElement,
    private readonly cb: CaptureEditorCallbacks
  ) {
    ensureStylesheet("ltk-base-css", LTK_BASE_CSS);
    ensureStylesheet("ltk-capture-css", CAPTURE_CSS);
    this.root = el("div", "ltk-root");
    host.appendChild(this.root);
    this.env = {
      schema: SCHEMA_ID,
      meta: { title: "", updated: "" },
      data: { rows: [] },
    };
    this.snapshots = new SnapshotScheduler(() => this.generateSnapshot());
    // a simple (no-list) card scales its text up to fill the box
    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(() => this.applyFontScale());
      this.resizeObserver.observe(this.root);
    }
    this.render();
  }

  /** True when every column is a plain value (no list/multi-select). */
  private isSimple(): boolean {
    return this.columns.every((c) => c.type !== "list");
  }

  setEnvelope(env: CaptureEnvelope): void {
    this.env = env;
    this.syncFixedRows();
    this.render();
    this.snapshots.schedule();
  }

  setConfig(columns: CaptureColumn[], rowHeaders: RowHeader[], titled: boolean): void {
    if (
      JSON.stringify(columns) === JSON.stringify(this.columns) &&
      JSON.stringify(rowHeaders) === JSON.stringify(this.rowHeaders) &&
      titled === this.titledRows
    ) {
      return;
    }
    this.columns = columns;
    this.rowHeaders = rowHeaders;
    this.titledRows = titled;
    this.syncFixedRows();
    this.render();
  }

  setTheme(theme: Theme): void {
    if (JSON.stringify(theme) === JSON.stringify(this.theme)) return;
    this.theme = theme;
    this.render();
  }

  setChrome(cardTitle: string, promptsRaw: string): void {
    if (cardTitle === this.cardTitle && promptsRaw === this.lastPromptsRaw) {
      return;
    }
    this.cardTitle = cardTitle;
    this.lastPromptsRaw = promptsRaw;
    this.prompts = parsePrompts(promptsRaw);
    this.render();
  }

  /** The people a person column picks from. Nothing is drawn from it
   *  until a row dialog opens, so there is no repaint. */
  /** The add row (tranche 6, G3): built once and KEPT across repaints,
   *  so a row half typed survives a refresh that lands under it. It is
   *  rebuilt when it is used, emptied, or its columns or people change. */
  private addRow: { sig: string; tr: HTMLTableRowElement; cells: InlineCell[] } | null = null;
  /** An empty card shows its prompt until someone asks to add. */
  private adding = false;
  /** Put the cursor in the add row's first cell after the next paint. */
  private focusAdd = false;

  setPeople(people: Person[]): void {
    this.people = people;
  }

  setReadOnly(ro: boolean): void {
    if (this.readOnly !== ro) {
      this.readOnly = ro;
      this.render();
    }
  }

  destroy(): void {
    this.snapshots.cancel();
    if (this.resizeObserver) this.resizeObserver.disconnect();
    this.root.remove();
  }

  /** The rows as displayed: the header-click sort applied to a COPY —
   *  the document keeps its own order (and fixed rows their sync). */
  private sortedRows(): CaptureRow[] {
    const s = this.sort;
    if (s === null) return this.env.data.rows;
    const col = this.columns.find((c) => c.key === s.key) ?? null;
    const keyOf = (r: CaptureRow): string | number => {
      if (s.key === "__rowhead") {
        return (this.rowHeaders.find((h) => h.key === r.rowKey)?.label ?? r.rowKey).toLowerCase();
      }
      const v = r.cells[s.key];
      if (v === undefined || v === "") return col && (col.type === "number" || col.type === "decimal") ? Number.NEGATIVE_INFINITY : "";
      if (col && (col.type === "number" || col.type === "decimal")) return typeof v === "number" ? v : Number(v) || 0;
      if (col && (col.type === "yesno" || col.type === "flag")) return v === true || v === "true" ? 1 : 0;
      if (col && col.type === "list") {
        const first = Array.isArray(v) ? (v[0] ?? "") : String(v);
        return (col.options.find((o) => o.value === first)?.label ?? first).toLowerCase();
      }
      // a person column sorts by its first person's name
      if (col && col.type === "person") return peopleText(v).toLowerCase();
      // text / date / datetime: ISO strings sort correctly as strings
      return String(v).toLowerCase();
    };
    return [...this.env.data.rows].sort((a, b) => {
      const ka = keyOf(a);
      const kb = keyOf(b);
      if (ka < kb) return -1 * s.dir;
      if (ka > kb) return 1 * s.dir;
      return 0;
    });
  }

  /** With fixed row headers, ensure exactly one row per header, in order. */
  private syncFixedRows(): void {
    if (this.rowHeaders.length === 0) return;
    const byKey = new Map(this.env.data.rows.map((r) => [r.rowKey, r]));
    this.env.data.rows = this.rowHeaders.map(
      (h) => byKey.get(h.key) ?? { id: newId("row"), rowKey: h.key, cells: {} }
    );
  }

  // ---- rendering ----

  private render(): void {
    const overlays = Array.from(this.root.children).filter((c) =>
      c.classList.contains("ltk-dialog-overlay")
    );
    this.renderBody();
    for (const o of overlays) this.root.appendChild(o);
  }

  private renderBody(): void {
    clear(this.root);
    applyThemeVars(this.root, this.theme);
    renderTitleBar(this.root, this.cardTitle, this.prompts);
    if (!this.readOnly) {
      renderKebab(this.root, [
        { label: "Download PNG", onClick: () => this.downloadPng() },
        { label: "Download SVG", onClick: () => this.downloadSvg() },
      ]);
    }

    const body = el("div", "ltk-cc-body");
    if (this.isSimple()) body.classList.add("ltk-cc-simple");
    this.root.appendChild(body);

    const fixed = this.rowHeaders.length > 0;
    if (!fixed && this.env.data.rows.length === 0 && !(this.adding && !this.readOnly)) {
      const lines = this.prompts.general.length
        ? this.prompts.general
        : DEFAULT_GHOST;
      const ghost = renderGhost(body, this.readOnly ? lines.slice(0, 1) : lines);
      if (!this.readOnly) {
        // the first row is typed into the table, like every other
        ghost.addEventListener("click", () => {
          this.adding = true;
          this.focusAdd = true;
          this.render();
        });
      }
      return;
    }

    const showHead = fixed && this.titledRows;
    const table = el("table", "ltk-cc-table");
    if (this.columns.some((c) => c.width !== undefined)) table.style.tableLayout = "fixed";
    const thead = el("thead");
    const headRow = el("tr");
    const sortTh = (label: string, key: string): HTMLElement => {
      const th = el("th", "ltk-cc-th-sort", label);
      if (this.sort?.key === key) th.appendChild(el("span", "ltk-cc-sortglyph", this.sort.dir === 1 ? " ▲" : " ▼"));
      th.title = "Sort by this column";
      th.addEventListener("click", () => {
        this.sort =
          this.sort?.key !== key ? { key, dir: 1 } : this.sort.dir === 1 ? { key, dir: -1 } : null;
        this.render();
      });
      return th;
    };
    if (showHead) headRow.appendChild(sortTh("", "__rowhead"));
    for (const col of this.columns) {
      const th = sortTh(col.label, col.key);
      if (col.width !== undefined) th.style.width = `${col.width}px`;
      headRow.appendChild(th);
    }
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = el("tbody");
    for (const row of this.sortedRows()) {
      const tr = el("tr", "ltk-cc-row");
      if (this.readOnly) tr.classList.add("ltk-readonly");
      if (showHead) {
        const header = this.rowHeaders.find((h) => h.key === row.rowKey);
        tr.appendChild(el("td", "ltk-cc-rowhead", header?.label ?? row.rowKey));
      }
      for (const col of this.columns) {
        tr.appendChild(this.renderCell(row, col));
      }
      if (!this.readOnly) {
        tr.addEventListener("click", () => this.editRow(row));
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    // the table scrolls inside its own wrapper so the Add-row button below it
    // stays put even when rows expand to fill the height
    const wrap = el("div", "ltk-cc-tablewrap");
    wrap.appendChild(table);
    body.appendChild(wrap);

    // free rows are ADDED in the table itself: a blank row at its foot
    // (tranche 6, G3). Editing a row is still the dialog
    if (!this.readOnly && !fixed) {
      const foot = el("tfoot");
      foot.appendChild(this.addRowEl());
      table.appendChild(foot);
      if (this.focusAdd) {
        this.focusAdd = false;
        this.addRow?.cells[0]?.focus();
      }
    }

    this.applyFontScale();
  }

  /** The add row for the columns as they are now, kept between paints. */
  private addRowEl(): HTMLTableRowElement {
    const sig = JSON.stringify([this.columns, this.people.length, this.lastPromptsRaw]);
    if (this.addRow !== null && this.addRow.sig === sig) return this.addRow.tr;
    const tr = el("tr", "ltk-cc-addrow") as HTMLTableRowElement;
    const cells = this.columns.map((col) => buildInlineCell(col, this.people, hintFor(this.prompts, col.key, "")));
    wireDependentFields(cells);
    const go = el("button", "ltk-cc-addgo", "＋") as HTMLButtonElement;
    go.type = "button";
    go.title = "Add this row (Enter)";
    go.setAttribute("aria-label", "Add this row");
    cells.forEach((cell, n) => {
      const td = el("td");
      if (n === cells.length - 1) {
        // the last cell carries the button a mouse or a thumb uses
        const line = el("div", "ltk-cc-inlast");
        line.append(cell.el, go);
        td.appendChild(line);
      } else td.appendChild(cell.el);
      tr.appendChild(td);
    });
    const add = () => {
      const row = readFields(cells);
      // a row with nothing in it is never added
      if (!hasContent(row)) {
        cells[0]?.focus();
        return;
      }
      this.env.data.rows.push({ id: newId("row"), rowKey: "", cells: row });
      this.addRow = null;
      this.focusAdd = true;
      this.commit();
    };
    go.addEventListener("click", add);
    tr.addEventListener("keydown", (e) => {
      const t = e.target as HTMLElement;
      if (e.key === "Enter") {
        // a search with its list open has used Enter for its pick; a
        // button keeps Enter for its own press
        if (e.defaultPrevented || t.tagName === "BUTTON") return;
        e.preventDefault();
        add();
      } else if (e.key === "Escape") {
        if (e.defaultPrevented || !hasContent(readFields(cells))) return;
        // Escape empties the row; an empty row lets the key go on
        e.preventDefault();
        e.stopPropagation();
        this.addRow = null;
        this.focusAdd = true;
        this.render();
      }
    });
    this.addRow = { sig, tr, cells };
    return tr;
  }

  /**
   * A simple card (plain value columns only) scales its cell text up to fill
   * the height — the fewer the rows, the larger the text. Sets a --cc-font var
   * the .ltk-cc-simple styles read. Card types with chips keep their fixed size.
   */
  private applyFontScale(): void {
    if (!this.isSimple()) {
      this.root.style.removeProperty("--cc-font");
      return;
    }
    const h = this.root.clientHeight;
    const rows = Math.max(1, this.env.data.rows.length);
    if (h <= 0) return;
    // a tile hides the title bar and the Add row button: no room reserved
    // for them (card-responsiveness-review-2026-10-30, R4)
    const tile = this.root.closest(".ltk-tile") !== null;
    const addButton = this.rowHeaders.length === 0 && !tile ? 50 : 0; // free rows show ＋ Add row
    const chromeH =
      (this.cardTitle.trim() !== "" && !tile ? 36 : 8) + 28 + 30 + addButton; // title + header + paddings + add
    const rowH = (h - chromeH) / rows;
    // the height says how big the text MAY be; the column width says how
    // big it can be before a value wraps a word a line (~12 characters)
    const colW = this.root.clientWidth / Math.max(1, this.columns.length + (this.rowHeaders.length > 0 ? 1 : 0));
    const byWidth = colW > 0 ? colW / 12 : 44;
    const font = Math.max(14, Math.min(44, Math.floor(Math.min(rowH * 0.4, byWidth))));
    if (this.root.style.getPropertyValue("--cc-font") !== `${font}px`) {
      this.root.style.setProperty("--cc-font", `${font}px`);
    }
  }

  private renderCell(row: CaptureRow, col: CaptureColumn): HTMLElement {
    const td = el("td");
    renderCaptureCellInto(td, col, row.cells[col.key]);
    return td;
  }

  // ---- the row dialog (field machinery shared with CaptureRollup: fields.ts) ----

  private editRow(row: CaptureRow | null): void {
    const fields: FieldEditor[] = this.columns.map((col) =>
      buildCaptureField(col, row?.cells[col.key], hintFor(this.prompts, col.key, ""), this.people)
    );
    wireDependentFields(fields);

    const fixed = this.rowHeaders.length > 0;
    const buttons = [];
    if (row && !fixed) {
      buttons.push({
        label: "Delete",
        kind: "danger" as const,
        onClick: () => {
          this.env.data.rows = this.env.data.rows.filter((r) => r.id !== row.id);
          dlg.close();
          this.commit();
        },
      });
    }
    buttons.push({
      label: "Cancel",
      kind: "secondary" as const,
      onClick: () => dlg.close(),
    });
    buttons.push({
      label: row ? "Save" : "Add",
      kind: "primary" as const,
      onClick: () => {
        const cells = readFields(fields);
        if (row) {
          row.cells = cells;
        } else {
          this.env.data.rows.push({ id: newId("row"), rowKey: "", cells });
        }
        dlg.close();
        this.commit();
      },
    });

    let title = "Add entry";
    if (row) {
      if (fixed && this.titledRows) {
        title = this.rowHeaders.find((h) => h.key === row.rowKey)?.label ?? "Edit entry";
      } else if (fixed) {
        title = `Entry ${this.env.data.rows.indexOf(row) + 1}`;
      } else {
        title = "Edit entry";
      }
    }
    const dlg = openDialog({
      host: this.root,
      title,
      buttons,
    });
    for (const field of fields) dlg.body.appendChild(field.el);
    const firstInput = dlg.body.querySelector<HTMLElement>("input, textarea");
    if (firstInput) firstInput.focus();
  }

  // ---- mutations ----

  private commit(): void {
    this.env.meta.updated = nowIso();
    this.render();
    this.cb.onChange(this.env);
    this.snapshots.schedule();
  }

  // ---- snapshot + downloads ----

  private generateSnapshot(): void {
    if (!this.cb.onSnapshot) return;
    htmlToSvg(this.root, PICTURE_CSS, this.theme.background, (svg) =>
      this.cb.onSnapshot!(svg)
    );
  }

    private downloadSvg(): void {
    htmlToSvg(this.root, PICTURE_CSS, this.theme.background, (svg) =>
      saveSvg(svg, "capture.svg")
    );
  }

private downloadPng(): void {
    htmlToPng(this.root, PICTURE_CSS, this.theme.background, (uri) => {
      const link = document.createElement("a");
      link.href = uri;
      link.download = "capture.png";
      link.click();
    });
  }
}
