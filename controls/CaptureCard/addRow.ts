// The capture card's ADD ROW, typed straight into the table (backlog
// programme tranche 6, G3, 2026-11-27 — Ben's choice; it reverses
// decision 8 of the canvas plan, "capture keeps its dialog", for adding
// a row). A blank row sits at the foot of the table: Tab moves across
// its cells, Enter adds the row and starts the next, Escape empties it.
// Editing an existing row is still the dialog (fields.ts).
//
// Each cell is the smallest editor its column type allows. They share
// the dialog's FieldEditor shape, so the dependent-list wiring
// (`wireDependentFields`) and `readFields` serve both.

import { el } from "../../shared/ui/dom";
import { buildTypeAhead } from "../../shared/ui/typeAhead";
import type { Person } from "../../shared/schema/people";
import { FieldEditor, isImageIcon } from "./fields";
import { CaptureColumn, CellPerson, CellValue, ListOption, encodePeople } from "./types";

export interface InlineCell extends FieldEditor {
  /** Put the cursor in this cell. */
  focus: () => void;
}

/** Is there anything in a row worth adding? An unticked box, an empty
 *  text and an empty list are nothing; a number — zero included — and a
 *  ticked box are something. Pure. */
export function hasContent(cells: Record<string, CellValue | undefined>): boolean {
  return Object.values(cells).some((v) => {
    if (v === undefined || v === false) return false;
    if (typeof v === "string") return v.trim() !== "";
    if (Array.isArray(v)) return v.length > 0;
    return true;
  });
}

/** The options a dependent list offers for its parent's values (the
 *  dialog's rule, fields.ts). Pure. */
export function optionsFor(col: Pick<CaptureColumn, "options" | "parent">, parentValues: string[]): ListOption[] {
  return col.options.filter((o) => o.when === "" || col.parent === "" || parentValues.includes(o.when));
}

/** An option as a drop-down line: a text icon leads, a picture cannot. */
export function optionText(o: ListOption): string {
  return o.icon !== "" && !isImageIcon(o.icon) ? `${o.icon} ${o.label}` : o.label;
}

const input = (type: string, col: CaptureColumn, placeholder = ""): HTMLInputElement => {
  const i = el("input", "ltk-cc-in") as HTMLInputElement;
  i.type = type;
  i.setAttribute("aria-label", col.label);
  if (placeholder !== "") i.placeholder = placeholder;
  return i;
};

const chipList = <T>(host: HTMLElement, items: () => T[], label: (x: T) => string, remove: (x: T) => void): (() => void) => {
  const paint = () => {
    while (host.firstChild) host.removeChild(host.firstChild);
    for (const x of items()) {
      const chip = el("span", "ltk-sup-chip", label(x));
      const off = el("button", "ltk-sup-x", "✕") as HTMLButtonElement;
      off.type = "button";
      off.title = `Remove ${label(x)}`;
      off.setAttribute("aria-label", off.title);
      off.addEventListener("click", () => {
        remove(x);
        paint();
      });
      chip.appendChild(off);
      host.appendChild(chip);
    }
    host.style.display = items().length > 0 ? "" : "none";
  };
  paint();
  return paint;
};

