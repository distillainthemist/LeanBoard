// A small type-ahead over a list of people — the standing search-picker
// pattern (docs/ui-standard.md §2.x). Its own module so the capture
// card's person column can use it without the action dialog (2026-11-18).

import { el } from "./dom";
import { textInput } from "./dialog";
import type { Person } from "../schema/people";

/** A small type-ahead over a list of people (the standing search-picker
 *  pattern, docs/ui-standard.md §2.x): the list floats under the box with
 *  its own scroll, ↑ ↓ move, Enter picks (never the dialog's Save),
 *  Escape closes. */
export function personTypeAhead(placeholder: string, find: (q: string) => Person[], onPick: (p: Person) => void): { el: HTMLElement; input: HTMLInputElement } {
  const input = textInput("", { placeholder });
  input.setAttribute("aria-label", placeholder);
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-autocomplete", "list");
  input.autocomplete = "off";
  const pop = el("div", "ltk-who-pop");
  pop.setAttribute("role", "listbox");
  pop.style.display = "none";
  const box = el("div", "ltk-who-box");
  box.append(input, pop);
  let options: { el: HTMLButtonElement; run: () => void }[] = [];
  let active = 0;
  const close = () => {
    pop.style.display = "none";
    input.setAttribute("aria-expanded", "false");
    options = [];
  };
  const paintActive = () => {
    options.forEach((o, n) => {
      o.el.classList.toggle("ltk-who-opt-on", n === active);
      o.el.setAttribute("aria-selected", String(n === active));
    });
    options[active]?.el.scrollIntoView({ block: "nearest" });
  };
  const render = () => {
    while (pop.firstChild) pop.removeChild(pop.firstChild);
    options = [];
    const q = input.value.trim().toLowerCase();
    if (q === "") return close();
    for (const person of find(q)) {
      const b = el("button", "ltk-who-opt") as HTMLButtonElement;
      b.type = "button";
      b.setAttribute("role", "option");
      b.appendChild(el("span", "ltk-who-opt-name", person.who));
      const run = () => {
        onPick(person);
        close();
      };
      b.addEventListener("mousedown", (e) => e.preventDefault());
      b.addEventListener("click", run);
      options.push({ el: b, run });
      pop.appendChild(b);
    }
    if (options.length === 0) pop.appendChild(el("div", "ltk-who-pop-note", "No one matches."));
    active = 0;
    pop.style.display = "";
    input.setAttribute("aria-expanded", "true");
    paintActive();
  };
  input.addEventListener("input", render);
  input.addEventListener("focus", () => {
    if (input.value.trim() !== "" && options.length === 0) render();
  });
  input.addEventListener("blur", () => setTimeout(() => {
    if (document.activeElement !== input) close();
  }, 150));
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (options.length === 0) return;
      e.preventDefault();
      active = (active + (e.key === "ArrowDown" ? 1 : options.length - 1)) % options.length;
      paintActive();
    } else if (e.key === "Enter") {
      e.preventDefault();
      options[active]?.run();
    } else if (e.key === "Escape" && pop.style.display !== "none") {
      e.preventDefault();
      close();
    }
  });
  return { el: box, input };
}
