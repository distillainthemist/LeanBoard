// Capture field machinery, shared by the CaptureCard editor and the
// CaptureRollup's full-edit dialog: cell content rendering, the per-column
// dialog field builders, and the dependent-picklist cascade wiring.
// Extracted verbatim from editor.ts (R3 of the capture-rollup plan) — the
// behaviour is the capture card's, not a variant.

import { checkItem, checklist, fieldRow, textInput } from "../../shared/ui/dialog";
import { el } from "../../shared/ui/dom";
import { personTypeAhead } from "../../shared/ui/personTypeAhead";
import type { Person } from "../../shared/schema/people";
import { CaptureColumn, CellPerson, CellValue, ListOption, decodePeople, encodePeople } from "./types";

/** An icon is rendered as an image when it's a data URI or a URL. */
export function isImageIcon(icon: string): boolean {
  return /^(data:|https?:\/\/|\/)/i.test(icon);
}

/** A picklist value as its option chip (icon + label). */
export function optionChip(option: ListOption | undefined, value: string): HTMLElement {
  const chip = el("span", "ltk-cc-chip");
  const icon = option?.icon ?? "";
  if (isImageIcon(icon)) {
    const img = el("img") as HTMLImageElement;
    img.src = icon;
    img.alt = "";
    chip.appendChild(img);
  } else if (icon !== "") {
    chip.appendChild(el("span", undefined, icon));
  }
  chip.appendChild(el("span", undefined, option?.label ?? value));
  return chip;
}

/** "26 Aug 2026" / "26 Aug 2026, 14:30" — a stored ISO day/datetime as a
 *  person reads it; anything unparseable shows as typed. */
export function formatCaptureDate(raw: string, withTime: boolean): string {
  const t = Date.parse(withTime ? raw : `${raw}T00:00:00`);
  if (!Number.isFinite(t)) return raw;
  const d = new Date(t);
  const day = d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  return withTime ? `${day}, ${d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}` : day;
}

/** Render one cell's content into `td`, by the column's type. */
export function renderCaptureCellInto(
  td: HTMLElement,
  col: CaptureColumn,
  value: CellValue | undefined
): void {
  if (value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) {
    td.appendChild(el("span", "ltk-cc-empty", "—"));
    return;
  }
  if (col.type === "yesno") {
    td.textContent = value === true || value === "true" ? "✓" : "—";
    return;
  }
  if (col.type === "flag") {
    if (value === true || value === "true") {
      td.appendChild(el("span", "ltk-cc-flag", "⚑"));
    } else {
      td.appendChild(el("span", "ltk-cc-empty", "—"));
    }
    return;
  }
  if (col.type === "date" || col.type === "datetime") {
    td.textContent = formatCaptureDate(String(value), col.type === "datetime");
    return;
  }
  if (col.type === "list") {
    const values = Array.isArray(value) ? value : [String(value)];
    for (const v of values) {
      const option = col.options.find((o) => o.value === v);
      td.appendChild(optionChip(option, v));
    }
    return;
  }
  if (col.type === "person") {
    const people = decodePeople(value);
    if (people.length === 0) td.appendChild(el("span", "ltk-cc-empty", "—"));
    for (const p of people) td.appendChild(el("span", "ltk-cc-chip ltk-cc-person", p.who !== "" ? p.who : "(no name)"));
    return;
  }
  td.textContent = Array.isArray(value) ? value.join(", ") : String(value);
}

/** A field editor inside the row dialog. */
export interface FieldEditor {
  column: CaptureColumn;
  el: HTMLElement;
  read: () => CellValue | undefined;
  /** Re-filter options against the parent's selected value(s) (dependent lists). */
  refilter?: (parentValues: string[]) => void;
  /** All currently selected values (a multi-select parent drives children with every pick). */
  currentValues?: () => string[];
  onChanged?: () => void; // wired by the dialog to cascade re-filters
}

/** Build one dialog field for a column, seeded with the row's value.
 *  `people` feeds a person column's search; without any, names are typed. */