/** One cell of the add row, by the column's type. */
export function buildInlineCell(col: CaptureColumn, people: Person[], textPlaceholder: string): InlineCell {
  const wrap = el("div", "ltk-cc-incell");

  if (col.type === "person") {
    let chosen: CellPerson[] = [];
    const same = (a: CellPerson, b: CellPerson) => (a.whoId !== "" && b.whoId !== "" ? a.whoId === b.whoId : a.who.toLowerCase() === b.who.toLowerCase());
    const chips = el("div", "ltk-sup-chips");
    const paint = chipList(
      chips,
      () => chosen,
      (p) => (p.who !== "" ? p.who : "(no name)"),
      (p) => (chosen = chosen.filter((y) => y !== p))
    );
    const add = (p: CellPerson) => {
      if (!col.multi) chosen = [p];
      else if (!chosen.some((y) => same(y, p))) chosen = [...chosen, p];
      paint();
    };
    // the standing type-ahead over the card's people; a name nobody on
    // the list has is kept as typed (Enter adds the row with it)
    const box = buildTypeAhead({
      placeholder: col.multi ? "Add a person…" : "Choose a person…",
      label: col.label,
      inputClass: "ltk-cc-in",
      noneWords: "No one matches. The name is kept as typed.",
      local: (ql) => people.filter((x) => x.who.toLowerCase().includes(ql) && !chosen.some((y) => same(y, x))).map((x) => ({ label: x.who, run: () => add({ whoId: x.whoId, who: x.who }) })),
    });
    wrap.append(chips, box.el);
    return {
      column: col,
      el: wrap,
      focus: () => box.input.focus(),
      read: () => {
        const typed = box.input.value.trim();
        const all = typed !== "" && !chosen.some((y) => same(y, { whoId: "", who: typed })) ? (col.multi ? [...chosen, { whoId: "", who: typed }] : [{ whoId: "", who: typed }]) : chosen;
        return all.length === 0 ? undefined : encodePeople(all);
      },
    };
  }

  if (col.type === "yesno" || col.type === "flag") {
    const lab = el("label", "ltk-cc-intick");
    const box = input("checkbox", col);
    box.className = "";
    lab.appendChild(box);
    if (col.type === "flag") lab.appendChild(el("span", "ltk-cc-flag", "⚑"));
    wrap.appendChild(lab);
    return { column: col, el: wrap, focus: () => box.focus(), read: () => box.checked };
  }

  if (col.type === "date" || col.type === "datetime") {
    const i = input(col.type === "datetime" ? "datetime-local" : "date", col);
    wrap.appendChild(i);
    return { column: col, el: wrap, focus: () => i.focus(), read: () => (i.value.trim() === "" ? undefined : i.value) };
  }

  if (col.type === "number" || col.type === "decimal") {
    const i = input("number", col);
    if (col.type === "number") i.step = "1";
    wrap.appendChild(i);
    return {
      column: col,
      el: wrap,
      focus: () => i.focus(),
      read: () => {
        if (i.value.trim() === "") return undefined;
        const n = Number(i.value);
        if (!Number.isFinite(n)) return undefined;
        return col.type === "number" ? Math.round(n) : n;
      },
    };
  }

  if (col.type === "list") {
    const sel = el("select", "ltk-cc-in") as HTMLSelectElement;
    sel.setAttribute("aria-label", col.label);
    let chosen: string[] = [];
    let allowed: ListOption[] = [];
    const chips = el("div", "ltk-sup-chips");
    const labelOf = (v: string) => {
      const o = col.options.find((x) => x.value === v);
      return o ? optionText(o) : v;
    };
    const field: InlineCell = {
      column: col,
      el: wrap,
      focus: () => sel.focus(),
      read: () => {
        if (!col.multi) return sel.value === "" ? undefined : sel.value;
        return chosen.length === 0 ? undefined : [...chosen];
      },
      currentValues: () => (col.multi ? [...chosen] : sel.value === "" ? [] : [sel.value]),
    };
    const fill = () => {
      const keep = sel.value;
      while (sel.firstChild) sel.removeChild(sel.firstChild);
      const none = el("option", undefined, allowed.length === 0 ? (col.parent !== "" ? "Pick the parent first" : "No options") : col.multi ? (chosen.length > 0 ? "Add another…" : "Choose…") : "—") as HTMLOptionElement;
      none.value = "";
      sel.appendChild(none);
      for (const o of allowed) {
        if (col.multi && chosen.includes(o.value)) continue;
        const opt = el("option", undefined, optionText(o)) as HTMLOptionElement;
        opt.value = o.value;
        sel.appendChild(opt);
      }
      sel.value = !col.multi && allowed.some((o) => o.value === keep) ? keep : "";
    };
    const paint = col.multi
      ? chipList(
          chips,
          () => chosen,
          labelOf,
          (v) => {
            chosen = chosen.filter((x) => x !== v);
            fill();
            field.onChanged?.();
          }
        )
      : () => undefined;
    sel.addEventListener("change", () => {
      if (col.multi && sel.value !== "") {
        // several values: each pick becomes a chip and the list is ready
        // for the next
        chosen = [...chosen, sel.value];
        paint();
        fill();
      }
      field.onChanged?.();
    });
    field.refilter = (parentValues) => {
      allowed = optionsFor(col, parentValues);
      const before = chosen.length;
      chosen = chosen.filter((v) => allowed.some((o) => o.value === v));
      if (chosen.length !== before) paint();
      fill();
    };
    field.refilter([]);
    if (col.multi) wrap.appendChild(chips);
    wrap.appendChild(sel);
    return field;
  }

  // text (default)
  const i = input("text", col, textPlaceholder);
  wrap.appendChild(i);
  return { column: col, el: wrap, focus: () => i.focus(), read: () => (i.value.trim() === "" ? undefined : i.value.trim()) };
}