export function buildCaptureField(
  col: CaptureColumn,
  value: CellValue | undefined,
  textPlaceholder: string,
  people: Person[] = []
): FieldEditor {
  if (col.type === "person") {
    // the standing search-and-pick: a type-ahead, the chosen as chips
    let chosen: CellPerson[] = decodePeople(value);
    const same = (a: CellPerson, b: CellPerson) => (a.whoId !== "" && b.whoId !== "" ? a.whoId === b.whoId : a.who.toLowerCase() === b.who.toLowerCase());
    const wrap = el("div", "ltk-cc-people");
    wrap.appendChild(el("div", "ltk-field-label", col.label));
    const chips = el("div", "ltk-sup-chips");
    const paint = () => {
      while (chips.firstChild) chips.removeChild(chips.firstChild);
      for (const p of chosen) {
        const chip = el("span", "ltk-sup-chip", p.who !== "" ? p.who : "(no name)");
        const x = el("button", "ltk-sup-x", "✕") as HTMLButtonElement;
        x.type = "button";
        x.title = `Remove ${p.who}`;
        x.setAttribute("aria-label", x.title);
        x.addEventListener("click", () => {
          chosen = chosen.filter((y) => y !== p);
          paint();
        });
        chip.appendChild(x);
        chips.appendChild(chip);
      }
      chips.style.display = chosen.length > 0 ? "" : "none";
    };
    const add = (p: CellPerson) => {
      if (!col.multi) chosen = [p];
      else if (!chosen.some((y) => same(y, p))) chosen = [...chosen, p];
      paint();
    };
    const placeholder = col.multi ? "Add a person…" : "Choose a person…";
    if (people.length > 0) {
      const box = personTypeAhead(
        placeholder,
        (q) => people.filter((x) => x.who.toLowerCase().includes(q) && !chosen.some((y) => same(y, x))).slice(0, 10),
        (person) => {
          add({ whoId: person.whoId, who: person.who });
          box.input.value = "";
        }
      );
      wrap.append(chips, box.el);
    } else {
      // no people list (a standalone control): a typed name stands
      const typed = textInput("", { placeholder: "Name, then Enter" });
      typed.setAttribute("aria-label", col.label);
      typed.addEventListener("keydown", (e) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        const name = typed.value.trim();
        if (name === "") return;
        typed.value = "";
        add({ whoId: "", who: name });
      });
      wrap.append(chips, typed);
    }
    paint();
    return { column: col, el: wrap, read: () => (chosen.length === 0 ? undefined : encodePeople(chosen)) };
  }

  if (col.type === "yesno" || col.type === "flag") {
    const chk = checkItem(col.type === "flag" ? `⚑ ${col.label}` : col.label);
    chk.box.checked = value === true || value === "true";
    chk.wrap.classList.toggle("ltk-check-on", chk.box.checked);
    return { column: col, el: chk.wrap, read: () => chk.box.checked };
  }

  if (col.type === "date" || col.type === "datetime") {
    const input = textInput(value === undefined ? "" : String(value), {
      type: col.type === "datetime" ? "datetime-local" : "date",
    });
    const wrap = fieldRow(col.label, input);
    wrap.classList.add("ltk-field-half");
    return {
      column: col,
      el: wrap,
      read: () => (input.value.trim() === "" ? undefined : input.value),
    };
  }

  if (col.type === "number" || col.type === "decimal") {
    const input = textInput(value === undefined ? "" : String(value), {
      type: "number",
    });
    if (col.type === "number") input.step = "1";
    const wrap = fieldRow(col.label, input);
    wrap.classList.add("ltk-field-half");
    return {
      column: col,
      el: wrap,
      read: () => {
        if (input.value.trim() === "") return undefined;
        const n = Number(input.value);
        if (!Number.isFinite(n)) return undefined;
        return col.type === "number" ? Math.round(n) : n;
      },
    };
  }

  if (col.type === "list") {
    const wrap = el("div");
    wrap.appendChild(el("div", "ltk-field-label", col.label));
    const list = checklist();
    wrap.appendChild(list);
    const selected = new Set<string>(
      Array.isArray(value) ? value : value !== undefined ? [String(value)] : []
    );
    let boxes: { box: HTMLInputElement; wrap: HTMLElement; value: string }[] = [];
    const field: FieldEditor = {
      column: col,
      el: wrap,
      read: () => {
        const picked = boxes.filter((b) => b.box.checked).map((b) => b.value);
        if (picked.length === 0) return undefined;
        return col.multi ? picked : picked[0];
      },
      currentValues: () => boxes.filter((b) => b.box.checked).map((b) => b.value),
    };
    const rebuild = (parentValues: string[]) => {
      while (list.firstChild) list.removeChild(list.firstChild);
      boxes = [];
      const options = col.options.filter(
        (o) => o.when === "" || col.parent === "" || parentValues.includes(o.when)
      );
      for (const option of options) {
        const item = checkItem("");
        // chip content: icon + label
        item.wrap.appendChild(optionChip(option, option.value));
        if (selected.has(option.value)) {
          item.box.checked = true;
          item.wrap.classList.add("ltk-check-on");
        }
        item.box.addEventListener("change", () => {
          if (!col.multi && item.box.checked) {
            for (const other of boxes) {
              if (other.box !== item.box && other.box.checked) {
                other.box.checked = false;
                other.wrap.classList.remove("ltk-check-on");
              }
            }
          }
          // keep the selection set current so a parent re-filter preserves it
          selected.clear();
          for (const b of boxes) if (b.box.checked) selected.add(b.value);
          if (field.onChanged) field.onChanged();
        });
        list.appendChild(item.wrap);
        boxes.push({ box: item.box, wrap: item.wrap, value: option.value });
      }
      if (options.length === 0) {
        list.appendChild(
          el("div", "ltk-cc-empty", col.parent !== "" ? "Pick the parent first" : "No options")
        );
      }
    };
    field.refilter = rebuild;
    rebuild([]);
    return field;
  }

  // text (default)
  const input = textInput(value === undefined ? "" : String(value), {
    placeholder: textPlaceholder,
  });
  return {
    column: col,
    el: fieldRow(col.label, input),
    read: () => (input.value.trim() === "" ? undefined : input.value.trim()),
  };
}

/** Wire dependent lists: a parent's selection change re-filters every child
 *  column keyed to it, with an initial filter against the loaded values. */
export function wireDependentFields(fields: FieldEditor[]): void {
  for (const field of fields) {
    const children = fields.filter(
      (f) => f.column.parent !== "" && f.column.parent === field.column.key
    );
    if (children.length === 0) continue;
    const cascade = () => {
      const parentValues = field.currentValues ? field.currentValues() : [];
      for (const child of children) {
        if (child.refilter) child.refilter(parentValues);
      }
    };
    field.onChanged = cascade;
    cascade(); // initial filter against the loaded value
  }
}

/** Read every field into a sparse cells record (unset values dropped). */
export function readFields(fields: FieldEditor[]): Record<string, CellValue> {
  const cells: Record<string, CellValue> = {};
  for (const field of fields) {
    const v = field.read();
    if (v !== undefined) cells[field.column.key] = v;
  }
  return cells;
}
